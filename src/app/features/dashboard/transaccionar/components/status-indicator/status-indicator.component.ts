import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CuadreStatus } from '../../../../../core/services/bank-deposit-draft.store';
import { BadgeComponent, IconComponent } from '../../../../../shared/ui';

type BadgeTone = 'success' | 'gold' | 'danger';

const STATUS_TONE: Record<CuadreStatus, BadgeTone> = {
  green: 'success',
  yellow: 'gold',
  red: 'danger',
};

const STATUS_ICON: Record<CuadreStatus, string> = {
  green: 'check-circle',
  yellow: 'alert-circle',
  red: 'x-circle',
};

/**
 * The one red/amarillo/verde semáforo used for both the cash-breakdown
 * total and the transactions total, and again (worst-of-both) for the
 * overall cuadre — colors are never the sole signal, per this app's own
 * accessibility convention (see `SalesSummaryCardComponent`'s doc comment):
 * icon + badge text carry the same information as the color.
 */
@Component({
  selector: 'app-cuadre-status-indicator',
  standalone: true,
  imports: [BadgeComponent, IconComponent],
  templateUrl: './status-indicator.component.html',
  styleUrl: './status-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusIndicatorComponent {
  @Input({ required: true }) status!: CuadreStatus;
  /** Full message to display — callers compute this themselves (often including the missing/excess amount), since the exact wording differs per section. */
  @Input({ required: true }) text = '';

  get tone(): BadgeTone {
    return STATUS_TONE[this.status];
  }

  get icon(): string {
    return STATUS_ICON[this.status];
  }
}
