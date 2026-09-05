import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ServiceItem } from '../models';
import { SERVICES } from '../data';

/**
 * Provides the list of services Comercial Jhoel offers (útiles escolares,
 * fotocopias, agente bancario, etc).
 *
 * Phase 2: replace the `of(SERVICES)` body with
 * `this.http.get<ServiceItem[]>(\`${environment.apiUrl}/services\`)`.
 */
@Injectable({ providedIn: 'root' })
export class OffersService {
  getServices(): Observable<ServiceItem[]> {
    return of(SERVICES);
  }
}
