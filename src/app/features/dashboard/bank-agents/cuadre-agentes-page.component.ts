import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  BankBalancesValidation,
  CASH_DENOMINATIONS,
  CashDenomination,
  CuadreAgentesSummary,
  CuadreResultStatus,
  calculateCuadreResult,
  calculateTotalCash,
  decimalPlacesFor,
  formatCurrency,
  formatQuantity,
  getCuadreResultStatus,
} from '../../../core/models';
import { CuadreAgentesService } from '../../../core/services/cuadre-agentes.service';
import { CuadreAgentesStateService } from '../../../core/services/cuadre-agentes-state.service';
import { DayStatusService } from '../../../core/services/day-status.service';
import { BankBalanceDraftStore } from '../../../core/services/bank-balance-draft.store';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { ButtonComponent, CardComponent, IconComponent } from '../../../shared/ui';
import { DecimalInputDirective } from '../../../shared/directives/decimal-input.directive';
import { AgentReconciliationConfirmModalComponent } from './components/agent-reconciliation-confirm-modal/agent-reconciliation-confirm-modal.component';

const STATUS_ICON: Record<CuadreResultStatus, string> = {
  negative: 'x-circle',
  zero: 'check-circle',
  positive: 'alert-circle',
};

const STATUS_TEXT: Record<CuadreResultStatus, string> = {
  negative: 'Resultado negativo',
  zero: 'Cuadre exacto',
  positive: 'Resultado positivo',
};

/** Local-time `yyyy-MM-dd`, no UTC-offset dance — same technique every other date-driven page in this app already uses (Recargas, Reports, Bancos). */
function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * "Cuadre Agentes" — second stage: adds the Resumen del Cuadre (with the
 * live result, colored by its sign) and "Guardar Cuadre", which persists
 * a historical record to `agent_reconciliations` via
 * `POST /agent-reconciliations`. The backend recomputes
 * `totalBanks`/`totalAssets`/`totalAccountsReceivable`/`result`
 * independently on save — only `totalCash` actually travels as this
 * frontend's own decision (see `CreateAgentReconciliationUseCase`); the
 * value shown here before saving is just a live preview, the same
 * pattern already established in `SalesSummaryCardComponent`.
 *
 * The cash count is held in `CuadreAgentesStateService` (a
 * `providedIn: 'root'` singleton, the same pattern as `PurchaseDraftStore`/
 * Reportería's own state services) so it survives navigation within the
 * dashboard without needing `sessionStorage` yet — see that service's
 * own comment.
 *
 * **Operation date**: this screen has no date picker of its own — it reads
 * `BankBalanceDraftStore.operationDate()`, the exact same signal Bancos'
 * own date picker writes, so both screens always work the same date. This
 * fixes a real bug: before this, every call here silently omitted a date
 * and let the backend default to server "today", completely disconnected
 * from whatever date Bancos had actually saved balances for. `getSummary()`
 * deliberately stays date-agnostic — `GetCuadreAgentesSummaryUseCase` is
 * wired to each bank's static `banks.final_balance` column, not to a
 * specific date's `bank_balances` row, by an earlier, separate ticket.
 */
@Component({
  selector: 'app-cuadre-agentes-page',
  standalone: true,
  imports: [
    DatePipe,
    CardComponent,
    IconComponent,
    ButtonComponent,
    DecimalInputDirective,
    AgentReconciliationConfirmModalComponent,
    RouterLink,
  ],
  templateUrl: './cuadre-agentes-page.component.html',
  styleUrl: './cuadre-agentes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuadreAgentesPageComponent {
  private readonly cuadreAgentesService = inject(CuadreAgentesService);
  private readonly state = inject(CuadreAgentesStateService);
  protected readonly dayStatusService = inject(DayStatusService);
  protected readonly draft = inject(BankBalanceDraftStore);
  private readonly notificationService = inject(NotificationService);

  readonly maxSelectableDate = todayIsoDate();
  /** Whether the shared operation date (set from Bancos) is today — drives the "not working on today" warning banner. */
  readonly isTodayOperationDate = computed(() => this.draft.operationDate() === this.maxSelectableDate);

  readonly denominations = CASH_DENOMINATIONS;
  readonly cashCounts = this.state.cashCounts;
  readonly decimalPlacesFor = decimalPlacesFor;

  readonly summary = signal<CuadreAgentesSummary | null>(null);
  readonly loading = signal(true);

  readonly isConfirmModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly isRefreshingBanks = signal(false);

  /**
   * "Were this date's bank balances saved?" — the rule that blocks
   * "Guardar Cuadre" until a daily cuadre exists in Agentes Bancarios →
   * Bancos for the same date (always "today" in this module, which has
   * no date selector of its own). `null` while the answer isn't known
   * yet (initial load); in that state the save button also stays
   * disabled — never defaults to "yes, allowed".
   */
  readonly bankBalancesValidation = signal<BankBalancesValidation | null>(null);
  readonly isValidatingBankBalances = signal(true);

  /** "Apertura del Día" — `DayStatusService` is the singleton shared with Bancos/Sidebar; reflects whether TODAY is already open. */
  readonly dayOpened = computed(() => this.dayStatusService.status()?.isOpened === true);

  /** "Cierre del Día" — once the cuadre is saved, TODAY is closed and blocked for a new cycle until the date changes. */
  readonly dayClosed = computed(() => this.dayStatusService.status()?.isClosed === true);

  /** `denomination × count`, summed across every row — recomputes on its own, no button needed, every time `cashCounts` changes. */
  readonly totalCash = computed(() => calculateTotalCash(this.cashCounts()));

  /** Cash + Banks + AccountsReceivable − Assets — live, no button needed, same as Recargas' own preview. */
  readonly resultCuadre = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return 0;
    }
    return calculateCuadreResult(
      this.totalCash(),
      summary.totalBanks,
      summary.totalAccountsReceivable,
      summary.totalAssets,
    );
  });

  readonly resultStatus = computed<CuadreResultStatus>(() => getCuadreResultStatus(this.resultCuadre()));
  readonly resultIcon = computed(() => STATUS_ICON[this.resultStatus()]);
  readonly resultText = computed(() => STATUS_TEXT[this.resultStatus()]);

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;

  constructor() {
    this.fetchSummary();
    this.validateBankBalances();
  }

  /**
   * Runs automatically on entering the module (constructor) — Angular
   * destroys and recreates this component on every navigation to this
   * route, so "Ir a registrar saldos" → save in Bancos → come back here
   * already triggers this same call again with no extra code needed
   * ("no manual browser reload required").
   */
  private validateBankBalances(): void {
    this.isValidatingBankBalances.set(true);
    this.cuadreAgentesService.validateBankBalances(this.draft.operationDate()).subscribe({
      next: (validation) => {
        this.bankBalancesValidation.set(validation);
        this.isValidatingBankBalances.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isValidatingBankBalances.set(false);
        this.notificationService.error(
          extractErrorMessage(error, 'No se pudo verificar si los saldos bancarios ya fueron registrados.')
        );
      },
    });
  }

  private fetchSummary(): void {
    this.loading.set(true);
    this.cuadreAgentesService.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(
          extractErrorMessage(error, 'No se pudo cargar el resumen de Cuadre Agentes.')
        );
      },
    });
  }

  /**
   * "Actualizar Saldos" — re-reads the same read-only endpoint
   * (`GET /banks/cuadre-agentes-summary`) `fetchSummary` already uses,
   * without touching the `loading` signal that controls the initial
   * loading skeleton: the previously shown banks/totals stay visible
   * while the request is in flight, and remain intact if it fails. Never
   * reads or writes `CuadreAgentesStateService` — the cash count is a
   * completely separate piece of state this refresh has no reason to
   * touch.
   *
   * Also blocked while `isSaving()` is in progress — without this, a
   * refresh triggered right before or during "Guardar Cuadre" could
   * respond *after* `confirmSaveCuadre()`'s own refetch and leave the
   * previous summary on screen, giving the false impression that the
   * save had no effect.
   */
  refreshBankSummary(): void {
    if (this.isRefreshingBanks() || this.isSaving()) {
      return;
    }
    this.isRefreshingBanks.set(true);
    this.cuadreAgentesService.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.isRefreshingBanks.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isRefreshingBanks.set(false);
        this.notificationService.error(
          extractErrorMessage(error, 'No fue posible actualizar los saldos. Intente nuevamente.')
        );
      },
    });
  }

  rowTotal(denomination: CashDenomination): number {
    return denomination * (this.cashCounts()[denomination] || 0);
  }

  /**
   * The `appDecimalInput` directive already rejects at the keystroke
   * level whatever doesn't match each row's allowed decimal places (0
   * for Q200–Q5, 2 for Q1) — this only shapes the final string to that
   * same decimal count before saving it, so a pasted value can't sneak
   * in with more precision than allowed.
   */
  onQuantityInput(denomination: CashDenomination, value: string): void {
    const trimmed = value.trim();
    if (trimmed === '') {
      this.state.setCount(denomination, 0);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      this.state.setCount(denomination, 0);
      return;
    }
    const decimals = decimalPlacesFor(denomination);
    const rounded = decimals === 0 ? Math.trunc(parsed) : Math.round(parsed * 100) / 100;
    this.state.setCount(denomination, rounded);
  }

  /** Never opens the confirmation modal if the backend's pre-check hasn't yet confirmed this date can be reconciled — see `canSaveCuadre`. */
  openConfirmModal(): void {
    if (!this.canSaveCuadre()) {
      return;
    }
    this.isConfirmModalOpen.set(true);
  }

  /**
   * Combines every reason "Guardar Cuadre" must stay disabled, including
   * the mandatory rule: no reconciling without bank balances saved for
   * this date. The backend (`CreateAgentReconciliationUseCase`) enforces
   * exactly this again independently — this computed is UX only, never
   * the real barrier.
   */
  readonly canSaveCuadre = computed(
    () =>
      !!this.summary() &&
      !this.isSaving() &&
      !this.isRefreshingBanks() &&
      !this.isValidatingBankBalances() &&
      !this.dayStatusService.loading() &&
      this.dayOpened() &&
      !this.dayClosed() &&
      this.bankBalancesValidation()?.canReconcile === true,
  );

  /** The whole page enabled — same conditions as `canSaveCuadre` minus `isSaving`/`isRefreshingBanks`, which don't prevent VIEWING the content, only saving it. */
  readonly canAccessReconciliation = computed(
    () =>
      !this.loading() &&
      !this.isValidatingBankBalances() &&
      !this.dayStatusService.loading() &&
      this.dayOpened() &&
      !this.dayClosed() &&
      this.bankBalancesValidation()?.canReconcile === true,
  );

  readonly isCheckingAccess = computed(
    () => this.loading() || this.isValidatingBankBalances() || this.dayStatusService.loading(),
  );

  /** Resets the SHARED operation date back to today — also clears Bancos' own in-progress saldo-final drafts (`BankBalanceDraftStore.setOperationDate`'s own rule: switching dates is always a clean slate, never a merge). */
  resetToToday(): void {
    this.draft.setOperationDate(this.maxSelectableDate);
    this.fetchSummary();
    this.validateBankBalances();
  }

  cancelConfirm(): void {
    if (this.isSaving()) {
      return;
    }
    this.isConfirmModalOpen.set(false);
  }

  /**
   * "Guardar Cuadre" now also closes the day — a single atomic call on
   * the backend (`CloseAgentDayUseCase`/`close_agent_day`).
   * `dayStatusService.refresh()` is what makes the Sidebar and this same
   * page react immediately: `dayClosed()`'s next `computed` turns `true`
   * with no browser reload, and the page falls into the "Día Cerrado"
   * branch of the template on its own.
   */
  confirmSaveCuadre(): void {
    if (this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.cuadreAgentesService
      .registerReconciliation({ totalCash: this.totalCash(), date: this.draft.operationDate() })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isConfirmModalOpen.set(false);
          // Only clears the temporary in-memory cash count — the
          // historical record is already saved in `agent_reconciliations`.
          this.state.reset();
          this.notificationService.success(
            'El cuadre fue guardado y el día fue cerrado exitosamente. El sistema está listo para iniciar el siguiente ciclo de cuadre.',
          );
          this.dayStatusService.refresh();
          this.fetchSummary();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo guardar el Cuadre Agentes.'));
        },
      });
  }
}
