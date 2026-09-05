import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, TransactionType, TransactionTypeInput } from '../models';

const BASE_URL = `${environment.apiUrl}/transaction-types`;

@Injectable({ providedIn: 'root' })
export class TransactionTypeService {
  private readonly http = inject(HttpClient);

  /** Active-only by default — what Transaccionar's dashboard cards should offer. */
  getTransactionTypes(includeInactive = false): Observable<TransactionType[]> {
    return this.http
      .get<ApiSuccessResponse<TransactionType[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getTransactionTypeById(id: string): Observable<TransactionType> {
    return this.http
      .get<ApiSuccessResponse<TransactionType>>(`${BASE_URL}/${id}`)
      .pipe(map((response) => response.data));
  }

  createTransactionType(input: TransactionTypeInput): Observable<TransactionType> {
    return this.http
      .post<ApiSuccessResponse<TransactionType>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }

  updateTransactionType(id: string, input: TransactionTypeInput): Observable<TransactionType> {
    return this.http
      .patch<ApiSuccessResponse<TransactionType>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the tipo de transacción, it never deletes the row. */
  deleteTransactionType(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
