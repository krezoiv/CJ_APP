import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AlertSettings, ApiSuccessResponse, UpdateAlertSettingsInput } from '../models';

const BASE_URL = `${environment.apiUrl}/alert-settings`;

@Injectable({ providedIn: 'root' })
export class AlertSettingsService {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<AlertSettings> {
    return this.http.get<ApiSuccessResponse<AlertSettings>>(BASE_URL).pipe(map((response) => response.data));
  }

  updateSettings(input: UpdateAlertSettingsInput): Observable<AlertSettings> {
    return this.http
      .patch<ApiSuccessResponse<AlertSettings>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }
}
