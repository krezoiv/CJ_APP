import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiSuccessResponse,
  PresentationType,
  PresentationTypeFilters,
  PresentationTypeInput,
  PresentationTypeListItem,
} from '../models';

const BASE_URL = `${environment.apiUrl}/presentation-types`;

function toParams(filters: PresentationTypeFilters): HttpParams {
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
export class PresentationTypeService {
  private readonly http = inject(HttpClient);

  getPresentationTypes(
    filters: PresentationTypeFilters = {},
  ): Observable<PresentationTypeListItem[]> {
    return this.http
      .get<ApiSuccessResponse<PresentationTypeListItem[]>>(BASE_URL, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getPresentationTypeById(id: string): Observable<PresentationType> {
    return this.http
      .get<ApiSuccessResponse<PresentationType>>(`${BASE_URL}/${id}`)
      .pipe(map((response) => response.data));
  }

  createPresentationType(
    input: PresentationTypeInput,
  ): Observable<PresentationType> {
    return this.http
      .post<ApiSuccessResponse<PresentationType>>(BASE_URL, input)
      .pipe(map((response) => response.data));
  }

  updatePresentationType(
    id: string,
    input: Partial<PresentationTypeInput>,
  ): Observable<PresentationType> {
    return this.http
      .patch<ApiSuccessResponse<PresentationType>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the row, it never deletes it. */
  deletePresentationType(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
