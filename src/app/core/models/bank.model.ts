export interface Bank {
  id: string;
  name: string;
  accountNumber: string;
  accountTypeId: string;
  accountTypeName: string;
  /** Cached "current" figures, not a specific operation date's values — see the backend's `BankProps` doc comment. For a given date's actual previous/final balance, use `BankBalanceView` instead. */
  previousBalance: number;
  finalBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update — the backend assigns id/isActive/timestamps. */
export interface BankInput {
  name: string;
  accountNumber: string;
  accountTypeId: string;
  previousBalance?: number;
  finalBalance?: number;
}

export { formatCurrency as formatBankCurrency } from '../utils/number-format.util';
