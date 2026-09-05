export interface PaginatedReport<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type ReportSortField = 'date' | 'total';
export type ReportSortDirection = 'asc' | 'desc';

/**
 * No `customerId`/client filter — this system has no customers/clients
 * module yet (verified against the backend's real domain model before
 * building this). If one is added later, it slots in here the same way
 * `categoryId`/`productId` already do.
 */
export interface SalesReportFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  businessId?: string;
  productId?: string;
  userId?: string;
  sortBy?: ReportSortField;
  sortDirection?: ReportSortDirection;
  page?: number;
  limit?: number;
}

export interface PurchasesReportFilters {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  categoryId?: string;
  businessId?: string;
  productId?: string;
  userId?: string;
  sortBy?: ReportSortField;
  sortDirection?: ReportSortDirection;
  page?: number;
  limit?: number;
}

export interface SalesReportRow {
  id: string;
  saleNumber: string;
  saleDate: string;
  userId: string;
  username: string;
  itemCount: number;
  total: number;
}

export interface SalesReportSummary {
  totalAmount: number;
  salesCount: number;
  unitsSold: number;
  averageTicket: number;
}

export interface SalesByProductRow {
  productId: string;
  productName: string;
  sku: string | null;
  quantitySold: number;
  totalRevenue: number;
}

export interface SaleReportDetailItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleReportDetail {
  id: string;
  saleNumber: string;
  saleDate: string;
  userId: string;
  username: string;
  total: number;
  items: SaleReportDetailItem[];
}

export interface PurchasesReportRow {
  id: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  username: string;
  itemCount: number;
  total: number;
}

export interface PurchasesReportSummary {
  totalAmount: number;
  purchasesCount: number;
  unitsPurchased: number;
  averagePurchase: number;
}

export interface PurchasesByProductRow {
  productId: string;
  productName: string;
  sku: string | null;
  quantityPurchased: number;
  totalCost: number;
}

export interface PurchaseReportDetailItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  costPrice: number;
  publicPrice: number;
  total: number;
}

export interface PurchaseReportDetail {
  id: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  username: string;
  total: number;
  items: PurchaseReportDetailItem[];
}

/**
 * No `sortBy`/`sortDirection` — unlike Sales/Purchases, the recharges report
 * has no line-item join to reorder; `GET /reports/recharges` reuses the
 * recharges module's own `GetRechargeHistoryUseCase`, which always orders
 * by date desc then type name asc (see the API's CLAUDE.md).
 */
export interface RechargesReportFilters {
  startDate?: string;
  endDate?: string;
  rechargeTypeId?: string;
  page?: number;
  limit?: number;
}

export interface RechargesReportSummary {
  recordCount: number;
  closedCount: number;
  totalPurchases: number;
  totalSales: number;
  averageSale: number;
}

/** No `rechargeTypeId`-style filter — `agent_reconciliations` has no product/category/business dimension, same reasoning as the Recargas report's own minimal filter set. */
export interface AgentReconciliationsReportFilters {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AgentReconciliationsReportRow {
  id: string;
  date: string;
  totalCash: number;
  totalBanks: number;
  totalAssets: number;
  totalAccountsReceivable: number;
  result: number;
  createdAt: string;
  createdByUsername: string;
}

export interface AgentReconciliationsReportSummary {
  recordCount: number;
  totalCash: number;
  totalBanks: number;
  totalAssets: number;
  totalAccountsReceivable: number;
  totalResult: number;
  averageResult: number;
}

export type ReportStatusFilter = 'all' | 'active' | 'inactive';

/**
 * Unified Reportería de Activos y Cuentas por Cobrar — replaces the former
 * separate `AccountsReceivableReportFilters`/`AssetsReportFilters` (and
 * their own summary types), consolidated per the checkbox-driven `types`
 * selection the backend's `AssetsReceivablesReportController` now expects.
 */
export type AssetsReceivablesReportType = 'assets' | 'accounts_receivable';

export interface AssetsReceivablesReportFilters {
  types: AssetsReceivablesReportType[];
  clientId?: string;
  startDate?: string;
  endDate?: string;
  status?: ReportStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AssetsReceivablesReportRow {
  id: string;
  type: AssetsReceivablesReportType;
  clientId: string;
  clientName: string;
  date: string;
  amount: number;
  description: string | null;
  isActive: boolean;
}

export interface AssetsReceivablesReportSummary {
  totalAssets: number;
  totalAccountsReceivable: number;
  totalGeneral: number;
  recordCount: number;
}

/**
 * Unified Reportería de Heladería — replaces the former separate
 * `IceCreamSalesReportFilters`/`IceCreamPurchasesReportFilters` (and their
 * own row/summary types), consolidated per the checkbox-driven `types`
 * selection the backend's `IceCreamReportController` now expects.
 */
export type IceCreamReportType = 'sales' | 'purchases';

export interface IceCreamReportFilters {
  types: IceCreamReportType[];
  startDate?: string;
  endDate?: string;
  iceCreamId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

/** One row per line item across every venta/compra in range — not one row per sale/purchase. */
export interface IceCreamReportRow {
  id: string;
  type: IceCreamReportType;
  date: string;
  product: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  userId: string;
  username: string;
}

export interface IceCreamReportSummary {
  totalSales: number;
  totalPurchases: number;
  difference: number;
  recordCount: number;
}
