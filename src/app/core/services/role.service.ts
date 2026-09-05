import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, CreateRoleInput, Role, UpdateRoleInput } from '../models';

const BASE_URL = `${environment.apiUrl}/roles`;

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);

  /** Active-only by default — what the user form's role dropdown should offer. */
  getRoles(includeInactive = false): Observable<Role[]> {
    return this.http
      .get<ApiSuccessResponse<Role[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getRoleById(id: string): Observable<Role> {
    return this.http.get<ApiSuccessResponse<Role>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createRole(input: CreateRoleInput): Observable<Role> {
    return this.http.post<ApiSuccessResponse<Role>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateRole(id: string, input: UpdateRoleInput): Observable<Role> {
    return this.http
      .patch<ApiSuccessResponse<Role>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the role, it never deletes the row. Blocked if users are still assigned. */
  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
