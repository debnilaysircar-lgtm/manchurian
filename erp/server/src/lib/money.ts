/** Amounts are stored as integer cents; quantities as REAL rounded to 3 decimals. */
export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => Math.round(cents) / 100;
export const roundQty = (q: number) => Math.round(q * 1000) / 1000;
export const today = () => new Date().toISOString().slice(0, 10);
