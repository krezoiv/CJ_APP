import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';

import { BankDepositOperation, formatCurrency } from '../../../../../../core/models';
import { BankDepositService } from '../../../../../../core/services/bank-deposit.service';
import { NotificationService } from '../../../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../../shared/ui';

/**
 * "Ver detalle" of one Transaccionar operation — the full shape
 * (`GET /bank-deposits/:id`, cash breakdown + transaction rows), not the
 * lighter listing shape both "Reporte de Transacciones" and "Gestión de
 * Transacciones" already show. Shared by both screens (imported directly,
 * not duplicated) because the need is genuinely identical in both places —
 * same reasoning `SalePricingBarComponent` reuses `ClientSearchSelectComponent`
 * for, unlike the small per-feature copies this codebase otherwise prefers
 * when the content actually diverges.
 */
@Component({
  selector: 'app-bank-deposit-detail-modal',
  standalone: true,
  imports: [DatePipe, ButtonComponent, IconComponent],
  templateUrl: './bank-deposit-detail-modal.component.html',
  styleUrl: './bank-deposit-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankDepositDetailModalComponent implements OnChanges {
  private readonly bankDepositService = inject(BankDepositService);
  private readonly notificationService = inject(NotificationService);

  @Input() open = false;
  @Input() operationId: string | null = null;

  @Output() closed = new EventEmitter<void>();

  readonly operation = signal<BankDepositOperation | null>(null);
  readonly loading = signal(false);

  formatCurrency = formatCurrency;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['operationId']) && this.open && this.operationId) {
      this.fetch(this.operationId);
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  private fetch(id: string): void {
    this.loading.set(true);
    this.operation.set(null);
    this.bankDepositService.getOperationById(id).subscribe({
      next: (operation) => {
        this.operation.set(operation);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el detalle de la transacción.'));
        this.closed.emit();
      },
    });
  }
}
