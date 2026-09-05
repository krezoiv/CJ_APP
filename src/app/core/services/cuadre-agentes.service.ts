import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AgentReconciliation,
  ApiSuccessResponse,
  BankBalancesValidation,
  CuadreAgentesSummary,
  DayStatus,
  RegisterAgentReconciliationInput,
} from '../models';

const BASE_URL = `${environment.apiUrl}/banks`;
const RECONCILIATIONS_URL = `${environment.apiUrl}/agent-reconciliations`;

@Injectable({ providedIn: 'root' })
export class CuadreAgentesService {
  private readonly http = inject(HttpClient);

  getSummary(): Observable<CuadreAgentesSummary> {
    return this.http
      .get<ApiSuccessResponse<CuadreAgentesSummary>>(`${BASE_URL}/cuadre-agentes-summary`)
      .pipe(map((response) => response.data));
  }

  /** Second stage — "Guardar Cuadre". Only `totalCash` travels to the backend; every other total and the result are always recomputed by the server. */
  registerReconciliation(input: RegisterAgentReconciliationInput): Observable<AgentReconciliation> {
    return this.http
      .post<ApiSuccessResponse<AgentReconciliation>>(RECONCILIATIONS_URL, input)
      .pipe(map((response) => response.data));
  }

  /**
   * "Were this date's bank balances saved?" — the pre-check that
   * enables/blocks "Guardar Cuadre" on screen. UX only:
   * `registerReconciliation` enforces this again independently on the
   * backend before saving.
   */
  validateBankBalances(date?: string): Observable<BankBalancesValidation> {
    return this.http
      .get<ApiSuccessResponse<BankBalancesValidation>>(`${BASE_URL}/balances/validation`, {
        params: date ? { date } : {},
      })
      .pipe(map((response) => response.data));
  }

  /** "Is the day open? Were balances saved? Can Cuadre Agentes be entered?" — the four questions of the mandatory sequence in one call. */
  getDayStatus(date?: string): Observable<DayStatus> {
    return this.http
      .get<ApiSuccessResponse<DayStatus>>(`${BASE_URL}/day-status`, { params: date ? { date } : {} })
      .pipe(map((response) => response.data));
  }

  /** "Confirmar Apertura" — idempotent on the backend, so calling it twice never fails or duplicates anything. */
  openDay(date?: string): Observable<DayStatus> {
    return this.http
      .post<ApiSuccessResponse<DayStatus>>(`${BASE_URL}/day-status/open`, date ? { date } : {})
      .pipe(map((response) => response.data));
  }
}
