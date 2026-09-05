export interface IceCreamPurchaseItem {
  id: string;
  iceCreamId: string;
  product: string;
  sku: string;
  quantity: number;
  costPrice: number;
  total: number;
}

export interface IceCreamPurchase {
  id: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  username: string;
  purchaseDate: string;
  total: number;
  items: IceCreamPurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Row in the invoice being built — not yet persisted. Same as Compras'
 * `PurchaseDraftItem`: lives entirely in the frontend until "Guardar
 * compra", one atomic backend call confirms the whole thing.
 */
export interface IceCreamPurchaseDraftItem {
  iceCreamId: string;
  sku: string;
  product: string;
  quantity: number;
  costPrice: number;
}

export interface CreateIceCreamPurchaseItemInput {
  iceCreamId: string;
  quantity: number;
  costPrice: number;
}

export interface CreateIceCreamPurchaseInput {
  supplierId: string;
  purchaseDate: string;
  items: CreateIceCreamPurchaseItemInput[];
}

export function calculateIceCreamPurchaseItemTotal(item: IceCreamPurchaseDraftItem): number {
  return item.quantity * item.costPrice;
}

export function calculateIceCreamPurchaseTotal(items: IceCreamPurchaseDraftItem[]): number {
  return items.reduce((sum, item) => sum + calculateIceCreamPurchaseItemTotal(item), 0);
}
