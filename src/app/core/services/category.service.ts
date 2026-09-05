import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, Category, CategoryInput } from '../models';

const BASE_URL = `${environment.apiUrl}/categories`;

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  /** Active-only by default — what the product form's dropdown should offer. */
  getCategories(includeInactive = false): Observable<Category[]> {
    return this.http
      .get<ApiSuccessResponse<Category[]>>(BASE_URL, { params: { includeInactive } })
      .pipe(map((response) => response.data));
  }

  getCategoryById(id: string): Observable<Category> {
    return this.http.get<ApiSuccessResponse<Category>>(`${BASE_URL}/${id}`).pipe(map((response) => response.data));
  }

  createCategory(input: CategoryInput): Observable<Category> {
    return this.http.post<ApiSuccessResponse<Category>>(BASE_URL, input).pipe(map((response) => response.data));
  }

  updateCategory(id: string, input: CategoryInput): Observable<Category> {
    return this.http
      .patch<ApiSuccessResponse<Category>>(`${BASE_URL}/${id}`, input)
      .pipe(map((response) => response.data));
  }

  /** Soft delete — the backend deactivates the category, it never deletes the row. */
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
