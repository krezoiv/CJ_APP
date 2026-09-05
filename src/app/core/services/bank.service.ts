import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, Bank, BankInput } from '../models';

const BASE_URL = `${environment.apiUrl}/banks`;

@Injectable({ providedIn: 'root' })
export class BankService {
  private readonly http = inject(HttpClient);

  getBanks(includeInactive = false, search?: string): Observable<Bank[]> {
    return this.http
      .get<ApiSuccessResponse<Bank[]>>(BASE_URL, { params: { includeInactive, ...(search ? { search } : {}) } })
      .pipe(map((response) => response.data));
  }

  getBankById(id: string): Observable<Bank> {
    return this.http.get<ApiSuccessResponse<Bank>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createBank(input: BankInput): Observable<Bank> {
    return this.http.post<ApiSuccessResponse<Bank>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateBank(id: string, input: BankInput): Observable<Bank> {
    return this.http.patch<ApiSuccessResponse<Bank>>(`${BASE_URL}/${id}`, input).pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the bank, it never deletes the row (past bank_balances history stays intact). */
  deleteBank(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
