/** Replace this with a DB repository that enforces a unique (user_id, idempotency_key) index. */
export class MemoryOrderRepository {
  constructor() { this.orders = new Map(); this.keys = new Map(); }
  create(order) { const key = `${order.userId}:${order.idempotencyKey}`; if (this.keys.has(key)) return this.orders.get(this.keys.get(key)); this.orders.set(order.id, order); this.keys.set(key, order.id); return order; }
  update(id, patch) { const next = { ...this.orders.get(id), ...patch }; this.orders.set(id, next); return next; }
  findById(id) { return this.orders.get(id); }
  findByIdempotencyKey(userId, key) { return this.orders.get(this.keys.get(`${userId}:${key}`)); }
}
