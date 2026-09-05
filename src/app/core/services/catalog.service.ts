import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { CatalogCategory } from '../models';
import { CATALOG_CATEGORIES } from '../data';

/**
 * Product catalog categories shown on the landing preview and the full
 * catalog page.
 *
 * Phase 2: replace the `of(...)` body with
 * `this.http.get<CatalogCategory[]>(\`${environment.apiUrl}/catalog/categories\`)`.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  getCategories(): Observable<CatalogCategory[]> {
    return of(CATALOG_CATEGORIES);
  }
}
