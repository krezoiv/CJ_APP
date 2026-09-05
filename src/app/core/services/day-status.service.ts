import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { DayStatus } from '../models';
import { CuadreAgentesService } from './cuadre-agentes.service';

/**
 * Shared "is today's day open?" state — a `providedIn: 'root'` singleton,
 * same pattern as `PurchaseDraftStore`/`SalesDraftStore` (see those
 * files), so the Sidebar (mounted once for all of `/dashboard/*`) and
 * the Bancos page (destroyed and recreated on every navigation) read and
 * write exactly the same signal. This is what makes saving balances or
 * opening the day in Bancos update the Cuadre Agentes sidebar link
 * immediately, with no page reload — the same mechanism Ventas/Compras'
 * own "draft in progress" indicator dots already use.
 *
 * Always represents TODAY — Cuadre Agentes has no date selector of its
 * own, and this ticket's mandatory sequence is explicitly about "the
 * current day", not an arbitrary date.
 */
@Injectable({ providedIn: 'root' })
export class DayStatusService {
  private readonly cuadreAgentesService = inject(CuadreAgentesService);

  readonly status = signal<DayStatus | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.cuadreAgentesService.getDayStatus().subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: () => {
        // A network failure must not leave the previous state lying
        // around — with no reliable data, everything that depends on
        // this (Sidebar, gates) must treat it as "not available yet",
        // never as "yes, allowed".
        this.status.set(null);
        this.loading.set(false);
      },
    });
  }

  openDay(): Observable<DayStatus> {
    return this.cuadreAgentesService.openDay().pipe(tap((status) => this.status.set(status)));
  }
}
