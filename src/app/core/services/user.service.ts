import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, CreateUserInput, PaginatedResponse, UpdateUserInput, User } from '../models';

const BASE_URL = `${environment.apiUrl}/users`;
const LIST_LIMIT = 100;

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  /** Active-only by default. The admin management screen passes `true` — it needs to show inactive accounts too. */
  getUsers(includeInactive = false): Observable<User[]> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<User>>>(BASE_URL, {
        params: { limit: LIST_LIMIT, includeInactive },
      })
      .pipe(map((response) => response.data.items));
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<ApiSuccessResponse<User>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createUser(input: CreateUserInput): Observable<User> {
    return this.http.post<ApiSuccessResponse<User>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateUser(id: string, input: UpdateUserInput): Observable<User> {
    return this.http
      .patch<ApiSuccessResponse<User>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the user, it never deletes the row. */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
