export type QuotationStatus = 'PENDIENTE' | 'ACEPTADA' | 'ANULADA' | 'VENCIDA';

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  presentationName: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  total: number;
}

/**
 * A Cotización is explicitly NOT a sale — it never affects inventory,
 * reports, or the dashboard. See the backend's own `create_quotation`
 * function for the structural guarantee. Every line's price/discount is
 * historicized at creation time — a later change to the product's real price
 * never rewrites an existing quotation, verified end-to-end on the backend.
 * `convertedToSaleId` is a forward-compat hook for a future, explicit
 * "Convertir en Venta" action — always `null` today, nothing in this app
 * ever sets it.
 */
export interface Quotation {
  id: string;
  quotationNumber: string;
  clientId: string;
  clientName: string;
  userId: string;
  username: string;
  quotationDate: string;
  /** `yyyy-MM-dd` — a calendar date, not a timestamp. */
  expirationDate: string;
  subtotal: number;
  discount: number;
  total: number;
  observations: string | null;
  commercialTerms: string | null;
  status: QuotationStatus;
  voidedAt: string | null;
  voidedBy: string | null;
  voidedByUsername: string | null;
  voidReason: string | null;
  convertedToSaleId: string | null;
  items: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}

/** `GET /quotations` list rows — no line items, mirrors `TicketSummary`'s own shape. */
export interface QuotationSummary {
  id: string;
  quotationNumber: string;
  clientId: string;
  clientName: string;
  userId: string;
  username: string;
  expirationDate: string;
  total: number;
  status: QuotationStatus;
  createdAt: string;
}

export interface CreateQuotationItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface CreateQuotationInput {
  clientId: string;
  expirationDate: string;
  observations?: string;
  commercialTerms?: string;
  items: CreateQuotationItemInput[];
}

export interface ListQuotationsQuery {
  status?: QuotationStatus;
  page?: number;
  limit?: number;
}

/**
 * A cart line while a quotation is still being built on-screen — never sent
 * to the backend as-is, only `{productId, quantity, discount}` is. Unlike
 * `TicketDraftItem`, this carries a per-line `discount` the user can edit
 * before saving.
 */
export interface QuotationDraftItem {
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
}

/** Mirrors `create_quotation()`'s own math exactly, so the live cart preview always matches what gets saved. */
export function calculateQuotationDraftItemSubtotal(item: QuotationDraftItem): number {
  return item.unitPrice * item.quantity;
}

export function calculateQuotationDraftItemTotal(item: QuotationDraftItem): number {
  return calculateQuotationDraftItemSubtotal(item) - item.discount;
}

export function calculateQuotationDraftSubtotal(items: QuotationDraftItem[]): number {
  return items.reduce((sum, item) => sum + calculateQuotationDraftItemSubtotal(item), 0);
}

export function calculateQuotationDraftDiscount(items: QuotationDraftItem[]): number {
  return items.reduce((sum, item) => sum + item.discount, 0);
}

export function calculateQuotationDraftTotal(items: QuotationDraftItem[]): number {
  return calculateQuotationDraftSubtotal(items) - calculateQuotationDraftDiscount(items);
}

export const QUOTATION_STATUS_TONE: Record<QuotationStatus, 'gold' | 'success' | 'danger' | 'neutral-dark'> = {
  PENDIENTE: 'gold',
  ACEPTADA: 'success',
  VENCIDA: 'danger',
  ANULADA: 'neutral-dark',
};

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  VENCIDA: 'Vencida',
  ANULADA: 'Anulada',
};
