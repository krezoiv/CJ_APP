import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type BankStatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: BankStatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-bank-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './bank-toolbar.component.html',
  styleUrl: './bank-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: BankStatusFilterValue = 'all';
  /** USER role doesn't get to create banks — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<BankStatusFilterValue>();
  @Output() addBank = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
