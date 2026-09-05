/** Whether `finalBalance` adds to or subtracts from `totalBanks` — decided by the backend from the account type, never re-derived here from `accountTypeName`. */
export type BankBalanceCalculationType = 'sum' | 'subtract';

export interface BankBalanceSummaryItem {
  id: string;
  name: string;
  accountTypeId: string;
  accountTypeName: string;
  finalBalance: number;
  calculationType: BankBalanceCalculationType;
}

/**
 * Cuadre Agentes' first stage — `finalBalance` is the static
 * `banks.final_balance` column (the same one Sistema → Bancos manages),
 * not Agentes Bancarios → Bancos' live daily cuadre. See the backend
 * (`GetCuadreAgentesSummaryUseCase`) for the full reasoning.
 *
 * `totalBanks = totalPositiveAccounts - totalCreditLines` — Ahorro/Monetaria
 * add, Línea de Crédito subtracts. The frontend never reclassifies a bank
 * by its `accountTypeName`; it only displays the totals the backend already
 * computed.
 */
export interface CuadreAgentesSummary {
  banks: BankBalanceSummaryItem[];
  totalBanks: number;
  totalPositiveAccounts: number;
  totalCreditLines: number;
  totalAssets: number;
  totalAccountsReceivable: number;
}

/** Fixed bill/coin denominations for the cash count — in the order they should be displayed. */
export const CASH_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 1] as const;
export type CashDenomination = (typeof CASH_DENOMINATIONS)[number];

/**
 * Count of bills/coins per denomination — integer ≥ 0 for Q200–Q5; Q1 is
 * the one exception (second stage) and can carry up to 2 decimal places,
 * since it's usually counted in loose fractional coins. Never a monetary
 * value on its own — `calculateTotalCash` is what turns it into one.
 */
export type CashCount = Record<CashDenomination, number>;

/** Q1 is the only denomination that accepts decimals — see `CashCount`'s own comment. */
export function decimalPlacesFor(denomination: CashDenomination): number {
  return denomination === 1 ? 2 : 0;
}

export function createEmptyCashCount(): CashCount {
  return Object.fromEntries(CASH_DENOMINATIONS.map((denomination) => [denomination, 0])) as CashCount;
}

/** `denomination × count`, summed across every denomination — the "Total Efectivo". */
export function calculateTotalCash(counts: CashCount): number {
  return CASH_DENOMINATIONS.reduce((sum, denomination) => sum + denomination * (counts[denomination] || 0), 0);
}

/**
 * Second stage — the historical record `POST /agent-reconciliations`
 * returns. `totalBanks`/`totalAssets`/`totalAccountsReceivable`/`result`
 * are always whatever the backend recomputed and saved at that moment,
 * never what this frontend sent.
 */
export interface AgentReconciliation {
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

/** `totalCash` is the only thing this frontend actually decides on save — everything else is recomputed by the backend. `date` is the shared Agentes Bancarios operation date (`BankBalanceDraftStore.operationDate`) — the exact same date Bancos used to save balances, never independently guessed as "today" (the backend still defaults to its own today when omitted, but the Cuadre Agentes screen must never omit it, that was the bug). */
export interface RegisterAgentReconciliationInput {
  totalCash: number;
  date?: string;
}

/** Cuadre result = Cash + Banks + AccountsReceivable − Assets. Red if <0, green if =0, yellow if >0. */
export type CuadreResultStatus = 'negative' | 'zero' | 'positive';

export function getCuadreResultStatus(result: number): CuadreResultStatus {
  if (result < 0) {
    return 'negative';
  }
  if (result > 0) {
    return 'positive';
  }
  return 'zero';
}

/** `Cash + Banks + AccountsReceivable − Assets` — the same formula the backend recomputes and never trusts from the client on save. */
export function calculateCuadreResult(
  totalCash: number,
  totalBanks: number,
  totalAccountsReceivable: number,
  totalAssets: number,
): number {
  return totalCash + totalBanks + totalAccountsReceivable - totalAssets;
}

export interface MissingBankInfo {
  id: string;
  name: string;
}

/**
 * Answers "were this date's bank balances saved [in Agentes Bancarios →
 * Bancos]?" — never "does the bank have a current balance?". This is the
 * rule that blocks "Guardar Cuadre" until a daily cuadre is saved for
 * that same date; the backend (`CreateAgentReconciliationUseCase`)
 * enforces this again independently on save, so this frontend check is
 * UX only.
 */
export interface BankBalancesValidation {
  date: string;
  canReconcile: boolean;
  totalActiveBanks: number;
  banksWithBalance: number;
  missingBanks: MissingBankInfo[];
}

/**
 * The questions of the mandatory "Apertura → Saldos → Cuadre → Cierre"
 * sequence:
 * 1. Is it open? → `isOpened`.
 * 2. Were bank balances already saved? → `bankBalancesSaved`.
 * 3. Can Cuadre Agentes be entered? → `canAccessReconciliation`.
 * 4. Was the cuadre already done? → `reconciliationCompleted` (informational — see `status`).
 * 5. Was the day already closed? → `isClosed`.
 *
 * `canAccessReconciliation` is the only thing that gates the sidebar and
 * Cuadre Agentes' actual content; the backend (`CloseAgentDayUseCase`)
 * enforces `isOpened`/`bankBalancesSaved`/`!isClosed` again independently
 * on save, so this frontend check is UX only. `canAccessReconciliation`
 * is already `false` once `isClosed` is `true` — "Guardar Cuadre" closes
 * the day in the same operation, so there's no need to check `isClosed`
 * separately to block a second cuadre.
 */
export type DayWorkStatus =
  | 'NOT_OPENED'
  | 'OPENED'
  | 'BANK_BALANCES_SAVED'
  | 'RECONCILIATION_COMPLETED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED';

export interface DayStatus {
  date: string;
  status: DayWorkStatus;
  isOpened: boolean;
  bankBalancesSaved: boolean;
  canAccessReconciliation: boolean;
  reconciliationCompleted: boolean;
  isClosed: boolean;
  isCancelled: boolean;
}
