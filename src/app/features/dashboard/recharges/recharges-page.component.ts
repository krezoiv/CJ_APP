import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { RechargeDailyBalance, RechargeDayStatus, RechargeSale, RechargeType, SimDailyStock, SimType, formatCurrency } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RechargesService } from '../../../core/services/recharges.service';
import { RechargeSimsService } from '../../../core/services/recharge-sims.service';
import { RechargeDayStatusService } from '../../../core/services/recharge-day-status.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { RechargeTableComponent, RequestFinalBalanceEvent } from './components/recharge-table/recharge-table.component';
import { RegisterPurchaseFormComponent } from './components/register-purchase-form/register-purchase-form.component';
import { FinalBalanceConfirmModalComponent } from './components/final-balance-confirm-modal/final-balance-confirm-modal.component';
import { SalesSummaryCardComponent } from './components/sales-summary-card/sales-summary-card.component';
import { RechargeSalesTableComponent } from './components/recharge-sales-table/recharge-sales-table.component';
import { RechargeSaleFormModalComponent } from './components/recharge-sale-form-modal/recharge-sale-form-modal.component';
import { RechargeSaleDeleteConfirmModalComponent } from './components/recharge-sale-delete-confirm-modal/recharge-sale-delete-confirm-modal.component';
import { RechargeEntryConfirmModalComponent } from './components/recharge-entry-confirm-modal/recharge-entry-confirm-modal.component';
import { CloseRechargeDayConfirmModalComponent } from './components/close-recharge-day-confirm-modal/close-recharge-day-confirm-modal.component';
import { SimStockTableComponent } from './components/sim-stock-table/sim-stock-table.component';
import { RegisterSimPurchaseFormComponent } from './components/register-sim-purchase-form/register-sim-purchase-form.component';
import { RegisterSimSaleFormComponent } from './components/register-sim-sale-form/register-sim-sale-form.component';
import { ButtonComponent, CardComponent, IconComponent } from '../../../shared/ui';

/** Local-time `yyyy-MM-dd`, no UTC-offset dance — same technique as Reports' own `todayIsoDate()`. */
function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-recharges-page',
  standalone: true,
  imports: [
    RechargeTableComponent,
    RegisterPurchaseFormComponent,
    FinalBalanceConfirmModalComponent,
    SalesSummaryCardComponent,
    RechargeSalesTableComponent,
    RechargeSaleFormModalComponent,
    RechargeSaleDeleteConfirmModalComponent,
    RechargeEntryConfirmModalComponent,
    CloseRechargeDayConfirmModalComponent,
    SimStockTableComponent,
    RegisterSimPurchaseFormComponent,
    RegisterSimSaleFormComponent,
    CardComponent,
    ButtonComponent,
    IconComponent,
  ],
  templateUrl: './recharges-page.component.html',
  styleUrl: './recharges-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargesPageComponent {
  private readonly rechargesService = inject(RechargesService);
  private readonly simsService = inject(RechargeSimsService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly dayStatusService = inject(RechargeDayStatusService);

  /** Re-editing an already-closed day is admin-only — same rule the backend enforces server-side. */
  readonly isAdmin = this.authService.isAdmin;

  /** `yyyy-MM-dd` — defaults to today; the whole page (table, compra, cuadre) is scoped to whichever date this holds. */
  readonly operationDate = signal(todayIsoDate());
  readonly maxSelectableDate = todayIsoDate();

  readonly isTodayOperationDate = computed(() => this.operationDate() === this.maxSelectableDate);

  /**
   * "Apertura del Día"/"Cerrar Día" para Recargas — fully independent from
   * Bancos' own day-lifecycle (`DayStatusService`), same pattern though:
   * for TODAY, `RechargeDayStatusService` (a singleton shared with the
   * Sidebar) is the source of truth; for a past date, this page makes its
   * own separate query, since the singleton only ever represents "today".
   */
  readonly pastDateStatus = signal<RechargeDayStatus | null>(null);

  readonly activeDayStatus = computed<RechargeDayStatus | null>(() =>
    this.isTodayOperationDate() ? this.dayStatusService.status() : this.pastDateStatus(),
  );

  readonly effectiveDayClosed = computed(() => this.activeDayStatus()?.isClosed === true);

  /**
   * The actual gate: for today, only once `RechargeDayStatusService`
   * confirms the day is already open; for any date (today or past), never
   * if that date was already closed via "Cerrar Día" — a closed day
   * doesn't accept new compras/ventas/cuadres, only an admin's "Reabrir
   * Día" unlocks it again.
   */
  readonly isEditingUnlocked = computed(
    () =>
      (!this.isTodayOperationDate() || this.dayStatusService.status()?.isOpened === true) &&
      !this.effectiveDayClosed(),
  );

  /**
   * WHY editing is locked, for accurate hint copy in the child components —
   * "closed" (needs an admin's "Reabrir Día") and "not_opened" (today only,
   * just needs "Confirmar Apertura") are different situations with
   * different fixes; collapsing them into one boolean would tell the user
   * to ask an admin to reopen a day that was never even opened yet.
   */
  readonly dayLockReason = computed<'closed' | 'not_opened' | null>(() => {
    if (this.isEditingUnlocked()) {
      return null;
    }
    return this.effectiveDayClosed() ? 'closed' : 'not_opened';
  });

  readonly isEntryConfirmModalOpen = signal(false);
  readonly isOpeningDay = signal(false);
  readonly isCloseDayConfirmModalOpen = signal(false);
  readonly isClosingDay = signal(false);

  private hasEvaluatedEntryGate = false;

  readonly types = signal<RechargeType[]>([]);
  readonly balances = signal<RechargeDailyBalance[]>([]);
  readonly loading = signal(true);

  /**
   * SIM Claro/SIM Tigo — physical, stock-tracked products, deliberately
   * fetched/rendered as a completely separate block from the electronic
   * balance above: own signals, own section in the template, never summed
   * or mixed with `balances`. Scoped to the exact same `operationDate()`
   * and gated by the exact same `dayLockReason()` — no new day-lifecycle
   * logic, just reusing what already exists.
   */
  readonly simTypes = signal<SimType[]>([]);
  readonly simStocks = signal<SimDailyStock[]>([]);
  readonly simLoading = signal(true);

  readonly simStockByTypeId = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const stock of this.simStocks()) {
      map[stock.simTypeId] = stock.currentStock;
    }
    return map;
  });

  readonly isFinalBalanceModalOpen = signal(false);
  readonly finalBalanceTarget = signal<RechargeDailyBalance | null>(null);
  readonly finalBalanceDraft = signal(0);
  readonly isSavingFinalBalance = signal(false);

  /** Bumped after a final-balance save OR any recarga-vendida create/edit/delete so `SalesSummaryCardComponent` refetches — those are the only actions that change a day's sale figures besides picking a different date. */
  readonly salesSummaryRefreshTick = signal(0);

  /** "Recargas Vendidas" — the individual customer top-ups for the current operation date, feeding the new table and (via `salesSummaryRefreshTick`) the Total Claro/Tigo/General cards. */
  readonly sales = signal<RechargeSale[]>([]);
  readonly salesLoading = signal(true);

  readonly isSaleModalOpen = signal(false);
  /** null = "+ Agregar Recarga" (create mode), a RechargeSale = editing that row. */
  readonly saleModalTarget = signal<RechargeSale | null>(null);

  readonly isDeleteSaleModalOpen = signal(false);
  readonly deleteSaleTarget = signal<RechargeSale | null>(null);
  readonly isDeletingSale = signal(false);

  constructor() {
    this.fetchAll();
    this.fetchPastDateStatusIfNeeded();

    // Opens the "Apertura del Día" modal the first time it's confirmed
    // (once `RechargeDayStatusService` is done loading) that today still
    // isn't open. Only acts once per instance of this component —
    // cancelling the modal must not make it reopen on its own; the user
    // decides when to retry via "Habilitar edición".
    effect(() => {
      const isToday = this.isTodayOperationDate();
      const loading = this.dayStatusService.loading();
      const status = this.dayStatusService.status();
      if (!isToday || loading || this.hasEvaluatedEntryGate) {
        return;
      }
      this.hasEvaluatedEntryGate = true;
      if (!status?.isOpened) {
        this.isEntryConfirmModalOpen.set(true);
      }
    });
  }

  confirmEntryModal(): void {
    if (this.isOpeningDay()) {
      return;
    }
    this.isOpeningDay.set(true);
    this.dayStatusService.openDay().subscribe({
      next: () => {
        this.isOpeningDay.set(false);
        this.isEntryConfirmModalOpen.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isOpeningDay.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo aperturar el día. Intente nuevamente.'));
      },
    });
  }

  cancelEntryModal(): void {
    if (this.isOpeningDay()) {
      return;
    }
    this.isEntryConfirmModalOpen.set(false);
  }

  /** The one re-entry point after cancelling the opening modal — shows it again, without navigating or reloading anything. */
  reopenEntryModal(): void {
    this.isEntryConfirmModalOpen.set(true);
  }

  openCloseDayModal(): void {
    this.isCloseDayConfirmModalOpen.set(true);
  }

  cancelCloseDayModal(): void {
    if (this.isClosingDay()) {
      return;
    }
    this.isCloseDayConfirmModalOpen.set(false);
  }

  confirmCloseDayModal(): void {
    if (this.isClosingDay()) {
      return;
    }
    this.isClosingDay.set(true);
    const close$ = this.isTodayOperationDate()
      ? this.dayStatusService.closeDay()
      : this.rechargesService.closeDay(this.operationDate());
    close$.subscribe({
      next: (status) => {
        this.isClosingDay.set(false);
        this.isCloseDayConfirmModalOpen.set(false);
        if (!this.isTodayOperationDate()) {
          this.pastDateStatus.set(status);
        }
        this.notificationService.success(`Día de recargas del ${status.date} cerrado correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isClosingDay.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cerrar el día.'));
      },
    });
  }

  /** Only queries for a past date — today is already covered by the `RechargeDayStatusService` singleton. */
  private fetchPastDateStatusIfNeeded(): void {
    if (this.isTodayOperationDate()) {
      this.pastDateStatus.set(null);
      return;
    }
    this.rechargesService.getDayStatus(this.operationDate()).subscribe({
      next: (status) => this.pastDateStatus.set(status),
      error: () => this.pastDateStatus.set(null),
    });
  }

  private fetchAll(): void {
    this.loading.set(true);
    this.salesLoading.set(true);
    this.simLoading.set(true);
    forkJoin({
      types: this.rechargesService.getTypes(),
      balances: this.rechargesService.getDailySummary(this.operationDate()),
      sales: this.rechargesService.getSales(this.operationDate()),
      simTypes: this.simsService.getTypes(),
      simStocks: this.simsService.getDailyStock(this.operationDate()),
    }).subscribe({
      next: ({ types, balances, sales, simTypes, simStocks }) => {
        this.types.set(types);
        this.balances.set(balances);
        this.sales.set(sales);
        this.simTypes.set(simTypes);
        this.simStocks.set(simStocks);
        this.loading.set(false);
        this.salesLoading.set(false);
        this.simLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.salesLoading.set(false);
        this.simLoading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar la información de recargas.'));
      },
    });
  }

  private fetchBalances(): void {
    this.loading.set(true);
    this.salesLoading.set(true);
    this.simLoading.set(true);
    forkJoin({
      balances: this.rechargesService.getDailySummary(this.operationDate()),
      sales: this.rechargesService.getSales(this.operationDate()),
      simStocks: this.simsService.getDailyStock(this.operationDate()),
    }).subscribe({
      next: ({ balances, sales, simStocks }) => {
        this.balances.set(balances);
        this.sales.set(sales);
        this.simStocks.set(simStocks);
        this.loading.set(false);
        this.salesLoading.set(false);
        this.simLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.salesLoading.set(false);
        this.simLoading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar la información de recargas.'));
      },
    });
  }

  private upsertSimStock(stock: SimDailyStock): void {
    this.simStocks.update((list) => {
      const exists = list.some((s) => s.id === stock.id);
      return exists ? list.map((s) => (s.id === stock.id ? stock : s)) : [...list, stock];
    });
  }

  onSimPurchaseRegistered(stock: SimDailyStock): void {
    this.upsertSimStock(stock);
  }

  onSimSaleRegistered(stock: SimDailyStock): void {
    this.upsertSimStock(stock);
  }

  private fetchSales(): void {
    this.salesLoading.set(true);
    this.rechargesService.getSales(this.operationDate()).subscribe({
      next: (sales) => {
        this.sales.set(sales);
        this.salesLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.salesLoading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar las recargas vendidas.'));
      },
    });
  }

  private upsertBalance(balance: RechargeDailyBalance): void {
    this.balances.update((list) => {
      const exists = list.some((b) => b.id === balance.id);
      return exists ? list.map((b) => (b.id === balance.id ? balance : b)) : [...list, balance];
    });
  }

  /** Picking another date must never mix its data with the previously viewed one — no local merge, just a full refetch scoped to the new date. */
  onDateChange(date: string): void {
    if (date === this.operationDate()) {
      return;
    }
    this.operationDate.set(date);
    this.fetchBalances();
    this.fetchPastDateStatusIfNeeded();
  }

  onPurchaseRegistered(balance: RechargeDailyBalance): void {
    this.upsertBalance(balance);
  }

  /** The backend already reset this date to a fresh cuadre cycle when the closure saved — refetch the table so saldo anterior/compra/saldo final all reflect it instead of the just-closed cycle. Also refreshes the day status: saving a cuadre is what makes "Cerrar Día" become available (`hasSavedCuadreToday`/`canCloseDay`). */
  onClosureSaved(): void {
    this.fetchBalances();
    if (this.isTodayOperationDate()) {
      this.dayStatusService.refresh();
    } else {
      this.fetchPastDateStatusIfNeeded();
    }
  }

  onRequestFinalBalance(event: RequestFinalBalanceEvent): void {
    this.finalBalanceTarget.set(event.balance);
    this.finalBalanceDraft.set(event.finalBalance);
    this.isFinalBalanceModalOpen.set(true);
  }

  cancelFinalBalance(): void {
    if (this.isSavingFinalBalance()) {
      return;
    }
    this.isFinalBalanceModalOpen.set(false);
    this.finalBalanceTarget.set(null);
  }

  confirmFinalBalance(): void {
    const target = this.finalBalanceTarget();
    if (!target) {
      return;
    }

    this.isSavingFinalBalance.set(true);
    this.rechargesService.registerFinalBalance(target.id, { finalBalance: this.finalBalanceDraft() }).subscribe({
      next: (balance) => {
        this.isSavingFinalBalance.set(false);
        this.isFinalBalanceModalOpen.set(false);
        this.finalBalanceTarget.set(null);
        this.upsertBalance(balance);
        this.salesSummaryRefreshTick.update((tick) => tick + 1);
        // Closing this type's saldo final locks every recarga vendida already
        // recorded under it — refetch so the table's lock icons update
        // immediately instead of only after a date change.
        this.fetchSales();
        this.notificationService.success(
          `Saldo final de ${balance.rechargeTypeName} guardado. Venta: ${formatCurrency(balance.sale ?? 0)}.`
        );
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingFinalBalance.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo guardar el saldo final.'));
      },
    });
  }

  openAddSaleModal(): void {
    this.saleModalTarget.set(null);
    this.isSaleModalOpen.set(true);
  }

  openEditSaleModal(sale: RechargeSale): void {
    this.saleModalTarget.set(sale);
    this.isSaleModalOpen.set(true);
  }

  closeSaleModal(): void {
    this.isSaleModalOpen.set(false);
    this.saleModalTarget.set(null);
  }

  /** Covers both create and edit — either way the row is upserted and the cuadre cards are refreshed from real data, never computed locally. */
  onSaleSaved(sale: RechargeSale): void {
    this.sales.update((list) => {
      const exists = list.some((s) => s.id === sale.id);
      return exists ? list.map((s) => (s.id === sale.id ? sale : s)) : [sale, ...list];
    });
    this.salesSummaryRefreshTick.update((tick) => tick + 1);
    this.isSaleModalOpen.set(false);
    this.saleModalTarget.set(null);
  }

  requestDeleteSale(sale: RechargeSale): void {
    this.deleteSaleTarget.set(sale);
    this.isDeleteSaleModalOpen.set(true);
  }

  cancelDeleteSale(): void {
    if (this.isDeletingSale()) {
      return;
    }
    this.isDeleteSaleModalOpen.set(false);
    this.deleteSaleTarget.set(null);
  }

  confirmDeleteSale(): void {
    const target = this.deleteSaleTarget();
    if (!target) {
      return;
    }

    this.isDeletingSale.set(true);
    this.rechargesService.deleteSale(target.id).subscribe({
      next: () => {
        this.isDeletingSale.set(false);
        this.isDeleteSaleModalOpen.set(false);
        this.deleteSaleTarget.set(null);
        this.sales.update((list) => list.filter((s) => s.id !== target.id));
        this.salesSummaryRefreshTick.update((tick) => tick + 1);
        this.notificationService.success('Recarga eliminada correctamente.');
      },
      error: (error: HttpErrorResponse) => {
        this.isDeletingSale.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo eliminar la recarga.'));
      },
    });
  }
}
