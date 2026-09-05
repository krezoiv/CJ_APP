import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiSuccessResponse,
  RechargeDailyBalance,
  RechargeDayStatus,
  RechargeSale,
  RechargeSalesSummary,
  RechargeType,
  RegisterRechargeFinalBalanceInput,
  RegisterRechargePurchaseInput,
  RegisterRechargeSaleInput,
  RegisterRechargeSalesClosureInput,
  UpdateRechargeSaleInput,
} from '../models';

const BASE_URL = `${environment.apiUrl}/recharges`;

@Injectable({ providedIn: 'root' })
export class RechargesService {
  private readonly http = inject(HttpClient);

  getTypes(): Observable<RechargeType[]> {
    return this.http
      .get<ApiSuccessResponse<RechargeType[]>>(`${BASE_URL}/types`)
      .pipe(map((response) => response.data));
  }

  /** Admin-only threshold the Alerts module reads for "saldo bajo de recargas". */
  updateTypeMinBalance(id: string, minBalance: number): Observable<RechargeType> {
    return this.http
      .patch<ApiSuccessResponse<RechargeType>>(`${BASE_URL}/types/${id}/min-balance`, { minBalance })
      .pipe(map((response) => response.data));
  }

  /** `date` defaults to today server-side when omitted — pass the operation-date picker's value to browse another day. */
  getDailySummary(date?: string): Observable<RechargeDailyBalance[]> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http
      .get<ApiSuccessResponse<RechargeDailyBalance[]>>(`${BASE_URL}/daily`, { params })
      .pipe(map((response) => response.data));
  }

  registerPurchase(input: RegisterRechargePurchaseInput): Observable<RechargeDailyBalance> {
    return this.http
      .post<ApiSuccessResponse<RechargeDailyBalance>>(`${BASE_URL}/purchases`, input)
      .pipe(map((response) => response.data));
  }

  registerFinalBalance(dailyBalanceId: string, input: RegisterRechargeFinalBalanceInput): Observable<RechargeDailyBalance> {
    return this.http
      .patch<ApiSuccessResponse<RechargeDailyBalance>>(`${BASE_URL}/daily/${dailyBalanceId}/final-balance`, input)
      .pipe(map((response) => response.data));
  }

  /** `date` defaults to today server-side when omitted — pass the operation-date picker's value to browse another day. */
  getSalesSummary(date?: string): Observable<RechargeSalesSummary> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http
      .get<ApiSuccessResponse<RechargeSalesSummary>>(`${BASE_URL}/sales-summary`, { params })
      .pipe(map((response) => response.data));
  }

  registerSalesClosure(input: RegisterRechargeSalesClosureInput): Observable<RechargeSalesSummary> {
    return this.http
      .post<ApiSuccessResponse<RechargeSalesSummary>>(`${BASE_URL}/sales-closure`, input)
      .pipe(map((response) => response.data));
  }

  /** `date` defaults to today server-side when omitted — pass the operation-date picker's value to browse another day. */
  getSales(date?: string): Observable<RechargeSale[]> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http
      .get<ApiSuccessResponse<RechargeSale[]>>(`${BASE_URL}/sales`, { params })
      .pipe(map((response) => response.data));
  }

  registerSale(input: RegisterRechargeSaleInput): Observable<RechargeSale> {
    return this.http
      .post<ApiSuccessResponse<RechargeSale>>(`${BASE_URL}/sales`, input)
      .pipe(map((response) => response.data));
  }

  updateSale(id: string, input: UpdateRechargeSaleInput): Observable<RechargeSale> {
    return this.http
      .patch<ApiSuccessResponse<RechargeSale>>(`${BASE_URL}/sales/${id}`, input)
      .pipe(map((response) => response.data));
  }

  deleteSale(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/sales/${id}`);
  }

  /** `date` defaults to today server-side when omitted — pass the operation-date picker's value to check another day. */
  getDayStatus(date?: string): Observable<RechargeDayStatus> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http
      .get<ApiSuccessResponse<RechargeDayStatus>>(`${BASE_URL}/day-status`, { params })
      .pipe(map((response) => response.data));
  }

  /** Idempotent on the backend — a double click or retry never fails or duplicates the opening. */
  openDay(date?: string): Observable<RechargeDayStatus> {
    return this.http
      .post<ApiSuccessResponse<RechargeDayStatus>>(`${BASE_URL}/day-status/open`, date ? { date } : {})
      .pipe(map((response) => response.data));
  }

  /** "Cerrar Día" — a standalone action, never a cuadre save; requires at least one cuadre already saved for the date. */
  closeDay(date?: string): Observable<RechargeDayStatus> {
    return this.http
      .post<ApiSuccessResponse<RechargeDayStatus>>(`${BASE_URL}/day-status/close`, date ? { date } : {})
      .pipe(map((response) => response.data));
  }
}
