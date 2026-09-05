import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { formatIceCreamCurrency } from '../../../../../../core/models';
import { ButtonComponent } from '../../../../../../shared/ui';

@Component({
  selector: 'app-ice-cream-purchase-summary',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './ice-cream-purchase-summary.component.html',
  styleUrl: './ice-cream-purchase-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamPurchaseSummaryComponent {
  @Input() itemCount = 0;
  @Input() total = 0;
  @Input() isSaving = false;
  /** Extra gate on top of `itemCount > 0` — the page requires a supplier to be selected too. */
  @Input() supplierSelected = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  formatCurrency = formatIceCreamCurrency;

  get canCancel(): boolean {
    return this.itemCount > 0 && !this.isSaving;
  }

  get canSave(): boolean {
    return this.itemCount > 0 && this.supplierSelected && !this.isSaving;
  }
}
