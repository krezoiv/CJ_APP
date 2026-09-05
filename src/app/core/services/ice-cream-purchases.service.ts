import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, CreateIceCreamPurchaseInput, IceCreamPurchase, PaginatedResponse } from '../models';

const BASE_URL = `${environment.apiUrl}/ice-cream-purchases`;

@Injectable({ providedIn: 'root' })
export class IceCreamPurchasesService {
  private readonly http = inject(HttpClient);

  /** One atomic call — the backend's `confirm_ice_cream_purchase` function creates the purchase, its details, and increases stock/cost price. */
  createPurchase(input: CreateIceCreamPurchaseInput): Observable<IceCreamPurchase> {
    return this.http
      .post<ApiSuccessResponse<IceCreamPurchase>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }

  /** A USER account only ever gets their own purchases back — the backend decides that, not this call. */
  getPurchases(): Observable<PaginatedResponse<IceCreamPurchase>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<IceCreamPurchase>>>(BASE_URL)
      .pipe(map((response) => response.data));
  }

  getPurchaseById(id: string): Observable<IceCreamPurchase> {
    return this.http
      .get<ApiSuccessResponse<IceCreamPurchase>>(`${BASE_URL}/${id}`)
      .pipe(map((response) => response.data));
  }
}
