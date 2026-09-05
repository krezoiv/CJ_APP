import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Client, ClientInput, ApiSuccessResponse } from '../models';

const BASE_URL = `${environment.apiUrl}/clients`;

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);

  /** Active-only by default. The admin screen passes true to also show inactive clients. */
  getClients(includeInactive = false): Observable<Client[]> {
    return this.http
      .get<ApiSuccessResponse<Client[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getClientById(id: string): Observable<Client> {
    return this.http.get<ApiSuccessResponse<Client>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createClient(input: ClientInput): Observable<Client> {
    return this.http.post<ApiSuccessResponse<Client>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateClient(id: string, input: ClientInput): Observable<Client> {
    return this.http
      .patch<ApiSuccessResponse<Client>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the client, it never deletes the row. */
  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
