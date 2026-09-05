export interface IceCreamSaleItem {
  id: string;
  iceCreamId: string;
  product: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IceCreamSale {
  id: string;
  userId: string;
  username: string;
  saleDate: string;
  total: number;
  items: IceCreamSaleItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Row in the receipt being built — not yet persisted. Same client-only
 * draft pattern as Compras' `PurchaseDraftItem`: builds entirely in the
 * frontend, one atomic backend call (`confirm_ice_cream_sale`) confirms the
 * whole thing and validates stock server-side.
 */
export interface IceCreamSaleDraftItem {
  iceCreamId: string;
  sku: string;
  product: string;
  quantity: number;
  unitPrice: number;
  /** Stock available at the moment this item was added — a client-side hint only; the backend is the real source of truth and re-checks under a row lock at save time. */
  availableStock: number;
}

export interface CreateIceCreamSaleItemInput {
  iceCreamId: string;
  quantity: number;
}

export interface CreateIceCreamSaleInput {
  items: CreateIceCreamSaleItemInput[];
}

export function calculateIceCreamSaleItemTotal(item: IceCreamSaleDraftItem): number {
  return item.quantity * item.unitPrice;
}

export function calculateIceCreamSaleTotal(items: IceCreamSaleDraftItem[]): number {
  return items.reduce((sum, item) => sum + calculateIceCreamSaleItemTotal(item), 0);
}
