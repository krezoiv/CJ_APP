import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  PurchasesReportRow,
  ReportSortDirection,
  ReportSortField,
  formatCurrency,
} from '../../../../../../core/models';
import { EmptyStateComponent, IconComponent } from '../../../../../../shared/ui';

/** Desktop table only — same deliberate scope call as `SalesReportTableComponent` (see its own doc comment). */
@Component({
  selector: 'app-purchases-report-table',
  standalone: true,
  imports: [DatePipe, IconComponent, EmptyStateComponent],
  templateUrl: './purchases-report-table.component.html',
  styleUrl: './purchases-report-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesReportTableComponent {
  @Input() rows: PurchasesReportRow[] = [];
  @Input() loading = false;
  @Input() sortBy: ReportSortField = 'date';
  @Input() sortDirection: ReportSortDirection = 'desc';

  @Output() sortChange = new EventEmitter<{ sortBy: ReportSortField; sortDirection: ReportSortDirection }>();
  @Output() viewDetail = new EventEmitter<string>();

  formatCurrency = formatCurrency;

  toggleSort(field: ReportSortField): void {
    const sortDirection: ReportSortDirection =
      this.sortBy === field && this.sortDirection === 'desc' ? 'asc' : 'desc';
    this.sortChange.emit({ sortBy: field, sortDirection });
  }

  sortIcon(field: ReportSortField): string {
    if (this.sortBy !== field) {
      return 'chevrons-up-down';
    }
    return this.sortDirection === 'asc' ? 'chevron-up' : 'chevron-down';
  }
}
