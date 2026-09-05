import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { StatItem } from '../models';
import { STATS } from '../data';

/**
 * Credibility metrics shown right under the hero.
 *
 * Phase 2: replace the `of(STATS)` body with a real endpoint, e.g.
 * `this.http.get<StatItem[]>(\`${environment.apiUrl}/stats\`)`.
 */
@Injectable({ providedIn: 'root' })
export class StatsService {
  getStats(): Observable<StatItem[]> {
    return of(STATS);
  }
}
