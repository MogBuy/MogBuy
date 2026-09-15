import test from 'node:test';
import assert from 'node:assert/strict';
import { quote } from '../server/fees.js';

test('quote calculates source and service fees in integer cents', () => {
  assert.deepEqual(quote({ itemCents: 10_000, shippingCents: 500, providerFeeCents: 25 }, { serviceFeeBps: 500, serviceFeeFlatCents: 30 }), { itemCents: 10_000, shippingCents: 500, providerFeeCents: 25, sourceTotalCents: 10_525, serviceFeeCents: 556, totalChargedCents: 11_081 });
});
test('quote rejects fractional amounts', () => assert.throws(() => quote({ itemCents: 1.5 }, { serviceFeeBps: 0, serviceFeeFlatCents: 0 })));
