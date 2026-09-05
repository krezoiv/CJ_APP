import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';

import { Quotation, formatCurrency } from '../../../../../core/models';
import { QuotationsService } from '../../../../../core/services/quotations.service';
import { IconComponent } from '../../../../../shared/ui';

/** Read-only line-item detail for one cotización — reached from Historial's "Ver detalle" action. */
@Component({
  selector: 'app-quotation-detail-modal',
  standalone: true,
  imports: [DatePipe, IconComponent],
  templateUrl: './quotation-detail-modal.component.html',
  styleUrl: './quotation-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationDetailModalComponent implements OnChanges {
  @Input() quotationId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly quotationsService = inject(QuotationsService);

  readonly quotation = signal<Quotation | null>(null);
  readonly loading = signal(false);

  formatCurrency = formatCurrency;

  ngOnChanges(): void {
    if (!this.quotationId) {
      this.quotation.set(null);
      return;
    }
    this.loading.set(true);
    this.quotationsService.getQuotationById(this.quotationId).subscribe({
      next: (quotation) => {
        this.quotation.set(quotation);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
