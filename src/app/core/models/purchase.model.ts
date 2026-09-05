export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  costPrice: number;
  publicPrice: number;
  total: number;
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
