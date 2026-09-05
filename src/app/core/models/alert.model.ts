export type AlertType =
  | 'PURCHASE_PAYMENT_DUE'
  | 'PURCHASE_PAYMENT_OVERDUE'
  | 'LOW_INVENTORY'
  | 'LOW_RECHARGE_BALANCE';

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM';

/**
 * Always live/current state, never a historical log — see the API's
 * CLAUDE.md "Alerts" section. An alert simply stops appearing in a future
 * `GET /alerts` response the instant its condition resolves; there is no
 * "dismiss"/"resolve" action anywhere, only `isRead` (opening it never makes
 * it disappear on its own).
 */
export interface Alert {
  key: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  amount: number | null;
  date: string | null;
  route: string;
  referenceId: string;
  isRead: boolean;
}

export interface AlertsResult {
  /** Unread count — what the Navbar bell badge shows. */
  count: number;
  total: number;
  items: Alert[];
}

/** `tone` feeds `<app-badge>`; `icon` an `<app-icon>` — one lookup per priority, reused anywhere an alert is rendered. */
export const ALERT_PRIORITY_TONE: Record<AlertPriority, 'danger' | 'gold' | 'neutral-dark'> = {
  CRITICAL: 'danger',
  HIGH: 'gold',
  MEDIUM: 'neutral-dark',
};

export const ALERT_PRIORITY_ICON: Record<AlertPriority, string> = {
  CRITICAL: 'alert-circle',
  HIGH: 'alert-triangle',
  MEDIUM: 'alert-triangle',
};

export const ALERT_TYPE_ICON: Record<AlertType, string> = {
  PURCHASE_PAYMENT_DUE: 'credit-card',
  PURCHASE_PAYMENT_OVERDUE: 'credit-card',
  LOW_INVENTORY: 'package',
  LOW_RECHARGE_BALANCE: 'smartphone',
};

/** The one global alert threshold — everything else (stock mínimo, saldo mínimo) lives on its own owning entity (product location, recharge type), not here. */
export interface AlertSettings {
  purchasePaymentAlertDays: number;
  updatedAt: string;
  updatedByUsername: string | null;
}

export interface UpdateAlertSettingsInput {
  purchasePaymentAlertDays: number;
}
