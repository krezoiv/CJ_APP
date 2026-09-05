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
  selector: 'app-role-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './role-toolbar.component.html',
  styleUrl: './role-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: StatusFilterValue = 'all';

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<StatusFilterValue>();
  @Output() addRole = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
