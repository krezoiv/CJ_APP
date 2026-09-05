import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { RechargeSale, formatCurrency } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/** Dumb — the page owns the actual `deleteSale` call, same split as Categories'/Compras' own delete-confirm modals. */
@Component({
  selector: 'app-recharge-sale-delete-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './recharge-sale-delete-confirm-modal.component.html',
  styleUrl: './recharge-sale-delete-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargeSaleDeleteConfirmModalComponent {
  @Input() open = false;
  @Input() sale: RechargeSale | null = null;
  @Input() isDeleting = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  formatCurrency = formatCurrency;
}
