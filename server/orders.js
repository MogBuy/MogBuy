import { randomUUID } from 'node:crypto';
import { quote } from './fees.js';

export const CheckoutStatus = Object.freeze({ CREATED: 'created', TOPPING_UP: 'topping_up', TOP_UP_CONFIRMED: 'top_up_confirmed', PURCHASING: 'purchasing', COMPLETED: 'completed', FAILED: 'failed' });
const allowed = { created: ['topping_up', 'failed'], topping_up: ['top_up_confirmed', 'failed'], top_up_confirmed: ['purchasing', 'failed'], purchasing: ['completed', 'failed'], completed: [], failed: [] };

export class OrderService {
  constructor({ repository, catbuy, fees, clock = () => new Date().toISOString() }) { Object.assign(this, { repository, catbuy, fees, clock }); }
  transition(order, status, patch = {}) {
    if (!allowed[order.status].includes(status)) throw new Error(`Invalid checkout transition ${order.status} -> ${status}`);
    return this.repository.update(order.id, { ...patch, status, updatedAt: this.clock() });
  }
  async checkout({ userId, productId, idempotencyKey }) {
    if (!idempotencyKey || idempotencyKey.length > 200) throw new Error('A valid Idempotency-Key is required');
    const existing = this.repository.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) return existing;
    const product = await this.catbuy.product(userId, productId);
    const pricing = quote(product.pricing, this.fees);
    let order = this.repository.create({ id: randomUUID(), userId, idempotencyKey, productId: product.id, pricing, status: CheckoutStatus.CREATED, createdAt: this.clock(), updatedAt: this.clock() });
    try {
      order = this.transition(order, CheckoutStatus.TOPPING_UP);
      const topUp = await this.catbuy.topUpBalance({ userId, amountCents: pricing.sourceTotalCents, idempotencyKey: `topup:${order.id}` });
      if (!topUp.confirmed) throw new Error('CatBuy balance top-up was not confirmed');
      order = this.transition(order, CheckoutStatus.TOP_UP_CONFIRMED, { topUpReference: topUp.reference });
      order = this.transition(order, CheckoutStatus.PURCHASING);
      const purchase = await this.catbuy.purchase({ userId, productId: product.id, amountCents: pricing.sourceTotalCents, idempotencyKey: `purchase:${order.id}` });
      return this.transition(order, CheckoutStatus.COMPLETED, { providerOrderReference: purchase.reference });
    } catch (error) {
      if (order.status !== CheckoutStatus.FAILED && order.status !== CheckoutStatus.COMPLETED) order = this.transition(order, CheckoutStatus.FAILED, { failureReason: error.message });
      return order;
    }
  }
  getForUser(id, userId) { const order = this.repository.findById(id); return order?.userId === userId ? order : null; }
}
