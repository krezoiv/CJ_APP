export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
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
}
