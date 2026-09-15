/** All monetary amounts are integer cents. */
export function quote({ itemCents, shippingCents = 0, providerFeeCents = 0 }, feeConfig) {
  for (const amount of [itemCents, shippingCents, providerFeeCents]) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Amounts must be non-negative integer cents');
  }
  const sourceTotalCents = itemCents + shippingCents + providerFeeCents;
  const serviceFeeCents = Math.round(sourceTotalCents * feeConfig.serviceFeeBps / 10_000) + feeConfig.serviceFeeFlatCents;
  return Object.freeze({ itemCents, shippingCents, providerFeeCents, sourceTotalCents, serviceFeeCents, totalChargedCents: sourceTotalCents + serviceFeeCents });
}
