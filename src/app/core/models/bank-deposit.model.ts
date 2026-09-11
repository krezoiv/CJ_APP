/** Fixed denominations offered by the cash-breakdown table — matches the ticket's own list, quetzales only. */
export const BANK_DEPOSIT_CASH_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 1, 0.5, 0.25, 0.1, 0.05] as const;

export interface BankDepositCashDetail {
  id: string;
  denomination: number;
  quantity: number;
  subtotal: number;
}

export interface BankDepositTransaction {
  id: string;
  sequence: number;
  amount: number;
}

/** Full shape returned by `POST /bank-deposits` and `GET /bank-deposits/:id`. */
export interface BankDepositOperation {
  id: string;
  transactionBankId: string;
  transactionBankName: string;
  totalAmount: number;
  transactionCount: number;
  totalCash: number;
  totalDistributed: number;
  operationDate: string;
  /** Free text, typed by whoever registers the deposit — never looked up against the clients table. */
  clientName: string | null;
  /** A REGISTERED client (the same `clients` table Cuentas por Cobrar uses) — `null` unless one was linked. Independent of `clientName`; see "Enviar a cuentas por cobrar" on the Depósito form. */
  clientId: string | null;
  transactionTypeId: string;
  transactionTypeName: string;
  userId: string;
  username: string;
  cashDetails: BankDepositCashDetail[];
  transactions: BankDepositTransaction[];
  createdAt: string;
  updatedAt: string;
  /** `true` once anulada — the row is never deleted, only marked. See `voidedByUsername`/`voidReason` for who/why. */
  isVoided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  voidedByUsername: string | null;
  voidReason: string | null;
}

/** Lighter shape for listings (`GET /bank-deposits`/`GET /reports/bank-deposits`) — no cash-detail/transaction rows. Still carries the void fields — a voided operation stays visible in the list (with a badge), it just doesn't count toward the report's own totals (see `ReportsService.getBankDepositsReportSummary`). */
export interface BankDepositOperationSummary {
  id: string;
  transactionBankId: string;
  transactionBankName: string;
  totalAmount: number;
  transactionCount: number;
  operationDate: string;
  clientName: string | null;
  clientId: string | null;
  transactionTypeId: string;
  transactionTypeName: string;
  userId: string;
  username: string;
  createdAt: string;
  isVoided: boolean;
  voidedAt: string | null;
  voidedByUsername: string | null;
  voidReason: string | null;
}

export interface BankDepositCashDetailInput {
  denomination: number;
  quantity: number;
}

/** Payload for `POST /bank-deposits` — the backend recomputes/validates every total server-side regardless of what's sent. */
export interface RegisterBankDepositInput {
  transactionBankId: string;
  transactionTypeId: string;
  totalAmount: number;
  cashDetails: BankDepositCashDetailInput[];
  transactionAmounts: number[];
  clientName?: string | null;
  /** A REGISTERED client id — only ever sent for a "Depósito" (the form's own "Cliente registrado" picker doesn't render for any other tipo). The backend re-validates it exists+active regardless of what was already checked client-side. */
  clientId?: string | null;
  /** "Enviar a cuentas por cobrar" — requires `clientId`, only ever offered checked for a "Depósito", and only enabled for an admin account. The backend re-validates all three independently — see `RegisterBankDepositOperationUseCase`. */
  sendToAccountsReceivable?: boolean;
}

/** `GET /bank-deposits/monthly-count` — backs the Resumen dashboard's "Bancos" tile. `count` excludes anuladas and always covers the 1st of the current month through today; it resets on its own the moment the calendar rolls into a new month, there's nothing to reset client-side. */
export interface BankDepositMonthlyCount {
  count: number;
  month: string;
}

export interface BankDepositsReportFilters {
  startDate?: string;
  endDate?: string;
  transactionBankId?: string;
  transactionTypeId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface BankDepositsReportByBank {
  transactionBankId: string;
  transactionBankName: string;
  operationCount: number;
  totalAmount: number;
}

export interface BankDepositsReportSummary {
  operationCount: number;
  transactionCount: number;
  totalAmount: number;
  byBank: BankDepositsReportByBank[];
}
