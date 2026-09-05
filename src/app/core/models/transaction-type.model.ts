/**
 * Curated subset of the shared icon registry — mirrors the backend's own
 * `TRANSACTION_TYPE_ICONS` whitelist exactly (`transaction-types` module,
 * `domain/entities/transaction-type.entity.ts`). Kept in sync by hand: this
 * is the one icon picker in the app, not worth a shared package for.
 */
export const TRANSACTION_TYPE_ICONS = [
  'bank',
  'arrow-down-circle',
  'arrow-up-circle',
  'arrow-left-right',
  'credit-card',
  'wallet',
  'receipt',
  'file-check',
  'briefcase',
  'trending-up',
  'package',
  'check-circle',
  'refresh-cw',
  'shopping-bag',
] as const;

export type TransactionTypeIcon = (typeof TRANSACTION_TYPE_ICONS)[number];

/** "Tipo de Transacción" — Depósito, Retiro, Desembolso Préstamo, Pago Cheque, etc. Selected on Transaccionar's own dashboard before a deposit registration begins. */
export interface TransactionType {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update — the backend assigns id/isActive/timestamps. */
export interface TransactionTypeInput {
  name: string;
  icon: string;
}
