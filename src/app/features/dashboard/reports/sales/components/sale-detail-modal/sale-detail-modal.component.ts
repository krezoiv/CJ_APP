import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { SaleReportDetail, formatCurrency, formatQuantity } from '../../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../../shared/ui';

@Component({
  selector: 'app-sale-detail-modal',
  standalone: true,
  imports: [DatePipe, ButtonComponent, IconComponent],
  templateUrl: './sale-detail-modal.component.html',
  styleUrl: './sale-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleDetailModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() sale: SaleReportDetail | null = null;

  @Output() closed = new EventEmitter<void>();

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;
}
