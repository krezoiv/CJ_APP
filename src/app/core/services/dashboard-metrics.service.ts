import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, DashboardMetrics } from '../models';

const BASE_URL = `${environment.apiUrl}/dashboard`;

/** Admin-only on the backend (`@Roles`) — the caller (`DashboardHomeComponent`) is responsible for only invoking this when `AuthService.isAdmin()` is true; a `USER`-role token gets a real `403` from the backend regardless. */
@Injectable({ providedIn: 'root' })
export class DashboardMetricsService {
  private readonly http = inject(HttpClient);

  getSummary(): Observable<DashboardMetrics> {
    return this.http
      .get<ApiSuccessResponse<DashboardMetrics>>(`${BASE_URL}/summary`)
      .pipe(map((response) => response.data));
  }
}
