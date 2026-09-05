import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  ApiSuccessResponse,
  CreateQuotationInput,
  ListQuotationsQuery,
  PaginatedResponse,
  Quotation,
  QuotationSummary,
} from '../models';
import { environment } from '../../../environments/environment';

const BASE_URL = `${environment.apiUrl}/quotations`;

/** A Cotización is explicitly NOT a sale — this service only ever calls `/quotations`, never `/sales` or `/inventory`. */
@Injectable({ providedIn: 'root' })
export class QuotationsService {
  private readonly http = inject(HttpClient);

  createQuotation(input: CreateQuotationInput): Observable<Quotation> {
    return this.http.post<ApiSuccessResponse<Quotation>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  getQuotations(query: ListQuotationsQuery = {}): Observable<PaginatedResponse<QuotationSummary>> {
    // `HttpParams` stringifies an `undefined` value as the literal text "undefined" rather than
    // omitting the key — an unset `status` filter must never reach the request at all, or the
    // backend's `@IsIn(...)` validation on `ListQuotationsQueryDto.status` rejects it with 400.
    const params: Record<string, string | number> = {};
    if (query.status !== undefined) {
      params['status'] = query.status;
    }
    if (query.page !== undefined) {
      params['page'] = query.page;
    }
    if (query.limit !== undefined) {
      params['limit'] = query.limit;
    }
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<QuotationSummary>>>(BASE_URL, { params })
      .pipe(map((response) => response.data));
  }

  getQuotationById(id: string): Observable<Quotation> {
    return this.http.get<ApiSuccessResponse<Quotation>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  exportQuotationPdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE_URL}/${id}/pdf`, { responseType: 'blob' });
  }

  voidQuotation(id: string, reason: string): Observable<Quotation> {
    return this.http
      .post<ApiSuccessResponse<Quotation>>(`${BASE_URL}/${id}/void`, { reason })
      .pipe(map((response) => response.data));
  }
}
