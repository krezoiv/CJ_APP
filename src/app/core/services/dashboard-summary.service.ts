import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { DashboardSummaryItem } from '../models';
import { DASHBOARD_SUMMARY } from '../data';

/**
 * Phase 2: replace the `of(...)` body with
 * `this.http.get<DashboardSummaryItem[]>(\`${environment.apiUrl}/dashboard/summary\`)`.
 */
@Injectable({ providedIn: 'root' })
export class DashboardSummaryService {
  getSummary(): Observable<DashboardSummaryItem[]> {
    return of(DASHBOARD_SUMMARY);
  }
}
