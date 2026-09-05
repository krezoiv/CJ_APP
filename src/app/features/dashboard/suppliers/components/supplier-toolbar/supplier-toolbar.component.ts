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
  selector: 'app-supplier-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './supplier-toolbar.component.html',
  styleUrl: './supplier-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: StatusFilterValue = 'all';
  /** USER role doesn't get to create suppliers — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<StatusFilterValue>();
  @Output() addSupplier = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
