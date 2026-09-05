import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Client } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { ClientSearchSelectComponent } from '../client-search-select/client-search-select.component';

export type AssetStatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: AssetStatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-asset-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent, ClientSearchSelectComponent],
  templateUrl: './asset-toolbar.component.html',
  styleUrl: './asset-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: AssetStatusFilterValue = 'all';
  @Input() clientFilter: Client | null = null;
  @Input() dateFrom = '';
  @Input() dateTo = '';
  @Input() hasActiveFilters = false;
  /** Other roles don't get to create records — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<AssetStatusFilterValue>();
  @Output() clientFilterChange = new EventEmitter<Client | null>();
  @Output() dateFromChange = new EventEmitter<string>();
  @Output() dateToChange = new EventEmitter<string>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addRecord = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
