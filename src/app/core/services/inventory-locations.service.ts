import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiSuccessResponse,
  CreatePresentationInput,
  InventoryLocation,
  ProductInventoryDetail,
  ProductPresentation,
  TransferInventoryInput,
  UpdatePresentationInput,
} from '../models';

/**
 * Talks to `${environment.apiUrl}/inventory` — locations, per-product
 * presentations, the aggregated product-inventory detail view, and
 * transfers. Named separately from `InventoryService` (which owns
 * `/products`) since this is a distinct backend module (`modules/inventory/`)
 * with its own resource; nothing here duplicates `InventoryService`.
 */
@Injectable({ providedIn: 'root' })
export class InventoryLocationsService {
  private readonly http = inject(HttpClient);

  getLocations(): Observable<InventoryLocation[]> {
    return this.http
      .get<ApiSuccessResponse<InventoryLocation[]>>(`${environment.apiUrl}/inventory/locations`)
      .pipe(map((response) => response.data));
  }

  getPresentations(productId: string): Observable<ProductPresentation[]> {
    return this.http
      .get<ApiSuccessResponse<ProductPresentation[]>>(
        `${environment.apiUrl}/inventory/products/${productId}/presentations`,
      )
      .pipe(map((response) => response.data));
  }

  createPresentation(
    productId: string,
    input: CreatePresentationInput,
  ): Observable<ProductPresentation> {
    return this.http
      .post<ApiSuccessResponse<ProductPresentation>>(
        `${environment.apiUrl}/inventory/products/${productId}/presentations`,
        input,
      )
      .pipe(map((response) => response.data));
  }

  updatePresentation(
    presentationId: string,
    input: UpdatePresentationInput,
  ): Observable<ProductPresentation> {
    return this.http
      .patch<ApiSuccessResponse<ProductPresentation>>(
        `${environment.apiUrl}/inventory/presentations/${presentationId}`,
        input,
      )
      .pipe(map((response) => response.data));
  }

  getProductInventory(productId: string): Observable<ProductInventoryDetail> {
    return this.http
      .get<ApiSuccessResponse<ProductInventoryDetail>>(
        `${environment.apiUrl}/inventory/products/${productId}`,
      )
      .pipe(map((response) => response.data));
  }

  registerTransfer(input: TransferInventoryInput): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<{ id: string }>>(`${environment.apiUrl}/inventory/transfers`, input)
      .pipe(map(() => undefined));
  }

  /** Admin-only threshold the Alerts module reads for "inventario bajo" — `0` means "no threshold configured". */
  setMinStock(productId: string, locationId: string, minStock: number): Observable<void> {
    return this.http
      .patch<ApiSuccessResponse<unknown>>(
        `${environment.apiUrl}/inventory/products/${productId}/locations/${locationId}/min-stock`,
        { minStock },
      )
      .pipe(map(() => undefined));
  }
}
