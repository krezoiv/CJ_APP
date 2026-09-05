import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, TransactionBank, TransactionBankInput } from '../models';

const BASE_URL = `${environment.apiUrl}/transaction-banks`;

@Injectable({ providedIn: 'root' })
export class TransactionBankService {
  private readonly http = inject(HttpClient);

  /** Active-only by default — what Transaccionar's bank dropdown should offer. */
  getTransactionBanks(includeInactive = false): Observable<TransactionBank[]> {
    return this.http
      .get<ApiSuccessResponse<TransactionBank[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getTransactionBankById(id: string): Observable<TransactionBank> {
    return this.http
      .get<ApiSuccessResponse<TransactionBank>>(`${BASE_URL}/${id}`)
      .pipe(map((response) => response.data));
  }

  createTransactionBank(input: TransactionBankInput): Observable<TransactionBank> {
    return this.http
      .post<ApiSuccessResponse<TransactionBank>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }

  updateTransactionBank(id: string, input: TransactionBankInput): Observable<TransactionBank> {
    return this.http
      .patch<ApiSuccessResponse<TransactionBank>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the banco agente, it never deletes the row. */
  deleteTransactionBank(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
