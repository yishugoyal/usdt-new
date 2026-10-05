import Decimal from 'decimal.js';

// Configure Decimal.js precision for financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function toDecimal(val: string | number | Decimal): Decimal {
  return new Decimal(val);
}

export function formatInr(val: string | number | Decimal): string {
  const d = new Decimal(val);
  return '₹' + d.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatUsdt(val: string | number | Decimal): string {
  const d = new Decimal(val);
  return d.toFixed(2) + ' USDT';
}
