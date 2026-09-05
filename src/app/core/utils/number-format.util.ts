const LOCALE = 'es-GT';

/**
 * The single source of truth for every monetary/quantity display in this
 * app — forms, tables, cards, modals, and reports all funnel through these
 * three functions rather than each re-deriving `toFixed`/comma-splitting
 * logic locally (several modules used to: `product.model.ts`,
 * `bank.model.ts`, `asset.model.ts`, `account-receivable.model.ts`, and
 * `ice-cream.model.ts` each had their own copy of the exact same
 * `` `Q${value.toFixed(2)}` `` — none of them added a thousands separator,
 * which is the actual bug this file exists to fix once, globally).
 */

/** `1234.5` → `"1,234.50"` — always exactly two decimals, comma thousands separator, no currency symbol. */
export function formatDecimal(value: number): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `1234.5` → `"Q 1,234.50"` — the one money format used everywhere: precios, costos, saldos, totales, resúmenes, PDFs. */
export function formatCurrency(value: number): string {
  return `Q ${formatDecimal(value)}`;
}

/** `1500` → `"1,500"` — thousands-separated, no decimals, for integer quantities (stock, unidades, registros) that should never show a fake ".00". */
export function formatQuantity(value: number): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

/**
 * The inverse of the two formatters above — turns whatever a user typed or
 * pasted (`"Q 1,250.50"`, `"1,250.50"`, `"1250.50"`) back into the plain
 * numeric value the backend actually expects (`1250.5`). Never sent to an
 * API as a formatted string; this is what a component calls right before
 * that call, on the raw input value, not something the backend ever sees
 * itself. Returns `null` for anything that isn't a real number once the
 * formatting characters are stripped (an empty field, "abc", "1.2.3").
 */
export function parseNumericValue(input: string): number | null {
  const cleaned = input.replace(/[Qq\s,]/g, '').trim();
  if (cleaned === '') {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
