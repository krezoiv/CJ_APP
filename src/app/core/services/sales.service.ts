import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, CreateSaleInput, PaginatedResponse, PriceListType, Sale } from '../models';

const BASE_URL = `${environment.apiUrl}/sales`;

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);

  /**
   * Bulk, one-shot sale creation — kept for other callers (see `Sale.createSale`
   * in `core/models/sale.model.ts`). The Ventas screen itself uses the
   * real-time draft flow below instead.
   */
  createSale(input: CreateSaleInput): Observable<Sale> {
    return this.http.post<ApiSuccessResponse<Sale>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  /** A USER account only ever gets their own sales back — the backend decides that, not this call. */
  getSales(): Observable<PaginatedResponse<Sale>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<Sale>>>(BASE_URL)
      .pipe(map((response) => response.data));
  }

  getSaleById(id: string): Observable<Sale> {
    return this.http.get<ApiSuccessResponse<Sale>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  /**
   * Reserves (positive `quantityDelta`) or releases (negative) stock against
   * one specific open receipt (`draftKey` — one per open tab), in real time —
   * creates that draft's server-side row on its first call. Returns the full
   * updated draft so the UI always renders exactly what the backend actually
   * committed, never an optimistic local guess.
   */
  adjustSaleItem(productId: string, quantityDelta: number, draftKey: string): Observable<Sale> {
    return this.http
      .post<ApiSuccessResponse<Sale>>(`${BASE_URL}/items`, { productId, quantityDelta, draftKey })
      .pipe(map((response) => response.data));
  }

  /**
   * Every one of the caller's currently open receipts (one per open tab) —
   * an empty array (not a thrown error) whenever there are none, so a page
   * load never needs to special-case "nothing in progress": either way, the
   * Ventas screen just starts from a single empty tab.
   */
  getCurrentSales(): Observable<Sale[]> {
    return this.http.get<ApiSuccessResponse<Sale[]>>(`${BASE_URL}/current`).pipe(
      map((response) => response.data),
      catchError(() => of([])),
    );
  }

  /** "Guardar venta" — stock was already reserved as items were added; this only finalizes the targeted tab's receipt. */
  confirmSale(draftKey: string): Observable<Sale> {
    return this.http
      .post<ApiSuccessResponse<Sale>>(`${BASE_URL}/confirm`, { draftKey })
      .pipe(map((response) => response.data));
  }

  /** Discards the targeted tab's in-progress receipt — every reserved line's stock is restored. */
  cancelSale(draftKey: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/current`, { params: { draftKey } });
  }

  /**
   * Sets/updates one open receipt's client and price list — call once per
   * tab, before or while that tab's cart is empty. The backend rejects a
   * price-list change once that receipt has line items (`clientId: null`
   * clears the client, which is always allowed).
   */
  configurePricing(
    clientId: string | null,
    priceList: PriceListType,
    draftKey: string,
  ): Observable<Sale> {
    return this.http
      .patch<ApiSuccessResponse<Sale>>(`${BASE_URL}/current/pricing`, { clientId, priceList, draftKey })
      .pipe(map((response) => response.data));
  }

  /** Reconstructs the receipt PDF purely from the already-persisted sale — never re-runs the save. */
  exportSalePdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE_URL}/${id}/pdf`, { responseType: 'blob' });
  }
}
