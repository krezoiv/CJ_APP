import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type StatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: StatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
];

@Component({
  selector: 'app-category-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './category-toolbar.component.html',
  styleUrl: './category-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: StatusFilterValue = 'all';
  /** USER role doesn't get to create categories — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<StatusFilterValue>();
  @Output() addCategory = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
