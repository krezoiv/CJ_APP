import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, CreateIceCreamSaleInput, IceCreamSale, PaginatedResponse } from '../models';

const BASE_URL = `${environment.apiUrl}/ice-cream-sales`;

@Injectable({ providedIn: 'root' })
export class IceCreamSalesService {
  private readonly http = inject(HttpClient);

  /** One atomic call — the backend's `confirm_ice_cream_sale` function creates the sale, its details, and decreases stock under a row lock (no overselling). */
  createSale(input: CreateIceCreamSaleInput): Observable<IceCreamSale> {
    return this.http.post<ApiSuccessResponse<IceCreamSale>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  /** A USER account only ever gets their own sales back — the backend decides that, not this call. */
  getSales(): Observable<PaginatedResponse<IceCreamSale>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<IceCreamSale>>>(BASE_URL)
      .pipe(map((response) => response.data));
  }

  getSaleById(id: string): Observable<IceCreamSale> {
    return this.http.get<ApiSuccessResponse<IceCreamSale>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }
}
