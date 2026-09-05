import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Client } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { ClientSearchSelectComponent } from '../client-search-select/client-search-select.component';

export type AccountReceivableStatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: AccountReceivableStatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-account-receivable-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent, ClientSearchSelectComponent],
  templateUrl: './account-receivable-toolbar.component.html',
  styleUrl: './account-receivable-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountReceivableToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: AccountReceivableStatusFilterValue = 'all';
  @Input() clientFilter: Client | null = null;
  @Input() dateFrom = '';
  @Input() dateTo = '';
  @Input() hasActiveFilters = false;
  /** Other roles don't get to create records — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<AccountReceivableStatusFilterValue>();
  @Output() clientFilterChange = new EventEmitter<Client | null>();
  @Output() dateFromChange = new EventEmitter<string>();
  @Output() dateToChange = new EventEmitter<string>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addRecord = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
