import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, IceCream, IceCreamInput, PaginatedResponse } from '../models';

const BASE_URL = `${environment.apiUrl}/ice-creams`;

/**
 * Talks to `${environment.apiUrl}/ice-creams`. `getIceCreams()` asks for a
 * generous page size since the inventory screen does its own client-side
 * search/filter/sort over the full active list — same convention as
 * `InventoryService.getProducts()`.
 */
const LIST_LIMIT = 100;
/** Small on purpose — this is a live-search dropdown (Compras/Ventas), not a management list. */
const SEARCH_LIMIT = 8;

@Injectable({ providedIn: 'root' })
export class IceCreamService {
  private readonly http = inject(HttpClient);

  getIceCreams(): Observable<IceCream[]> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<IceCream>>>(BASE_URL, { params: { limit: LIST_LIMIT } })
      .pipe(map((response) => response.data.items));
  }

  /** Server-side search by SKU or nombre — active helados only (the backend's default). Used by the Compras/Ventas product picker. */
  searchIceCreams(query: string): Observable<IceCream[]> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<IceCream>>>(BASE_URL, {
        params: { search: query, limit: SEARCH_LIMIT },
      })
      .pipe(map((response) => response.data.items));
  }

  getIceCreamById(id: string): Observable<IceCream> {
    return this.http.get<ApiSuccessResponse<IceCream>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createIceCream(input: IceCreamInput): Observable<IceCream> {
    return this.http.post<ApiSuccessResponse<IceCream>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateIceCream(id: string, input: IceCreamInput): Observable<IceCream> {
    return this.http
      .patch<ApiSuccessResponse<IceCream>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the helado, it never deletes the row. */
  deleteIceCream(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
