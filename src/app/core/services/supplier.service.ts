import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, Supplier, SupplierInput } from '../models';

const BASE_URL = `${environment.apiUrl}/suppliers`;

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);

  /** Active-only by default — what the purchase form's dropdown should offer. */
  getSuppliers(includeInactive = false): Observable<Supplier[]> {
    return this.http
      .get<ApiSuccessResponse<Supplier[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getSupplierById(id: string): Observable<Supplier> {
    return this.http.get<ApiSuccessResponse<Supplier>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createSupplier(input: SupplierInput): Observable<Supplier> {
    return this.http.post<ApiSuccessResponse<Supplier>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateSupplier(id: string, input: SupplierInput): Observable<Supplier> {
    return this.http
      .patch<ApiSuccessResponse<Supplier>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the supplier, it never deletes the row. */
  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
