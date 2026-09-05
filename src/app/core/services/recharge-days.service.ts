import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, RechargeClosedDaysFilters, RechargeClosedDayRow, RechargeDayDetail } from '../models';

const BASE_URL = `${environment.apiUrl}/recharge-days`;

/**
 * "Sistema → Gestión de Días de Recargas" — the Recargas-specific
 * counterpart to `ClosedDaysService` (Bancos), fully independent from it.
 * Every backend route (`RechargeDaysController`) already requires
 * ADMIN/SUPER_ADMIN via a class-level `@Roles`; this service doesn't
 * repeat that check, it's just the HTTP client. `authInterceptor` attaches
 * the JWT automatically.
 */
@Injectable({ providedIn: 'root' })
export class RechargeDaysService {
  private readonly http = inject(HttpClient);

  getClosedDays(filters: RechargeClosedDaysFilters): Observable<RechargeClosedDayRow[]> {
    const params: Record<string, string> = {};
    if (filters.dateFrom) params['dateFrom'] = filters.dateFrom;
    if (filters.dateTo) params['dateTo'] = filters.dateTo;
    if (filters.status) params['status'] = filters.status;
    if (filters.userId) params['userId'] = filters.userId;
    if (filters.resultSign) params['resultSign'] = filters.resultSign;

    return this.http
      .get<ApiSuccessResponse<RechargeClosedDayRow[]>>(BASE_URL, { params })
      .pipe(map((response) => response.data));
  }

  getDayDetail(date: string): Observable<RechargeDayDetail> {
    return this.http
      .get<ApiSuccessResponse<RechargeDayDetail>>(`${BASE_URL}/${date}`)
      .pipe(map((response) => response.data));
  }

  reopenDay(date: string, reason: string): Observable<RechargeDayDetail> {
    return this.http
      .post<ApiSuccessResponse<RechargeDayDetail>>(`${BASE_URL}/${date}/reopen`, { reason })
      .pipe(map((response) => response.data));
  }

  cancelDay(date: string, reason: string): Observable<RechargeDayDetail> {
    return this.http
      .post<ApiSuccessResponse<RechargeDayDetail>>(`${BASE_URL}/${date}/cancel`, { reason })
      .pipe(map((response) => response.data));
  }
}
