import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type ClientStatusFilterValue = 'all' | 'active' | 'inactive';

interface StatusFilterOption {
  value: ClientStatusFilterValue;
  label: string;
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

@Component({
  selector: 'app-client-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './client-toolbar.component.html',
  styleUrl: './client-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientToolbarComponent {
  @Input() searchTerm = '';
  @Input() statusFilter: ClientStatusFilterValue = 'all';
  /** Other roles don't get to create clients — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<ClientStatusFilterValue>();
  @Output() addClient = new EventEmitter<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
}
