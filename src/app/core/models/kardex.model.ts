import { Observable } from 'rxjs';

export type KardexMovementType = 'CARGO' | 'ABONO';

export interface KardexMovement {
  id: string;
  date: string;
  movementType: KardexMovementType;
  description: string | null;
  amount: number;
  balanceAfter: number;
  createdByUsername: string;
  createdAt: string;
}

export interface KardexStatement {
  clientId: string;
  clientName: string;
  openingBalance: number;
  movements: KardexMovement[];
  totalCargos: number;
  totalAbonos: number;
  closingBalance: number;
}

export interface RegisterKardexMovementInput {
  date: string;
  amount: number;
  description?: string;
}

export interface KardexStatementFilters {
  dateFrom?: string;
  dateTo?: string;
}

/** Backs the plain list screen's "Saldo total" tile — always scoped to active accounts only, independent of the list's own current filters. */
export interface ActiveBalanceSummary {
  totalAmount: number;
  recordCount: number;
}

/**
 * Structural contract both `AccountReceivableService` and `AssetService`
 * satisfy — lets `AccountStatementModalComponent` stay one generic
 * component shared by Cuentas por Cobrar and Activos, even though the two
 * modules never share balances or movements (that separation is entirely
 * backend-side: each service talks to its own table, scoped by clientId).
 */
export interface KardexAccountService {
  getStatement(clientId: string, filters?: KardexStatementFilters): Observable<KardexStatement>;
  getCurrentBalance(clientId: string): Observable<number>;
  registerCharge(clientId: string, input: RegisterKardexMovementInput): Observable<unknown>;
  registerPayment(clientId: string, input: RegisterKardexMovementInput): Observable<unknown>;
}
