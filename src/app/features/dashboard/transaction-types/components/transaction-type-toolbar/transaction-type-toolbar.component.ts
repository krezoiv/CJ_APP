import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type TransactionTypeStatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: TransactionTypeStatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-transaction-type-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './transaction-type-toolbar.component.html',
  styleUrl: './transaction-type-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionTypeToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: TransactionTypeStatusFilterValue = 'all';
  /** USER role doesn't get to create account types — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<TransactionTypeStatusFilterValue>();
  @Output() addTransactionType = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
