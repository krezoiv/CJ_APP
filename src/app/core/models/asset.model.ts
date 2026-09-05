import { KardexMovementType } from './kardex.model';

export interface Asset {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  /** Always a positive magnitude now — the sign lives in `movementType` (see the backend's Kardex migration). A correcting/reversing entry is now a "Registrar Abono" movement in the Estado de Cuenta view, not a negative value through this field. */
  amount: number;
  movementType: KardexMovementType;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUsername: string;
  updatedByUsername: string | null;
}

/** Payload for create/update — the backend assigns id/isActive/timestamps/clientName. */
export interface AssetInput {
  clientId: string;
  date: string;
  amount: number;
  description?: string;
}

export interface AssetFilters {
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  /** Omit for both states ("Todos"); true/false filters to exactly one. */
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedAssets {
  items: Asset[];
  total: number;
  page: number;
  limit: number;
}

export { formatCurrency as formatAssetCurrency } from '../utils/number-format.util';
