export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  costPrice: number;
  publicPrice: number;
  total: number;
  presentationName: string;
}

export type PurchasePaymentType = 'CONTADO' | 'CREDITO';
export type PurchasePaymentStatus = 'PENDING' | 'PAID';

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  username: string;
  purchaseDate: string;
  total: number;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
  paymentType: PurchasePaymentType;
  /** `yyyy-MM-dd` — always `null` for CONTADO. */
  paymentDueDate: string | null;
  paymentStatus: PurchasePaymentStatus;
  paidAt: string | null;
  paidByUsername: string | null;
  /** Free-text folio from the supplier's own invoice — never enforced as unique, purely a search aid. `null` for purchases registered before this field existed. */
  invoiceNumber: string | null;
  isVoided: boolean;
  voidedAt: string | null;
  voidedByUsername: string | null;
  voidReason: string | null;
}

/**
 * Row in the invoice being built — not yet persisted. Unlike Ventas, the
 * purchase draft lives entirely in the frontend until "Guardar compra": the
 * backend is only ever called once, atomically, to confirm the whole thing
 * (see `confirm_purchase` in the backend) — there's no per-action API call
 * and no server-side draft to restore, because increasing stock has no
 * "oversell" risk that would make a real-time reservation necessary the way
 * it was for Ventas.
 */
export interface PurchaseDraftItem {
  productId: string;
  sku: string | null;
  name: string;
  /** Omitted/undefined = the product's base "Unidad" — the conversion factor is always resolved server-side regardless of what's shown here. */
  presentationId?: string;
  presentationName?: string;
  quantity: number;
  costPrice: number;
  publicPrice: number;
}

export interface CreatePurchaseItemInput {
  productId: string;
  presentationId?: string;
  quantity: number;
  costPrice: number;
  publicPrice: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  items: CreatePurchaseItemInput[];
  paymentType: PurchasePaymentType;
  /** `yyyy-MM-dd` — required when `paymentType` is `'CREDITO'`, omitted for `'CONTADO'`. */
  paymentDueDate?: string;
  /** Free-text folio from the supplier's own invoice — optional. */
  invoiceNumber?: string;
}

export interface ImportPurchaseSkippedRow {
  row: number;
  identifier: string;
  reason: string;
}

/** `POST /purchases/import`'s response shape ("Cargar stock inicial") — mirrors `ImportPurchaseResultResponseDto` on the backend exactly. */
export interface ImportPurchaseResult {
  totalRows: number;
  productsAffected: number;
  purchasesCreated: number;
  transfersToVitrina: number;
  skipped: ImportPurchaseSkippedRow[];
  /** The row's purchase already succeeded — only its follow-up relocation to Vitrina failed. */
  transferWarnings: ImportPurchaseSkippedRow[];
}

export interface PurchasesDailyStat {
  /** `yyyy-MM-dd` */
  date: string;
  amount: number;
}

/** `GET /purchases/daily-stats` — backs "Compras del mes" en Gráficas → Indicadores de Compras. Monto total comprado (`SUM(total)`), no anuladas. Siempre el mes actual del servidor. */
export interface PurchasesDailyStats {
  /** `yyyy-MM` */
  month: string;
  days: PurchasesDailyStat[];
}

export interface PurchasesWeeklyStat {
  weekNumber: number;
  /** "Semana N" */
  label: string;
  /** `yyyy-MM-dd` */
  startDate: string;
  /** `yyyy-MM-dd` */
  endDate: string;
  amount: number;
}

/** `GET /purchases/weekly-stats` — backs "Compras por semana". Buckets fijos de 7 días desde el día 1 del mes, nunca semana ISO. */
export interface PurchasesWeeklyStats {
  /** `yyyy-MM` */
  month: string;
  weeks: PurchasesWeeklyStat[];
}

export interface PurchasesMonthlyStat {
  /** `yyyy-MM` */
  month: string;
  label: string;
  amount: number;
}

/** `GET /purchases/yearly-stats` — backs "Compras por mes" (anual). Enero hasta el mes actual, acumulativo — nunca se reinicia dentro del año. */
export interface PurchasesYearlyStats {
  year: number;
  months: PurchasesMonthlyStat[];
}

export type PurchaseStatusFilter = 'ACTIVE' | 'VOIDED';

/** Filters for "Administrar Facturas de Compras" — matches `GET /purchases`'s own query params exactly. */
export interface ListPurchasesFilters {
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  /** Matches against supplier name OR invoice number. */
  search?: string;
  status?: PurchaseStatusFilter;
  page?: number;
  limit?: number;
}

/**
 * Single source of truth for invoice math — the table row, the summary, and
 * the save confirmation dialog all call these instead of computing inline.
 * Uses cost price, never public price — a purchase's cost is what was paid
 * to the supplier, not what it will later sell for.
 */
export function calculatePurchaseItemTotal(item: PurchaseDraftItem): number {
  return item.quantity * item.costPrice;
}

export function calculatePurchaseSubtotal(items: PurchaseDraftItem[]): number {
  return items.reduce((sum, item) => sum + calculatePurchaseItemTotal(item), 0);
}

/** Currently identical to the subtotal — no discounts/taxes on a purchase invoice yet. */
export function calculatePurchaseTotal(items: PurchaseDraftItem[]): number {
  return calculatePurchaseSubtotal(items);
}
