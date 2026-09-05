import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiSuccessResponse,
  UnitOfMeasure,
  UnitOfMeasureFilters,
  UnitOfMeasureInput,
  UnitOfMeasureListItem,
} from '../models';

const BASE_URL = `${environment.apiUrl}/units-of-measure`;

function toParams(filters: UnitOfMeasureFilters): HttpParams {
  let params = new HttpParams();
  if (filters.includeInactive) {
    params = params.set('includeInactive', 'true');
  }
  if (filters.search) {
    params = params.set('search', filters.search);
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class UnitOfMeasureService {
  private readonly http = inject(HttpClient);

  getUnitsOfMeasure(
    filters: UnitOfMeasureFilters = {},
  ): Observable<UnitOfMeasureListItem[]> {
    return this.http
      .get<ApiSuccessResponse<UnitOfMeasureListItem[]>>(BASE_URL, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getUnitOfMeasureById(id: string): Observable<UnitOfMeasure> {
    return this.http
      .get<ApiSuccessResponse<UnitOfMeasure>>(`${BASE_URL}/${id}`)
      .pipe(map((response) => response.data));
  }

  createUnitOfMeasure(input: UnitOfMeasureInput): Observable<UnitOfMeasure> {
    return this.http
      .post<ApiSuccessResponse<UnitOfMeasure>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }

  updateUnitOfMeasure(
    id: string,
    input: Partial<UnitOfMeasureInput>,
  ): Observable<UnitOfMeasure> {
    return this.http
      .patch<ApiSuccessResponse<UnitOfMeasure>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the row, it never deletes it. */
  deleteUnitOfMeasure(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
