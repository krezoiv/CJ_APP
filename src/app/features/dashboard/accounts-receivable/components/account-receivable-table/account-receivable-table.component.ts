import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AccountReceivable, formatAccountReceivableCurrency } from '../../../../../core/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 4;

@Component({
  selector: 'app-account-receivable-table',
  standalone: true,
  imports: [DatePipe, BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './account-receivable-table.component.html',
  styleUrl: './account-receivable-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountReceivableTableComponent {
  @Input() records: AccountReceivable[] = [];
  @Input() loading = false;
  @Input() hasActiveFilters = false;
  /** Other roles are read-only — hides the Acciones column and edit/delete buttons. The backend still enforces this. */
  @Input() canManage = true;

  @Output() edit = new EventEmitter<AccountReceivable>();
  @Output() delete = new EventEmitter<AccountReceivable>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addRecord = new EventEmitter<void>();
  /** Open to any authenticated role, unlike edit/delete — reading a statement isn't a mutation. */
  @Output() viewStatement = new EventEmitter<AccountReceivable>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  formatCurrency(amount: number): string {
    return formatAccountReceivableCurrency(amount);
  }
}
