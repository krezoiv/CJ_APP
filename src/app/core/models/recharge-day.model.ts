/**
 * "Apertura del Día"/"Cerrar Día" for Recargas Electrónicas — fully
 * independent from Bancos/Cuadre Agentes' own `DayWorkStatus`/`DayStatus`
 * (see `cuadre-agentes.model.ts`): separate table, separate lifecycle on
 * the backend, so a separate type here too, never a shared one. Simpler
 * than Bancos' 7-state union — there is no nested "balances saved"/
 * "reconciliation completed" concept here, only "has at least one cuadre
 * been saved today" (`hasSavedCuadreToday`), since "Cerrar Día" is a
 * standalone action that never saves a cuadre itself.
 */
export type RechargeDayWorkStatus = 'NOT_OPENED' | 'OPENED' | 'REOPENED' | 'CLOSED' | 'CANCELLED';

export interface RechargeDayStatus {
  date: string;
  status: RechargeDayWorkStatus;
  isOpened: boolean;
  isClosed: boolean;
  isCancelled: boolean;
  hasSavedCuadreToday: boolean;
  /** The "Cerrar Día" button's own gate: open, not closed/cancelled, and at least one cuadre already saved for the date. */
  canCloseDay: boolean;
}

/** Only the three terminal/managed states — a day still in progress isn't "Gestión de Días de Recargas"' concern, mirrors `ClosedDayStatus`. */
export type RechargeClosedDayStatus = Extract<RechargeDayWorkStatus, 'CLOSED' | 'REOPENED' | 'CANCELLED'>;
export type RechargeResultSign = 'positive' | 'negative' | 'zero';

export interface RechargeClosedDaysFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: RechargeClosedDayStatus;
  userId?: string;
  resultSign?: RechargeResultSign;
}

/**
 * A row of "Sistema → Gestión de Días de Recargas" — totals come from that
 * date's LATEST saved cuadre (there can be several per date, since
 * Recargas' own cuadre-cycles feature allows more than one cuadre to be
 * saved on the same calendar date); `cycleCount` is how many were saved in
 * total, a Recargas-specific signal Bancos' equivalent row has no need for.
 */
export interface RechargeClosedDayRow {
  date: string;
  status: RechargeClosedDayStatus;
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
  totalSales: number | null;
  totalCollected: number | null;
  result: number | null;
  cycleCount: number;
}

export type RechargeDayAuditAction = 'OPENED' | 'CLOSED' | 'REOPENED' | 'CANCELLED';

export interface RechargeDayAuditLogEntry {
  id: string;
  action: RechargeDayAuditAction;
  performedByUsername: string;
  performedAt: string;
  reason: string | null;
  previousStatus: string | null;
  newStatus: string | null;
}

/** One saved cuadre cycle for the date — the detail view shows EVERY cycle, not just the latest, unlike Bancos' single reconciliation block. */
export interface RechargeDayClosureSummary {
  id: string;
  sequence: number;
  totalSales: number;
  totalCollected: number;
  result: number;
  createdByUsername: string;
  createdAt: string;
}

export interface RechargeDayDetail {
  date: string;
  status: RechargeClosedDayStatus;
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
  closures: RechargeDayClosureSummary[];
  auditLog: RechargeDayAuditLogEntry[];
}

export const RECHARGE_CLOSED_DAY_STATUS_LABEL: Record<RechargeClosedDayStatus, string> = {
  CLOSED: 'Cerrado',
  REOPENED: 'Reabierto',
  CANCELLED: 'Anulado',
};

export const RECHARGE_DAY_AUDIT_ACTION_LABEL: Record<RechargeDayAuditAction, string> = {
  OPENED: 'Apertura del día',
  CLOSED: 'Cierre del día',
  REOPENED: 'Reapertura',
  CANCELLED: 'Anulación',
};
