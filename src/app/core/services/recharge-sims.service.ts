import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiSuccessResponse,
  RegisterSimPurchaseInput,
  RegisterSimSaleInput,
  SimDailyStock,
  SimType,
} from '../models';

const BASE_URL = `${environment.apiUrl}/recharges/sims`;

/** Mirrors `RechargesService`'s own shape — a fully separate service hitting `/recharges/sims/*`, never mixed with the electronic-balance endpoints. */
@Injectable({ providedIn: 'root' })
export class RechargeSimsService {
  private readonly http = inject(HttpClient);

  getTypes(): Observable<SimType[]> {
    return this.http
      .get<ApiSuccessResponse<SimType[]>>(`${BASE_URL}/types`)
      .pipe(map((response) => response.data));
  }

  /** `date` defaults to today server-side when omitted — pass the operation-date picker's value to browse another day. */
  getDailyStock(date?: string): Observable<SimDailyStock[]> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http
      .get<ApiSuccessResponse<SimDailyStock[]>>(`${BASE_URL}/daily`, { params })
      .pipe(map((response) => response.data));
  }

  registerPurchase(input: RegisterSimPurchaseInput): Observable<SimDailyStock> {
    return this.http
      .post<ApiSuccessResponse<SimDailyStock>>(`${BASE_URL}/purchases`, input)
      .pipe(map((response) => response.data));
  }

  registerSale(input: RegisterSimSaleInput): Observable<SimDailyStock> {
    return this.http
      .post<ApiSuccessResponse<SimDailyStock>>(`${BASE_URL}/sales`, input)
      .pipe(map((response) => response.data));
  }
}
