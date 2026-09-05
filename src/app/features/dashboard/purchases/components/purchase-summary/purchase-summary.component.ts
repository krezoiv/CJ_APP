import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { formatCurrency } from '../../../../../core/models';
import { ButtonComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-purchase-summary',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './purchase-summary.component.html',
  styleUrl: './purchase-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseSummaryComponent {
  @Input() itemCount = 0;
  @Input() total = 0;
  @Input() isSaving = false;
  /** Extra gate on top of `itemCount > 0` — the page requires a supplier to be selected too. */
  @Input() supplierSelected = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  formatCurrency = formatCurrency;

  get canCancel(): boolean {
    return this.itemCount > 0 && !this.isSaving;
  }

  get canSave(): boolean {
    return this.itemCount > 0 && this.supplierSelected && !this.isSaving;
  }
}
