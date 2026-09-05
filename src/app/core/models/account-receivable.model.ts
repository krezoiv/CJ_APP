import { KardexMovementType } from './kardex.model';

export interface AccountReceivable {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
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
export interface AccountReceivableInput {
  clientId: string;
  date: string;
  amount: number;
  description?: string;
}

export interface AccountReceivableFilters {
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

export interface PaginatedAccountsReceivable {
  items: AccountReceivable[];
  total: number;
  page: number;
  limit: number;
}

export { formatCurrency as formatAccountReceivableCurrency } from '../utils/number-format.util';
