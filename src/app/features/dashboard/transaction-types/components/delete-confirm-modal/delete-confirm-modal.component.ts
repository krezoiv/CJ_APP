import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { TransactionType } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-transaction-type-delete-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './delete-confirm-modal.component.html',
  styleUrl: './delete-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmModalComponent {
  @Input() open = false;
  @Input() transactionType: TransactionType | null = null;
  @Input() isDeleting = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
