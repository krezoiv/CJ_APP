import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, PaginatedResponse, Product, ProductInput, StockByLocation } from '../models';

/** Raw shape the API returns for a product — `category` maps this to the flat `Product` the UI uses. */
interface ProductApiModel {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  categoryName: string;
  businessId: string;
  businessName: string;
  unitOfMeasureId: string;
  unitOfMeasureName: string;
  unitOfMeasureAbbreviation: string;
  costPrice: number;
  publicPrice: number;
  wholesalePrice: number;
  stock: number;
  stockByLocation?: StockByLocation[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toProduct(api: ProductApiModel): Product {
  return {
    id: api.id,
    name: api.name,
    sku: api.sku,
    category: api.categoryName,
    categoryId: api.categoryId,
    business: api.businessName,
    businessId: api.businessId,
    unitOfMeasure: api.unitOfMeasureName,
    unitOfMeasureAbbreviation: api.unitOfMeasureAbbreviation,
    unitOfMeasureId: api.unitOfMeasureId,
    costPrice: api.costPrice,
    publicPrice: api.publicPrice,
    wholesalePrice: api.wholesalePrice,
    stock: api.stock,
    stockByLocation: api.stockByLocation,
    isActive: api.isActive,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

/** Filters the export routes accept — same shape the backend's `ExportProductsQueryDto` validates. */
export interface ProductExportFilters {
  search?: string;
  categoryId?: string;
  businessId?: string;
}

/**
 * Talks to `${environment.apiUrl}/products` — no more mock data. `getProducts()`
 * asks for a generous page size since the inventory screen still does its own
 * client-side search/filter/sort over the full active list (see
 * InventoryPageComponent); swapping this for real server-side pagination
 * later only means changing this one method.
 */
const LIST_LIMIT = 100;
/** Small on purpose — this is a live-search dropdown (Ventas), not a management list. */
const SEARCH_LIMIT = 8;

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  getProducts(): Observable<Product[]> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<ProductApiModel>>>(`${environment.apiUrl}/products`, {
        params: { limit: LIST_LIMIT },
      })
      .pipe(map((response) => response.data.items.map(toProduct)));
  }

  /** Server-side search by name or SKU — active products only (the backend's default). Used by the Ventas product picker. */
  searchProducts(query: string): Observable<Product[]> {
    return this.http
      .get<ApiSuccessResponse<PaginatedResponse<ProductApiModel>>>(`${environment.apiUrl}/products`, {
        params: { search: query, limit: SEARCH_LIMIT },
      })
      .pipe(map((response) => response.data.items.map(toProduct)));
  }

  getProductById(id: string): Observable<Product> {
    return this.http
      .get<ApiSuccessResponse<ProductApiModel>>(`${environment.apiUrl}/products/${id}`)
      .pipe(map((response) => toProduct(response.data)));
  }

  createProduct(input: ProductInput): Observable<Product> {
    return this.http
      .post<ApiSuccessResponse<ProductApiModel>>(`${environment.apiUrl}/products`, input)
      .pipe(map((response) => toProduct(response.data)));
  }

  /** `stock` is never sent here even if present on `input` — the backend rejects unknown fields on update (`forbidNonWhitelisted`), since stock is now only ever changed via Compras/Ventas/Traslados. */
  updateProduct(id: string, input: ProductInput): Observable<Product> {
    const { stock: _stock, ...rest } = input;
    return this.http
      .patch<ApiSuccessResponse<ProductApiModel>>(`${environment.apiUrl}/products/${id}`, rest)
      .pipe(map((response) => toProduct(response.data)));
  }

  /** Soft delete — the backend deactivates the product, it never deletes the row. */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/products/${id}`);
  }

  /**
   * Both exports take the same filter shape and are declared before `:id`
   * on the backend (see `ProductsController`), exactly like Reportería's
   * own export routes — `responseType: 'blob'` so `downloadBlob()` can
   * trigger a real save, mirroring `ReportsService`'s export methods.
   *
   * Only defined filter keys are ever sent — `HttpParams` stringifies an
   * `undefined` value as the literal text `"undefined"` instead of omitting
   * it, which the backend's `@IsUUID()`/`@IsString()` validators would then
   * reject with a 400 (this exact mistake was already made and fixed once
   * in `QuotationsService.getQuotations()` — building the params object
   * explicitly here from the start avoids repeating it).
   */
  private toExportParams(filters: ProductExportFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.search) params['search'] = filters.search;
    if (filters.categoryId) params['categoryId'] = filters.categoryId;
    if (filters.businessId) params['businessId'] = filters.businessId;
    return params;
  }

  exportProductsPdf(filters: ProductExportFilters): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/products/export/pdf`, {
      params: this.toExportParams(filters),
      responseType: 'blob',
    });
  }

  exportProductsExcel(filters: ProductExportFilters): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/products/export/excel`, {
      params: this.toExportParams(filters),
      responseType: 'blob',
    });
  }
}
