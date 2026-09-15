export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  presentationName: string;
}

/** 'PUBLIC' (default) or 'WHOLESALE' — chosen once at the start of a sale, locked once the receipt has any line item. */
export type PriceListType = 'PUBLIC' | 'WHOLESALE';

/**
 * `status` distinguishes an in-progress receipt from a completed one — the
 * Ventas screen only ever deals with `OPEN` sales (its own current draft,
 * fetched/mutated via `GET/POST /sales/current`, `/sales/items`); a
 * `CONFIRMED` sale is a real, completed transaction and never mutates again.
 */
export interface Sale {
  id: string;
  userId: string;
  username: string;
  saleDate: string;
  total: number;
  status: 'OPEN' | 'CONFIRMED';
  clientId: string | null;
  clientName: string | null;
  priceList: PriceListType;
  /** Which open tab this receipt belongs to — `null` for a `CONFIRMED` sale, only meaningful while `status` is `'OPEN'`. */
  draftKey: string | null;
  items: SaleItem[];
  createdAt: string;
  updatedAt: string;
  /** Free-text folio — never enforced as unique, purely a search aid. `null` for sales registered before this field existed. */
  invoiceNumber: string | null;
  isVoided: boolean;
  voidedAt: string | null;
  voidedByUsername: string | null;
  voidReason: string | null;
}

/**
 * Payload for the bulk, one-shot `POST /sales` (unchanged, pre-existing
 * endpoint) — builds and confirms a complete sale in a single call. The
 * Ventas screen itself no longer uses this: it reserves stock in real time
 * as items are added (`SalesService.adjustSaleItem`) and only calls
 * `confirmSale()` (no body — the draft's items are already on the server)
 * to finish. This type is kept for any other caller of the bulk endpoint.
 */
export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
}

export interface CreateSaleInput {
  items: CreateSaleItemInput[];
  clientId?: string;
  priceList?: PriceListType;
  invoiceNumber?: string;
}

export interface SalesDailyStat {
  /** `yyyy-MM-dd` */
  date: string;
  amount: number;
}

/** `GET /sales/daily-stats` — backs "Ventas del mes" en Gráficas → Indicadores de Ventas. Monto total vendido (`SUM(total)`), solo ventas CONFIRMED no anuladas. Siempre el mes actual del servidor. */
export interface SalesDailyStats {
  /** `yyyy-MM` */
  month: string;
  days: SalesDailyStat[];
}

export interface SalesWeeklyStat {
  weekNumber: number;
  /** "Semana N" */
  label: string;
  /** `yyyy-MM-dd` */
  startDate: string;
  /** `yyyy-MM-dd` */
  endDate: string;
  amount: number;
}

/** `GET /sales/weekly-stats` — backs "Ventas por semana". Buckets fijos de 7 días desde el día 1 del mes, nunca semana ISO. */
export interface SalesWeeklyStats {
  /** `yyyy-MM` */
  month: string;
  weeks: SalesWeeklyStat[];
}

export interface SalesMonthlyStat {
  /** `yyyy-MM` */
  month: string;
  label: string;
  amount: number;
}

/** `GET /sales/yearly-stats` — backs "Ventas por mes" (anual). Enero hasta el mes actual, acumulativo — nunca se reinicia dentro del año. */
export interface SalesYearlyStats {
  year: number;
  months: SalesMonthlyStat[];
}

export type SaleStatusFilter = 'ACTIVE' | 'VOIDED';

/** Filters for "Administrar Facturas de Ventas" — matches `GET /sales`'s own query params exactly. */
export interface ListSalesFilters {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  /** Matches against client name OR invoice number. */
  search?: string;
  status?: SaleStatusFilter;
  page?: number;
  limit?: number;
}
