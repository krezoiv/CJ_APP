import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountType, AccountTypeInput, ApiSuccessResponse } from '../models';

const BASE_URL = `${environment.apiUrl}/account-types`;

@Injectable({ providedIn: 'root' })
export class AccountTypeService {
  private readonly http = inject(HttpClient);

  /** Active-only by default — what the bank form's dropdown should offer. */
  getAccountTypes(includeInactive = false): Observable<AccountType[]> {
    return this.http
      .get<ApiSuccessResponse<AccountType[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getAccountTypeById(id: string): Observable<AccountType> {
    return this.http.get<ApiSuccessResponse<AccountType>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createAccountType(input: AccountTypeInput): Observable<AccountType> {
    return this.http.post<ApiSuccessResponse<AccountType>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateAccountType(id: string, input: AccountTypeInput): Observable<AccountType> {
    return this.http
      .patch<ApiSuccessResponse<AccountType>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the account type, it never deletes the row. */
  deleteAccountType(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
