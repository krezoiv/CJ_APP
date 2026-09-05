import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ReportSortDirection, ReportSortField, SalesReportRow, formatCurrency } from '../../../../../../core/models';
import { EmptyStateComponent, IconComponent } from '../../../../../../shared/ui';

/**
 * Desktop table only (no mobile card-list duplicate, unlike Inventory/
 * Categories/etc.) — a deliberate scope call for this admin-only report
 * screen: it's wrapped in its own `overflow-x: auto` per this app's rule for
 * wide content, so it's still usable on a narrow viewport, just not
 * reflowed into cards.
 */
@Component({
  selector: 'app-sales-report-table',
  standalone: true,
  imports: [DatePipe, IconComponent, EmptyStateComponent],
  templateUrl: './sales-report-table.component.html',
  styleUrl: './sales-report-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesReportTableComponent {
  @Input() rows: SalesReportRow[] = [];
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
