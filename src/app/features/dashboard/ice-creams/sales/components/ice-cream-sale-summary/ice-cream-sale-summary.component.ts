import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { formatIceCreamCurrency } from '../../../../../../core/models';
import { ButtonComponent } from '../../../../../../shared/ui';

@Component({
  selector: 'app-ice-cream-sale-summary',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './ice-cream-sale-summary.component.html',
  styleUrl: './ice-cream-sale-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamSaleSummaryComponent {
  @Input() itemCount = 0;
  @Input() total = 0;
  @Input() isSaving = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  formatCurrency = formatIceCreamCurrency;

  get canCancel(): boolean {
    return this.itemCount > 0 && !this.isSaving;
  }

  get canSave(): boolean {
    return this.itemCount > 0 && !this.isSaving;
  }
}
