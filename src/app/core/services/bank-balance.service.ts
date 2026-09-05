import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, BankBalanceView, SaveBankBalancesInput, SaveBankBalancesResult } from '../models';

const BASE_URL = `${environment.apiUrl}/banks/balances`;

@Injectable({ providedIn: 'root' })
export class BankBalanceService {
  private readonly http = inject(HttpClient);

  /** Every active bank plus its resolved previous balance and whatever final balance is already saved for `operationDate`. */
  getBalancesView(operationDate: string): Observable<BankBalanceView[]> {
    return this.http
      .get<ApiSuccessResponse<BankBalanceView[]>>(BASE_URL, { params: { operationDate } })
      .pipe(map((response) => response.data));
  }

  /** One atomic call — the backend's `save_bank_balance` function (once per entry, inside one outer transaction) resolves each bank's previous balance and records the cuadre. */
  saveBalances(input: SaveBankBalancesInput): Observable<SaveBankBalancesResult> {
    return this.http.post<ApiSuccessResponse<SaveBankBalancesResult>>(BASE_URL, input).pipe(map((response) => response.data));
  }
}
