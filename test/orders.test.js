import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderService, CheckoutStatus } from '../server/orders.js';
import { MemoryOrderRepository } from '../server/repository.js';
const product = { id: 'p1', pricing: { itemCents: 1000, shippingCents: 100 } };
const service = (catbuy) => new OrderService({ repository: new MemoryOrderRepository(), catbuy, fees: { serviceFeeBps: 500, serviceFeeFlatCents: 0 } });
test('checkout confirms top-up before purchase and completes', async () => {
  const events = []; const sut = service({ product: async () => product, topUpBalance: async () => { events.push('topup'); return { confirmed: true, reference: 'fund-1' }; }, purchase: async () => { events.push('purchase'); return { reference: 'order-1' }; } });
  const order = await sut.checkout({ userId: 'u1', productId: 'p1', idempotencyKey: 'key' });
  assert.equal(order.status, CheckoutStatus.COMPLETED); assert.deepEqual(events, ['topup', 'purchase']); assert.equal(order.pricing.totalChargedCents, 1155);
  assert.equal(sut.getForUser(order.id, 'u2'), null);
});
test('failed top-up prevents purchase and idempotency reuses record', async () => {
  let purchases = 0; const sut = service({ product: async () => product, topUpBalance: async () => ({ confirmed: false }), purchase: async () => { purchases++; } });
  const first = await sut.checkout({ userId: 'u1', productId: 'p1', idempotencyKey: 'key' }); const second = await sut.checkout({ userId: 'u1', productId: 'p1', idempotencyKey: 'key' });
  assert.equal(first.status, CheckoutStatus.FAILED); assert.equal(second.id, first.id); assert.equal(purchases, 0);
});
