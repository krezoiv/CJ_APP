import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { BankOperation } from '../models';
import { BANK_OPERATIONS, BANK_TRUST_POINTS } from '../data';

/**
 * Backs the public landing page's "Agente Bancario" marketing section
 * (`features/landing/sections/bank-agents/`) — static service-offering
 * copy (deposits, withdrawals, bill pay...), unrelated to the internal
 * "Agentes Bancarios" → Cuadre Agentes admin module (`BankService`/
 * `BankBalanceService`/`CuadreAgentesService`) despite the similar name.
 * Phase 2: replace the `of(...)` bodies with calls to
 * `${environment.apiUrl}/bank-agent/*`.
 */
@Injectable({ providedIn: 'root' })
export class BankAgentService {
  getOperations(): Observable<BankOperation[]> {
    return of(BANK_OPERATIONS);
  }

  getTrustPoints() {
    return of(BANK_TRUST_POINTS);
  }
}
