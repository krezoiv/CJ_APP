import { Injectable, signal } from '@angular/core';

import { CashCount, CashDenomination, createEmptyCashCount } from '../models';

/**
 * Holds the Cuadre Agentes page's cash-count quantities in a root-provided
 * singleton — the same `providedIn: 'root'` + signals technique
 * `PurchaseDraftStore`/`SalesDraftStore`/the Reportería state services
 * already established for surviving component destruction on route
 * navigation. Deliberately in-memory only, no `sessionStorage`: this is
 * "primera etapa" per the ticket's own explicit instruction — there is no
 * real cuadre being persisted yet, only a scratch count the user is
 * building, so losing it on a hard reload (but not on navigating away and
 * back) is an acceptable, temporary trade-off for this stage.
 */
@Injectable({ providedIn: 'root' })
export class CuadreAgentesStateService {
  readonly cashCounts = signal<CashCount>(createEmptyCashCount());

  setCount(denomination: CashDenomination, quantity: number): void {
    this.cashCounts.update((counts) => ({ ...counts, [denomination]: quantity }));
  }

  /**
   * Second stage — called only after a successful "Guardar Cuadre". Only
   * clears this temporary in-memory state; the historical record is
   * already saved in `agent_reconciliations` before this runs, so it
   * never deletes anything persisted.
   */
  reset(): void {
    this.cashCounts.set(createEmptyCashCount());
  }
}
