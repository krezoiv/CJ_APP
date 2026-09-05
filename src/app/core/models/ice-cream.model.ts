export interface IceCream {
  id: string;
  sku: string;
  product: string;
  costPrice: number;
  publicPrice: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByUsername: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
}

/** Payload for create/update — the backend assigns id/stock(on create)/timestamps/audit fields. */
export interface IceCreamInput {
  sku: string;
  product: string;
  costPrice: number;
  publicPrice: number;
}

export type IceCreamStockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

/** Below this (and above zero) a helado is flagged as low stock — same threshold as Inventario's own rule. */
export const ICE_CREAM_LOW_STOCK_THRESHOLD = 10;

export const ICE_CREAM_STOCK_STATUS_LABEL: Record<IceCreamStockStatus, string> = {
  'in-stock': 'Disponible',
  'low-stock': 'Stock bajo',
  'out-of-stock': 'Sin stock',
};

export function getIceCreamStockStatus(stock: number): IceCreamStockStatus {
  if (stock <= 0) {
    return 'out-of-stock';
  }
  if (stock <= ICE_CREAM_LOW_STOCK_THRESHOLD) {
    return 'low-stock';
  }
  return 'in-stock';
}

export { formatCurrency as formatIceCreamCurrency } from '../utils/number-format.util';
