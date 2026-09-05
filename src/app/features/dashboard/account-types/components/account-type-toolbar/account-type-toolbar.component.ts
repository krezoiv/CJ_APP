import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type AccountTypeStatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: AccountTypeStatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-account-type-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './account-type-toolbar.component.html',
  styleUrl: './account-type-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTypeToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: AccountTypeStatusFilterValue = 'all';
  /** USER role doesn't get to create account types — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<AccountTypeStatusFilterValue>();
  @Output() addAccountType = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
