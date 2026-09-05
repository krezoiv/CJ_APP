import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AccountReceivable,
  AccountReceivableFilters,
  AccountReceivableInput,
  ActiveBalanceSummary,
  ApiSuccessResponse,
  KardexAccountService,
  KardexStatement,
  KardexStatementFilters,
  PaginatedAccountsReceivable,
  RegisterKardexMovementInput,
} from '../models';

const BASE_URL = `${environment.apiUrl}/accounts-receivable`;

/** Drops `undefined`/empty-string values — `HttpParams` would otherwise send the literal string `"undefined"` as a query value. */
function toParams(filters: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class AccountReceivableService implements KardexAccountService {
  private readonly http = inject(HttpClient);

  getAccountsReceivable(
    filters: AccountReceivableFilters = {},
  ): Observable<PaginatedAccountsReceivable> {
    return this.http
      .get<ApiSuccessResponse<PaginatedAccountsReceivable>>(BASE_URL, { params: toParams(filters) })
      .pipe(map((response) => response.data));
  }

  getAccountReceivableById(id: string): Observable<AccountReceivable> {
    return this.http
      .get<ApiSuccessResponse<AccountReceivable>>(`${BASE_URL}/${id}`)
      .pipe(map((response) => response.data));
  }

  createAccountReceivable(input: AccountReceivableInput): Observable<AccountReceivable> {
    return this.http
      .post<ApiSuccessResponse<AccountReceivable>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }

  updateAccountReceivable(id: string, input: AccountReceivableInput): Observable<AccountReceivable> {
    return this.http
      .patch<ApiSuccessResponse<AccountReceivable>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the record, it never deletes the row. */
  deleteAccountReceivable(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }

  /** "Registrar Cargo" — an independent Kardex movement, never a rewrite of a prior one. */
  registerCharge(clientId: string, input: RegisterKardexMovementInput): Observable<AccountReceivable> {
    return this.http
      .post<ApiSuccessResponse<AccountReceivable>>(`${BASE_URL}/${clientId}/charges`, input)
      .pipe(map((response) => response.data));
  }

  /** "Registrar Abono" — the backend rejects an amount exceeding the client's current balance. */
  registerPayment(clientId: string, input: RegisterKardexMovementInput): Observable<AccountReceivable> {
    return this.http
      .post<ApiSuccessResponse<AccountReceivable>>(`${BASE_URL}/${clientId}/payments`, input)
      .pipe(map((response) => response.data));
  }

  getStatement(clientId: string, filters: KardexStatementFilters = {}): Observable<KardexStatement> {
    return this.http
      .get<ApiSuccessResponse<KardexStatement>>(`${BASE_URL}/${clientId}/statement`, { params: toParams(filters) })
      .pipe(map((response) => response.data));
  }

  getCurrentBalance(clientId: string): Observable<number> {
    return this.http
      .get<ApiSuccessResponse<{ balance: number }>>(`${BASE_URL}/${clientId}/balance`)
      .pipe(map((response) => response.data.balance));
  }

  /** Saldo total — active accounts only, regardless of the list's own current filters. */
  getActiveBalance(): Observable<ActiveBalanceSummary> {
    return this.http
      .get<ApiSuccessResponse<ActiveBalanceSummary>>(`${BASE_URL}/summary`)
      .pipe(map((response) => response.data));
  }
}
