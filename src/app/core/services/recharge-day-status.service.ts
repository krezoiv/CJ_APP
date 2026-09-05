import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { RechargeDayStatus } from '../models';
import { RechargesService } from './recharges.service';

/**
 * Shared "is today's Recargas day open?" state — a `providedIn: 'root'`
 * singleton, same pattern as `DayStatusService` (Bancos/Cuadre Agentes),
 * fully independent from it: separate backend table, separate lifecycle,
 * never shares state with Bancos' own day-opening.
 *
 * Always represents TODAY — `RechargesPageComponent` has its own
 * `pastDateStatus` signal for browsing a non-today date, mirroring
 * `BankAgentsPageComponent`'s identical pattern.
 */
@Injectable({ providedIn: 'root' })
export class RechargeDayStatusService {
  private readonly rechargesService = inject(RechargesService);

  readonly status = signal<RechargeDayStatus | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.rechargesService.getDayStatus().subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: () => {
        // A network failure must not leave stale state around — treat it
        // as "not available yet", never as "yes, allowed".
        this.status.set(null);
        this.loading.set(false);
      },
    });
  }

  openDay(): Observable<RechargeDayStatus> {
    return this.rechargesService.openDay().pipe(tap((status) => this.status.set(status)));
  }

  closeDay(): Observable<RechargeDayStatus> {
    return this.rechargesService.closeDay().pipe(tap((status) => this.status.set(status)));
  }
}
