import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { Asset, formatAssetCurrency } from '../../../../../core/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 4;

@Component({
  selector: 'app-asset-table',
  standalone: true,
  imports: [DatePipe, BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './asset-table.component.html',
  styleUrl: './asset-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetTableComponent {
  @Input() records: Asset[] = [];
  @Input() loading = false;
  @Input() hasActiveFilters = false;
  /** Other roles are read-only — hides the Acciones column and edit/delete buttons. The backend still enforces this. */
  @Input() canManage = true;

  @Output() edit = new EventEmitter<Asset>();
  @Output() delete = new EventEmitter<Asset>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addRecord = new EventEmitter<void>();
  /** Open to any authenticated role, unlike edit/delete — reading a statement isn't a mutation. */
  @Output() viewStatement = new EventEmitter<Asset>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  formatCurrency(amount: number): string {
    return formatAssetCurrency(amount);
  }
}
