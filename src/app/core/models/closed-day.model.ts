import { DayWorkStatus } from './cuadre-agentes.model';

/** Only the three terminal/managed states — a day still in progress (NOT_OPENED/OPENED/BANK_BALANCES_SAVED) isn't this module's concern. */
export type ClosedDayStatus = Extract<DayWorkStatus, 'CLOSED' | 'REOPENED' | 'CANCELLED'>;
export type ResultSign = 'positive' | 'negative' | 'zero';

export interface ClosedDaysFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: ClosedDayStatus;
  userId?: string;
  resultSign?: ResultSign;
}

/** A row of "Sistema → Gestión de Días Cerrados". */
export interface ClosedDayRow {
  date: string;
  status: ClosedDayStatus;
  openedAt: string;
  openedByUsername: string;
  closedAt: string | null;
  closedByUsername: string | null;
  reopenedAt: string | null;
  reopenedByUsername: string | null;
  reopenReason: string | null;
  cancelledAt: string | null;
  cancelledByUsername: string | null;
  cancelReason: string | null;
  totalBanks: number | null;
  totalCash: number | null;
  totalAccountsReceivable: number | null;
  totalAssets: number | null;
  result: number | null;
}

export type DayAuditAction = 'OPENED' | 'CLOSED' | 'REOPENED' | 'CANCELLED';

export interface DayAuditLogEntry {
  id: string;
  action: DayAuditAction;
  performedByUsername: string;
  performedAt: string;
  reason: string | null;
  previousStatus: string | null;
  newStatus: string | null;
}

export interface ClosedDayBankRow {
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountTypeName: string;
  previousBalance: number;
  finalBalance: number | null;
}

export interface ClosedDayReconciliation {
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

/**
 * "Ver Detalle" — never includes a cash-denomination breakdown: this app
 * never had a per-denomination count table, `reconciliation.totalCash`
 * is the only cash figure the backend knows for an already-closed day
 * (see the backend's own `DayDetailOutput`).
 */
export interface ClosedDayDetail {
  date: string;
  status: ClosedDayStatus;
  openedAt: string;
  openedByUsername: string;
  closedAt: string | null;
  closedByUsername: string | null;
  reopenedAt: string | null;
  reopenedByUsername: string | null;
  reopenReason: string | null;
  isCancelled: boolean;
  cancelledAt: string | null;
  cancelledByUsername: string | null;
  cancelReason: string | null;
  banks: ClosedDayBankRow[];
  reconciliation: ClosedDayReconciliation | null;
  auditLog: DayAuditLogEntry[];
}

export const CLOSED_DAY_STATUS_LABEL: Record<ClosedDayStatus, string> = {
  CLOSED: 'Cerrado',
  REOPENED: 'Reabierto',
  CANCELLED: 'Anulado',
};

export const DAY_AUDIT_ACTION_LABEL: Record<DayAuditAction, string> = {
  OPENED: 'Apertura del día',
  CLOSED: 'Cierre del día',
  REOPENED: 'Reapertura',
  CANCELLED: 'Anulación',
};
