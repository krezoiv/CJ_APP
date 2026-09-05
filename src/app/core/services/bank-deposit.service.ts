import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, BankDepositMonthlyCount, BankDepositOperation, RegisterBankDepositInput } from '../models';

const BASE_URL = `${environment.apiUrl}/bank-deposits`;

@Injectable({ providedIn: 'root' })
export class BankDepositService {
  private readonly http = inject(HttpClient);

  /** The backend recomputes/validates the cash and transaction totals server-side — this call can still fail with a real cuadre error even if the form looked balanced client-side. */
  registerOperation(input: RegisterBankDepositInput): Observable<BankDepositOperation> {
    return this.http
      .post<ApiSuccessResponse<BankDepositOperation>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }

  getOperationById(id: string): Observable<BankDepositOperation> {
    return this.http
      .get<ApiSuccessResponse<BankDepositOperation>>(`${BASE_URL}/${id}`)
      .pipe(map((response) => response.data));
  }

  /** Admin-only on the backend (`@Roles`) — never a real delete/edit, marks the operation `isVoided` and keeps it forever for audit. */
  voidOperation(id: string, reason: string): Observable<BankDepositOperation> {
    return this.http
      .post<ApiSuccessResponse<BankDepositOperation>>(`${BASE_URL}/${id}/void`, { reason })
      .pipe(map((response) => response.data));
  }

  /** Open to any authenticated account (unlike the full Reportería summary) — backs the Resumen dashboard's "Bancos" tile. Resets automatically every month: always the count for whatever month it is right now, never a stored/accumulating figure. */
  getMonthlyCount(): Observable<BankDepositMonthlyCount> {
    return this.http
      .get<ApiSuccessResponse<BankDepositMonthlyCount>>(`${BASE_URL}/monthly-count`)
      .pipe(map((response) => response.data));
  }
}
