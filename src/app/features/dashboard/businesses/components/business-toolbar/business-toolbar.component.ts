import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type StatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: StatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-business-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './business-toolbar.component.html',
  styleUrl: './business-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: StatusFilterValue = 'all';
  /** USER role doesn't get to create businesses — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<StatusFilterValue>();
  @Output() addBusiness = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
