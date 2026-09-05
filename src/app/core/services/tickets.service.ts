import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  ApiSuccessResponse,
  CreateTicketInput,
  ListTicketsQuery,
  PaginatedResponse,
  Ticket,
  TicketSummary,
} from '../models';
import { environment } from '../../../environments/environment';

const BASE_URL = `${environment.apiUrl}/tickets`;

/** A Ticket is explicitly NOT a real sale — this service only ever calls `/tickets`, never `/sales` or `/inventory`. */
@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly http = inject(HttpClient);

  createTicket(input: CreateTicketInput): Observable<Ticket> {
    return this.http.post<ApiSuccessResponse<Ticket>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  getTickets(query: ListTicketsQuery = {}): Observable<PaginatedResponse<TicketSummary>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<TicketSummary>>>(BASE_URL, { params: { ...query } })
      .pipe(map((response) => response.data));
  }

  getTicketById(id: string): Observable<Ticket> {
    return this.http.get<ApiSuccessResponse<Ticket>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  exportTicketPdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE_URL}/${id}/pdf`, { responseType: 'blob' });
  }

  voidTicket(id: string, reason: string): Observable<Ticket> {
    return this.http
      .post<ApiSuccessResponse<Ticket>>(`${BASE_URL}/${id}/void`, { reason })
      .pipe(map((response) => response.data));
  }
}
