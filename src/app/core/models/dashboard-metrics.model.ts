/**
 * `GET /dashboard/summary` — admin-only on the backend (`@Roles`), backs the
 * Resumen dashboard's Ventas de Recargas / Ventas / Compras / Transacciones
 * Bancarias sections. Always scoped to "the 1st of whatever the current
 * month is, through today" — computed fresh on the server on every call,
 * never a stored/reset counter. See the backend `CLAUDE.md`'s "Dashboard"
 * section for the full query design.
 */
export interface DashboardPeriod {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
}

export interface DashboardDay {
  date: string;
  amount: number;
}

/** `highestDay`/`lowestDay` are `null` when the month has no data yet for that series — render "N/A", never a fabricated date. */
export interface DashboardDailySeries {
  highestDay: DashboardDay | null;
  lowestDay: DashboardDay | null;
  total: number;
}

export interface DashboardBank {
  bankId: string;
  bankName: string;
  transactions: number;
}

export interface DashboardBankTransactions {
  totalTransactions: number;
  highestBank: DashboardBank | null;
  lowestBank: DashboardBank | null;
}

export interface DashboardMetrics {
  period: DashboardPeriod;
  rechargeSales: DashboardDailySeries;
  sales: DashboardDailySeries;
  purchases: { total: number };
  bankTransactions: DashboardBankTransactions;
}
