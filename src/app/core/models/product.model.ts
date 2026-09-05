export interface StockByLocation {
  locationId: string;
  locationName: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  /** Barcode. Unique among active products — null if the product doesn't have one assigned. */
  sku: string | null;
  /** Category display name — categoryId is what create/update actually send. */
  category: string;
  categoryId: string;
  /** Business/line-of-business display name (Librería, Tienda, Heladería...) — businessId is what create/update actually send. */
  business: string;
  businessId: string;
  /** Unit of measure display name (Unidad, Kilogramo, Litro...) — unitOfMeasureId is what create/update actually send. Never confused with a product's *presentations* (Caja, Paquete...), a separate catalog. */
  unitOfMeasure: string;
  unitOfMeasureAbbreviation: string;
  unitOfMeasureId: string;
  costPrice: number;
  publicPrice: number;
  wholesalePrice: number;
  /** Running total across every location — always present, unchanged meaning from before Inventario por ubicación. */
  stock: number;
  /** Per-location breakdown (Bodega/Vitrina/...) — present whenever the API resolved it alongside the product. */
  stockByLocation?: StockByLocation[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update — the backend assigns id/timestamps/category name. */
export interface ProductInput {
  name: string;
  /** Optional — omit or send null to leave/clear it. */
  sku?: string | null;
  categoryId: string;
  businessId: string;
  unitOfMeasureId: string;
  costPrice: number;
  publicPrice: number;
  wholesalePrice: number;
  /** Initial Bodega balance — create only. The backend rejects this field on update (stock is now managed via Compras/Ventas/Traslados), so never send it when editing. */
  stock?: number;
}

/** Looks up one location's quantity from a product's breakdown — 0 (not undefined) when the location has no row yet, since "no row" and "zero stock" mean the same thing to a caller. */
export function stockAt(product: Product, locationName: string): number {
  return product.stockByLocation?.find((s) => s.locationName === locationName)?.quantity ?? 0;
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

/** Below this (and above zero) a product is flagged as low stock. */
export const LOW_STOCK_THRESHOLD = 10;

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  'in-stock': 'Disponible',
  'low-stock': 'Stock bajo',
  'out-of-stock': 'Sin stock',
};

/** Single source of truth for stock classification — used by the table, the filters, and the summary cards. */
export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) {
    return 'out-of-stock';
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return 'low-stock';
  }
  return 'in-stock';
}

export { formatCurrency, formatQuantity, parseNumericValue } from '../utils/number-format.util';
