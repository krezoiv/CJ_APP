import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TransactionBank, TransactionType } from '../../../core/models';
import { BankDepositDraftStore } from '../../../core/services/bank-deposit-draft.store';
import { BankDepositService } from '../../../core/services/bank-deposit.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TransactionBankService } from '../../../core/services/transaction-bank.service';
import { TransactionTypeService } from '../../../core/services/transaction-type.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { DecimalInputDirective } from '../../../shared/directives/decimal-input.directive';
import { ButtonComponent, IconComponent } from '../../../shared/ui';
import { CashBreakdownTableComponent } from './components/cash-breakdown-table/cash-breakdown-table.component';
import { SaveConfirmModalComponent } from './components/save-confirm-modal/save-confirm-modal.component';
import { StatusIndicatorComponent } from './components/status-indicator/status-indicator.component';
import { TransactionDistributionComponent } from './components/transaction-distribution/transaction-distribution.component';

type TransaccionarView = 'dashboard' | 'form';

/**
 * "Transaccionar" — a two-step flow. Step one is a dashboard of cards, one
 * per active "Tipo de Transacción" (Depósito, Retiro, Desembolso Préstamo,
 * Pago Cheque, ...), managed under Sistema. Picking one moves to step two:
 * the actual registration form (banco agente, monto, desglose de efectivo,
 * distribución de transacciones — unchanged from before this ticket, just
 * now tagged with the chosen type). Saving successfully — or explicitly
 * changing the type mid-form — resets the module straight back to the
 * dashboard, never leaving the just-used form sitting on screen.
 *
 * The draft (`BankDepositDraftStore`) survives navigation the same way
 * `PurchaseDraftStore` does for Compras — nothing is sent to the backend
 * until "Confirmar y Guardar", and the currently selected type is itself
 * part of that same persisted draft, so a reload mid-form resumes on the
 * form (not the dashboard) with everything intact.
 */
@Component({
  selector: 'app-transaccionar-page',
  standalone: true,
  imports: [
    FormsModule,
    DecimalInputDirective,
    ButtonComponent,
    IconComponent,
    CashBreakdownTableComponent,
    TransactionDistributionComponent,
    StatusIndicatorComponent,
    SaveConfirmModalComponent,
  ],
  templateUrl: './transaccionar-page.component.html',
  styleUrl: './transaccionar-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransaccionarPageComponent {
  private readonly transactionBankService = inject(TransactionBankService);
  private readonly transactionTypeService = inject(TransactionTypeService);
  private readonly bankDepositService = inject(BankDepositService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

  readonly draft = inject(BankDepositDraftStore);

  readonly transactionBanks = signal<TransactionBank[]>([]);
  readonly loadingBanks = signal(true);

  readonly transactionTypes = signal<TransactionType[]>([]);
  readonly loadingTypes = signal(true);

  /** Resumes straight on the form if a type was already selected (e.g. after a reload mid-draft) — never re-shows the dashboard out from under an in-progress operation. */
  readonly view = signal<TransaccionarView>(this.draft.transactionTypeId() ? 'form' : 'dashboard');

  readonly isSaving = signal(false);
  readonly isConfirmOpen = signal(false);

  readonly selectedBankName = computed(
    () => this.transactionBanks().find((b) => b.id === this.draft.transactionBankId())?.name ?? '',
  );

  readonly selectedTypeIcon = computed(
    () => this.transactionTypes().find((t) => t.id === this.draft.transactionTypeId())?.icon ?? 'arrow-left-right',
  );

  readonly overallStatusText = computed(() => {
    switch (this.draft.overallStatus()) {
      case 'green':
        return 'Cuadre correcto — listo para guardar';
      case 'red':
        return 'El cuadre excede el monto total';
      default:
        return 'El cuadre aún no coincide';
    }
  });

  constructor() {
    this.transactionBankService.getTransactionBanks().subscribe({
      next: (banks) => {
        this.transactionBanks.set(banks);
        this.loadingBanks.set(false);
      },
      error: () => {
        this.loadingBanks.set(false);
        this.notificationService.error('No se pudieron cargar los bancos agente.');
      },
    });

    this.transactionTypeService.getTransactionTypes().subscribe({
      next: (types) => {
        this.transactionTypes.set(types);
        this.loadingTypes.set(false);
      },
      error: () => {
        this.loadingTypes.set(false);
        this.notificationService.error('No se pudieron cargar los tipos de transacción.');
      },
    });
  }

  selectType(type: TransactionType): void {
    this.draft.setTransactionType(type.id, type.name);
    this.view.set('form');
  }

  /** Going back to the dashboard always starts a fresh operation — changing the tipo mid-flight discards whatever was already entered for the previous one, after confirming if there's anything meaningful to lose. */
  async changeType(): Promise<void> {
    if (this.draft.hasMeaningfulProgress()) {
      const discard = await this.confirmDialogService.confirm({
        type: 'CANCEL',
        title: 'Cambiar tipo de transacción',
        message: 'Se perderá la información ingresada en este formulario. ¿Deseas continuar?',
        confirmText: 'Sí, cambiar tipo',
      });
      if (!discard) {
        return;
      }
    }
    this.draft.reset();
    this.view.set('dashboard');
  }

  onBankChange(id: string): void {
    this.draft.setTransactionBank(id);
  }

  onClientNameInput(value: string): void {
    this.draft.setClientName(value);
  }

  onTotalAmountInput(value: string): void {
    const parsed = parseFloat(value);
    this.draft.setTotalAmount(Number.isNaN(parsed) ? 0 : Math.max(parsed, 0));
  }

  onCashQuantityChange(event: { denomination: number; quantity: number }): void {
    this.draft.setCashQuantity(event.denomination, event.quantity);
  }

  async onTransactionCountRequested(count: number): Promise<void> {
    const current = this.draft.transactionAmounts();
    const wouldDiscard = count < current.length && current.slice(count).some((amount) => amount > 0);

    if (wouldDiscard) {
      const confirmed = await this.confirmDialogService.confirm({
        type: 'FINANCIAL_OPERATION',
        title: 'Reducir transacciones',
        message: 'Ya ingresaste montos en algunas de las transacciones que se eliminarían. ¿Deseas continuar?',
        confirmText: 'Sí, continuar',
      });
      if (!confirmed) {
        return;
      }
    }

    this.draft.setTransactionCount(count);
  }

  onTransactionAmountChange(event: { index: number; amount: number }): void {
    this.draft.setTransactionAmount(event.index, event.amount);
  }

  requestSave(): void {
    if (!this.draft.canSave() || this.isSaving()) {
      return;
    }
    this.isConfirmOpen.set(true);
  }

  dismissConfirm(): void {
    if (this.isSaving()) {
      return;
    }
    this.isConfirmOpen.set(false);
  }

  confirmSave(): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.bankDepositService
      .registerOperation({
        transactionBankId: this.draft.transactionBankId(),
        transactionTypeId: this.draft.transactionTypeId(),
        totalAmount: this.draft.totalAmount(),
        cashDetails: Object.entries(this.draft.cashCounts())
          .map(([denomination, quantity]) => ({ denomination: Number(denomination), quantity }))
          .filter((row) => row.quantity > 0),
        transactionAmounts: this.draft.transactionAmounts(),
        clientName: this.draft.clientName().trim() || null,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isConfirmOpen.set(false);
          this.draft.reset();
          this.view.set('dashboard');
          this.notificationService.success('Transacción registrada correctamente.');
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.isConfirmOpen.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la transacción.'));
        },
      });
  }
}
