import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AlertsResult, ApiSuccessResponse } from '../models';

const BASE_URL = `${environment.apiUrl}/alerts`;

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly http = inject(HttpClient);

  getAlerts(): Observable<AlertsResult> {
    return this.http
      .get<ApiSuccessResponse<AlertsResult>>(BASE_URL)
      .pipe(map((response) => response.data));
  }

  markAsRead(key: string): Observable<void> {
    return this.http.post<void>(`${BASE_URL}/${encodeURIComponent(key)}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${BASE_URL}/read-all`, {});
  }
}
