import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { PurchaseReportDetail, formatCurrency, formatQuantity } from '../../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../../shared/ui';

@Component({
  selector: 'app-purchase-detail-modal',
  standalone: true,
  imports: [DatePipe, ButtonComponent, IconComponent],
  templateUrl: './purchase-detail-modal.component.html',
  styleUrl: './purchase-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseDetailModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() purchase: PurchaseReportDetail | null = null;

  @Output() closed = new EventEmitter<void>();

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;
}
