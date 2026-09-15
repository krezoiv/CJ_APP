import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiSuccessResponse,
  CreatePurchaseInput,
  ImportPurchaseResult,
  ListPurchasesFilters,
  PaginatedResponse,
  Purchase,
  PurchasesDailyStats,
  PurchasesWeeklyStats,
  PurchasesYearlyStats,
} from '../models';

const BASE_URL = `${environment.apiUrl}/purchases`;

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly http = inject(HttpClient);

  /** One atomic call — the backend's `confirm_purchase` function creates the purchase, its details, increases stock, and updates product prices. */
  createPurchase(input: CreatePurchaseInput): Observable<Purchase> {
    return this.http.post<ApiSuccessResponse<Purchase>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  /** A USER account only ever gets their own purchases back — the backend decides that, not this call. An admin (e.g. "Administrar Facturas de Compras") sees every purchase, filtered by whatever `filters` carries. */
  getPurchases(filters?: ListPurchasesFilters): Observable<PaginatedResponse<Purchase>> {
    let params = new HttpParams();
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      }
    }
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<Purchase>>>(BASE_URL, { params })
      .pipe(map((response) => response.data));
  }

  getPurchaseById(id: string): Observable<Purchase> {
    return this.http.get<ApiSuccessResponse<Purchase>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  /** "Marcar como pagada" — operational, no admin check on this side either (mirrors the backend's own policy). */
  markAsPaid(id: string): Observable<Purchase> {
    return this.http
      .post<ApiSuccessResponse<Purchase>>(`${BASE_URL}/${id}/pay`, {})
      .pipe(map((response) => response.data));
  }

  /** Reconstructs the invoice PDF purely from the already-persisted purchase — never re-runs the save. */
  exportPurchasePdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE_URL}/${id}/pdf`, { responseType: 'blob' });
  }

  /** "Anular factura" — admin-only server-side; never a physical delete/edit, marks the purchase `ANULADA` and reverses its exact inventory effect atomically. */
  voidPurchase(id: string, reason: string): Observable<Purchase> {
    return this.http
      .post<ApiSuccessResponse<Purchase>>(`${BASE_URL}/${id}/void`, { reason })
      .pipe(map((response) => response.data));
  }

  /** The blank `.xlsx` template `ImportPurchaseFromExcelUseCase` expects — same blob-download shape as Products' own import template. */
  downloadInitialStockTemplate(): Observable<Blob> {
    return this.http.get(`${BASE_URL}/import/template`, { responseType: 'blob' });
  }

  /**
   * "Cargar stock inicial (Excel)" — `POST /purchases/import`, a plain JSON
   * response (counts + skipped rows), not a file, so unlike the template
   * download this is a normal `FormData` upload with no `responseType:
   * 'blob'`. Every row the backend accepted is already a real, saved
   * purchase by the time this resolves.
   */
  importInitialStockExcel(file: File): Observable<ImportPurchaseResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiSuccessResponse<ImportPurchaseResult>>(`${BASE_URL}/import`, formData)
      .pipe(map((response) => response.data));
  }

  /** Open to any authenticated account — backs "Compras del mes" en Gráficas → Indicadores de Compras, siempre el mes actual del servidor. */
  getDailyStats(): Observable<PurchasesDailyStats> {
    return this.http
      .get<ApiSuccessResponse<PurchasesDailyStats>>(`${BASE_URL}/daily-stats`)
      .pipe(map((response) => response.data));
  }

  /** Open to any authenticated account — backs "Compras por semana". */
  getWeeklyStats(): Observable<PurchasesWeeklyStats> {
    return this.http
      .get<ApiSuccessResponse<PurchasesWeeklyStats>>(`${BASE_URL}/weekly-stats`)
      .pipe(map((response) => response.data));
  }

  /** Open to any authenticated account — backs "Compras por mes" (anual). */
  getYearlyStats(): Observable<PurchasesYearlyStats> {
    return this.http
      .get<ApiSuccessResponse<PurchasesYearlyStats>>(`${BASE_URL}/yearly-stats`)
      .pipe(map((response) => response.data));
  }
}
