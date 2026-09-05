import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, Business, BusinessInput } from '../models';

const BASE_URL = `${environment.apiUrl}/businesses`;

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly http = inject(HttpClient);

  /** Active-only by default — what the product form's dropdown should offer. */
  getBusinesses(includeInactive = false): Observable<Business[]> {
    return this.http
      .get<ApiSuccessResponse<Business[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getBusinessById(id: string): Observable<Business> {
    return this.http.get<ApiSuccessResponse<Business>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createBusiness(input: BusinessInput): Observable<Business> {
    return this.http.post<ApiSuccessResponse<Business>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateBusiness(id: string, input: BusinessInput): Observable<Business> {
    return this.http
      .patch<ApiSuccessResponse<Business>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the business, it never deletes the row. */
  deleteBusiness(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
