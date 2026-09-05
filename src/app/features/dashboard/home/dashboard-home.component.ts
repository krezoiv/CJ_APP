import { AsyncPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of } from 'rxjs';

import { DashboardMetrics, DashboardSummaryItem, formatQuantity } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { BankDepositService } from '../../../core/services/bank-deposit.service';
import { DashboardMetricsService } from '../../../core/services/dashboard-metrics.service';
import { DashboardSummaryService } from '../../../core/services/dashboard-summary.service';
import { CardComponent, IconComponent } from '../../../shared/ui';
import { FinancialIndicatorsComponent } from './components/financial-indicators/financial-indicators.component';

/** Every card is still mock (see `DASHBOARD_SUMMARY`'s own doc comment) EXCEPT this one, which "Bancos" is overridden to. */
const BANCOS_CARD_ID = 'bancos';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink, CardComponent, IconComponent, FinancialIndicatorsComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  private readonly authService = inject(AuthService);
  private readonly summaryService = inject(DashboardSummaryService);
  private readonly bankDepositService = inject(BankDepositService);
  private readonly dashboardMetricsService = inject(DashboardMetricsService);

  readonly currentUser = this.authService.currentUser;
  readonly isAdmin = this.authService.isAdmin;
  readonly today = signal(new Date());

  /**
   * Every card still comes from the mock `DASHBOARD_SUMMARY` array except
   * "Bancos", whose `value`/`description` are overridden here with the real,
   * live `GET /bank-deposits/monthly-count` figure — "Total de Transacciones"
   * for whatever the current calendar month is, resetting on its own the
   * moment the month rolls over (nothing stored/reset client-side).
   * `catchError` falls back to the mock card unmodified on a network failure
   * — this is the app's own landing page, reached by every authenticated
   * account on login, so a transient API error here must never break the
   * whole Resumen screen.
   */
  readonly summary$ = combineLatest([
    this.summaryService.getSummary(),
    this.bankDepositService.getMonthlyCount().pipe(catchError(() => of(null))),
  ]).pipe(
    map(([items, monthlyCount]) =>
      items.map((item): DashboardSummaryItem =>
        item.id === BANCOS_CARD_ID && monthlyCount
          ? { ...item, value: formatQuantity(monthlyCount.count), description: 'Total de Transacciones este mes' }
          : item,
      ),
    ),
  );

  /**
   * `Ventas de Recargas`/`Ventas`/`Compras`/`Transacciones Bancarias` —
   * admin-only real financial data (see the backend `CLAUDE.md`'s
   * "Dashboard" section), so this is only ever fetched when
   * `AuthService.isAdmin` is `true`; a `USER`-role account never issues this
   * request at all (the backend's own `@Roles` guard is the real
   * enforcement regardless). `catchError` falls back to `null` — a
   * transient failure here hides this one section rather than breaking
   * the whole Resumen page.
   */
  readonly financialMetrics = signal<DashboardMetrics | null>(null);
  readonly loadingFinancialMetrics = signal(false);

  constructor() {
    if (this.isAdmin()) {
      this.loadingFinancialMetrics.set(true);
      this.dashboardMetricsService
        .getSummary()
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('No se pudieron cargar los indicadores del mes.', error);
            return of(null);
          }),
        )
        .subscribe((metrics) => {
          this.financialMetrics.set(metrics);
          this.loadingFinancialMetrics.set(false);
        });
    }
  }
}
