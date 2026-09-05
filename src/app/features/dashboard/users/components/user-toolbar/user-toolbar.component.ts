import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Role } from '../../../../../core/models';
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
  selector: 'app-user-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './user-toolbar.component.html',
  styleUrl: './user-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: StatusFilterValue = 'all';
  @Input() roleFilter = 'all';
  @Input() roles: Role[] = [];

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<StatusFilterValue>();
  @Output() roleFilterChange = new EventEmitter<string>();
  @Output() addUser = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
