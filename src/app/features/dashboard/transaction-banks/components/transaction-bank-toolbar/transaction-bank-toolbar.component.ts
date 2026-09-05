import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type TransactionBankStatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: TransactionBankStatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-transaction-bank-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './transaction-bank-toolbar.component.html',
  styleUrl: './transaction-bank-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionBankToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: TransactionBankStatusFilterValue = 'all';
  /** USER role doesn't get to create account types — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<TransactionBankStatusFilterValue>();
  @Output() addTransactionBank = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
