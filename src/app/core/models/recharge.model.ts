export interface RechargeType {
  id: string;
  name: string;
  isActive: boolean;
  /** `0` means "no threshold configured" — the Alerts module never alerts for this type until an admin sets a real minimum. */
  minBalance: number;
}

/**
 * One recharge type's row for a given day. `totalPurchases`/`sale` are
 * computed by the backend (`dailyBalance - previousBalance` and
 * `dailyBalance - finalBalance`), never stored — mirrors the backend's own
 * "derive, don't duplicate" choice, see the API's CLAUDE.md.
 */
export interface RechargeDailyBalance {
  id: string;
  rechargeTypeId: string;
  rechargeTypeName: string;
  date: string;
  previousBalance: number;
  /** "Acreditado" — derived (`dailyBalance - previousBalance`), unchanged since before the Monto de Compra/Acreditado split. */
  totalPurchases: number;
  /** "Compra" — real sum of every registered purchase's monto de compra this cycle, purely informational (never affects `dailyBalance`). */
  totalPurchaseAmount: number;
  dailyBalance: number;
  finalBalance: number | null;
  /** `null` until the day is closed (no `finalBalance` registered yet). */
  sale: number | null;
  createdByUsername: string;
  updatedByUsername: string | null;
}

export interface RegisterRechargePurchaseInput {
  rechargeTypeId: string;
  /** "Monto de Compra" — informational only, never affects the balance. */
  purchaseAmount: number;
  /** "Monto Acreditado" — the only value that increments the running balance. */
  creditedAmount: number;
  /** `yyyy-MM-dd` — the operation-date picker's current value, not necessarily today. */
  operationDate: string;
}

export interface RegisterRechargeFinalBalanceInput {
  finalBalance: number;
}

/**
 * Always live-computed by the backend from today's real `RechargeDailyBalance`
 * rows, never from client input — `totalCollected`/`difference` are `null`
 * until a cuadre has been saved for today (`savedClosure`).
 */
export interface RechargeSalesSummary {
  date: string;
  totalClaro: number;
  totalTigo: number;
  totalSales: number;
  totalCollected: number | null;
  difference: number | null;
  savedClosure: boolean;
}

export interface RegisterRechargeSalesClosureInput {
  totalCollected: number;
  /** `yyyy-MM-dd` — the operation-date picker's current value, not necessarily today. */
  operationDate: string;
}

/**
 * One individually-sold recharge (a customer's top-up) — the "ventas
 * diarias" record. `locked` mirrors the backend: once the referenced
 * operator/cycle's saldo final has been registered, this sale can no longer
 * be edited or deleted, only viewed.
 */
export interface RechargeSale {
  id: string;
  rechargeTypeId: string;
  rechargeTypeName: string;
  phoneNumber: string;
  amount: number;
  date: string;
  locked: boolean;
  createdByUsername: string;
  updatedByUsername: string | null;
}

export interface RegisterRechargeSaleInput {
  rechargeTypeId: string;
  phoneNumber: string;
  amount: number;
  /** `yyyy-MM-dd` — the operation-date picker's current value, not necessarily today. */
  operationDate: string;
}

export interface UpdateRechargeSaleInput {
  phoneNumber: string;
  amount: number;
}

export type SalesClosureStatus = 'zero' | 'positive' | 'negative';

/** Zero = correct cuadre, positive = still owed/uncollected (pending difference), negative = over-collected. */
export function getSalesClosureStatus(difference: number): SalesClosureStatus {
  if (difference > 0) {
    return 'positive';
  }
  if (difference < 0) {
    return 'negative';
  }
  return 'zero';
}
