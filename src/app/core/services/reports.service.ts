import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AgentReconciliationsReportFilters,
  AgentReconciliationsReportRow,
  AgentReconciliationsReportSummary,
  ApiSuccessResponse,
  AssetsReceivablesReportFilters,
  BankDepositOperationSummary,
  BankDepositsReportFilters,
  BankDepositsReportSummary,
  AssetsReceivablesReportRow,
  AssetsReceivablesReportSummary,
  IceCreamReportFilters,
  IceCreamReportRow,
  IceCreamReportSummary,
  PaginatedReport,
  PurchaseReportDetail,
  PurchasesByProductRow,
  PurchasesReportFilters,
  PurchasesReportRow,
  PurchasesReportSummary,
  RechargeDailyBalance,
  RechargesReportFilters,
  RechargesReportSummary,
  SaleReportDetail,
  SalesByProductRow,
  SalesReportFilters,
  SalesReportRow,
  SalesReportSummary,
} from '../models';

const BASE_URL = `${environment.apiUrl}/reports`;

/** Drops `undefined`/empty-string values — `HttpParams` would otherwise send the literal string `"undefined"` as a query value. An array value (e.g. `types`) stringifies via `Array.prototype.toString` into a comma-separated list, exactly what the backend's `types=a,b` convention expects. */
function toParams(filters: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  getSalesReport(filters: SalesReportFilters): Observable<PaginatedReport<SalesReportRow>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<SalesReportRow>>>(`${BASE_URL}/sales`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getSalesReportSummary(filters: SalesReportFilters): Observable<SalesReportSummary> {
    return this.http
      .get<ApiSuccessResponse<SalesReportSummary>>(`${BASE_URL}/sales/summary`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getSalesByProductReport(filters: SalesReportFilters): Observable<PaginatedReport<SalesByProductRow>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<SalesByProductRow>>>(`${BASE_URL}/sales/by-product`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getSaleReportDetail(id: string): Observable<SaleReportDetail> {
    return this.http
      .get<ApiSuccessResponse<SaleReportDetail>>(`${BASE_URL}/sales/${id}`)
      .pipe(map((response) => response.data));
  }

  /** `responseType: 'blob'` — the backend streams a raw PDF, not the usual `{ success, data }` JSON envelope. */
  exportSalesReportPdf(filters: SalesReportFilters): Observable<Blob> {
    return this.http.get(`${BASE_URL}/sales/export`, {
      params: toParams(filters),
      responseType: 'blob',
    });
  }

  getPurchasesReport(filters: PurchasesReportFilters): Observable<PaginatedReport<PurchasesReportRow>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<PurchasesReportRow>>>(`${BASE_URL}/purchases`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getPurchasesReportSummary(filters: PurchasesReportFilters): Observable<PurchasesReportSummary> {
    return this.http
      .get<ApiSuccessResponse<PurchasesReportSummary>>(`${BASE_URL}/purchases/summary`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getPurchasesByProductReport(
    filters: PurchasesReportFilters,
  ): Observable<PaginatedReport<PurchasesByProductRow>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<PurchasesByProductRow>>>(`${BASE_URL}/purchases/by-product`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getPurchaseReportDetail(id: string): Observable<PurchaseReportDetail> {
    return this.http
      .get<ApiSuccessResponse<PurchaseReportDetail>>(`${BASE_URL}/purchases/${id}`)
      .pipe(map((response) => response.data));
  }

  exportPurchasesReportPdf(filters: PurchasesReportFilters): Observable<Blob> {
    return this.http.get(`${BASE_URL}/purchases/export`, {
      params: toParams(filters),
      responseType: 'blob',
    });
  }

  getRechargesReport(filters: RechargesReportFilters): Observable<PaginatedReport<RechargeDailyBalance>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<RechargeDailyBalance>>>(`${BASE_URL}/recharges`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getRechargesReportSummary(filters: RechargesReportFilters): Observable<RechargesReportSummary> {
    return this.http
      .get<ApiSuccessResponse<RechargesReportSummary>>(`${BASE_URL}/recharges/summary`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  exportRechargesReportPdf(filters: RechargesReportFilters): Observable<Blob> {
    return this.http.get(`${BASE_URL}/recharges/export`, {
      params: toParams(filters),
      responseType: 'blob',
    });
  }

  getAgentReconciliationsReport(
    filters: AgentReconciliationsReportFilters,
  ): Observable<PaginatedReport<AgentReconciliationsReportRow>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<AgentReconciliationsReportRow>>>(
        `${BASE_URL}/agent-reconciliations`,
        { params: toParams(filters) },
      )
      .pipe(map((response) => response.data));
  }

  getAgentReconciliationsReportSummary(
    filters: AgentReconciliationsReportFilters,
  ): Observable<AgentReconciliationsReportSummary> {
    return this.http
      .get<ApiSuccessResponse<AgentReconciliationsReportSummary>>(
        `${BASE_URL}/agent-reconciliations/summary`,
        { params: toParams(filters) },
      )
      .pipe(map((response) => response.data));
  }

  exportAgentReconciliationsReportPdf(filters: AgentReconciliationsReportFilters): Observable<Blob> {
    return this.http.get(`${BASE_URL}/agent-reconciliations/export`, {
      params: toParams(filters),
      responseType: 'blob',
    });
  }

  getBankDepositsReport(
    filters: BankDepositsReportFilters,
  ): Observable<PaginatedReport<BankDepositOperationSummary>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<BankDepositOperationSummary>>>(`${BASE_URL}/bank-deposits`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getBankDepositsReportSummary(filters: BankDepositsReportFilters): Observable<BankDepositsReportSummary> {
    return this.http
      .get<ApiSuccessResponse<BankDepositsReportSummary>>(`${BASE_URL}/bank-deposits/summary`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  exportBankDepositsReportPdf(filters: BankDepositsReportFilters): Observable<Blob> {
    return this.http.get(`${BASE_URL}/bank-deposits/export`, {
      params: toParams(filters),
      responseType: 'blob',
    });
  }

  /** Unified Reportería de Activos y Cuentas por Cobrar — `filters.types` selects one or both tables (`assets`, `accounts_receivable`), matching `AssetsReceivablesReportController`'s checkbox-driven `types` query param. Replaces the former separate accounts-receivable/assets report endpoints. */
  getAssetsReceivablesReport(
    filters: AssetsReceivablesReportFilters,
  ): Observable<PaginatedReport<AssetsReceivablesReportRow>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<AssetsReceivablesReportRow>>>(`${BASE_URL}/assets-receivables`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getAssetsReceivablesReportSummary(
    filters: AssetsReceivablesReportFilters,
  ): Observable<AssetsReceivablesReportSummary> {
    return this.http
      .get<ApiSuccessResponse<AssetsReceivablesReportSummary>>(`${BASE_URL}/assets-receivables/summary`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  exportAssetsReceivablesReportPdf(filters: AssetsReceivablesReportFilters): Observable<Blob> {
    return this.http.get(`${BASE_URL}/assets-receivables/export`, {
      params: toParams(filters),
      responseType: 'blob',
    });
  }

  /** Unified Reportería de Heladería — `filters.types` selects one or both movements (`sales`, `purchases`), matching `IceCreamReportController`'s checkbox-driven `types` query param. Replaces the former separate ice-cream-sales/ice-cream-purchases report endpoints. */
  getIceCreamReport(filters: IceCreamReportFilters): Observable<PaginatedReport<IceCreamReportRow>> {
    return this.http
      .get<ApiSuccessResponse<PaginatedReport<IceCreamReportRow>>>(`${BASE_URL}/ice-cream`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getIceCreamReportSummary(filters: IceCreamReportFilters): Observable<IceCreamReportSummary> {
    return this.http
      .get<ApiSuccessResponse<IceCreamReportSummary>>(`${BASE_URL}/ice-cream/summary`, {
        params: toParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  exportIceCreamReportPdf(filters: IceCreamReportFilters): Observable<Blob> {
    return this.http.get(`${BASE_URL}/ice-cream/export`, {
      params: toParams(filters),
      responseType: 'blob',
    });
  }
}
