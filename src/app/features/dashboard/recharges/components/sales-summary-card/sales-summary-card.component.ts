import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  RechargeSalesSummary,
  SalesClosureStatus,
  formatCurrency,
  getSalesClosureStatus,
} from '../../../../../core/models';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { RechargesService } from '../../../../../core/services/recharges.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { BadgeComponent, ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

const STATUS_TONE: Record<SalesClosureStatus, 'success' | 'gold' | 'danger'> = {
  zero: 'success',
  positive: 'gold',
  negative: 'danger',
};

const STATUS_ICON: Record<SalesClosureStatus, string> = {
  zero: 'check-circle',
  positive: 'alert-circle',
  negative: 'x-circle',
};

const STATUS_TEXT: Record<SalesClosureStatus, string> = {
  zero: 'Cuadre correcto',
  positive: 'Diferencia pendiente',
  negative: 'Se recaudó de más',
};

/**
 * Self-contained, like `RegisterPurchaseFormComponent` — fetches and saves
 * through `RechargesService` directly rather than routing through the page.
 * Unlike the final-balance flow, the ticket for this Card specifies no
 * confirmation modal: the result/color preview updates live as the user
 * types, which already *is* the confirmation before clicking "Guardar".
 */
@Component({
  selector: 'app-recharge-sales-summary-card',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent, BadgeComponent, DecimalInputDirective],
  templateUrl: './sales-summary-card.component.html',
  styleUrl: './sales-summary-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesSummaryCardComponent implements OnChanges {
  /** `yyyy-MM-dd` — the page's operation-date picker value; the Card always reflects this date, never today implicitly. */
  @Input() operationDate = '';
  /** Bumped by the parent after a final-balance save changes this date's sale figures — triggers a refetch. */
  @Input() refreshTrigger = 0;
  /** The active date's Recargas day is CLOSED (via "Cerrar Día") or, for today, not yet opened — a module-wide gate, stronger than the per-cuadre `isAdmin` re-save rule below: not even an admin can save a cuadre until the day is reopened. `null` means editing is unlocked. */
  @Input() lockReason: 'closed' | 'not_opened' | null = null;
  /** Emitted after a successful save — the backend has already reset this date to a fresh cuadre cycle, so the parent's own table (saldo anterior, compra, etc.) needs a refetch too. */
  @Output() closureSaved = new EventEmitter<void>();

  private readonly rechargesService = inject(RechargesService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;

  readonly summary = signal<RechargeSalesSummary | null>(null);
  readonly loading = signal(true);
  readonly isSaving = signal(false);

  /**
   * Always starts empty — on load, after a switch of `operationDate`, and after a successful
   * save — never pre-filled from `summary().totalCollected`. The already-saved figures are
   * shown separately (read-only) so a fresh save doesn't accidentally resubmit stale data, per
   * the ticket's explicit "resetear el formulario para una nueva operación" requirement, while
   * the persisted state itself is never hidden.
   */
  readonly totalCollectedDraft = signal<number | null>(null);

  readonly previewResult = computed(() => {
    const summary = this.summary();
    const collected = this.totalCollectedDraft();
    if (!summary || collected === null || !Number.isFinite(collected)) {
      return null;
    }
    return summary.totalSales - collected;
  });

  readonly previewStatus = computed<SalesClosureStatus | null>(() => {
    const result = this.previewResult();
    return result === null ? null : getSalesClosureStatus(result);
  });

  readonly statusTone = computed(() => {
    const status = this.previewStatus();
    return status ? STATUS_TONE[status] : 'neutral-light';
  });

  readonly statusIcon = computed(() => {
    const status = this.previewStatus();
    return status ? STATUS_ICON[status] : 'clock';
  });

  readonly statusText = computed(() => {
    const status = this.previewStatus();
    return status ? STATUS_TEXT[status] : 'Ingresa el total recaudado';
  });

  /** Same status computation as the live preview, applied to the already-saved figures for the read-only "cuadre guardado" block. */
  readonly savedStatus = computed<SalesClosureStatus | null>(() => {
    const summary = this.summary();
    return summary?.savedClosure && summary.difference !== null ? getSalesClosureStatus(summary.difference) : null;
  });

  readonly savedStatusTone = computed(() => {
    const status = this.savedStatus();
    return status ? STATUS_TONE[status] : 'neutral-light';
  });

  readonly savedStatusIcon = computed(() => {
    const status = this.savedStatus();
    return status ? STATUS_ICON[status] : 'clock';
  });

  readonly savedStatusText = computed(() => {
    const status = this.savedStatus();
    return status ? STATUS_TEXT[status] : '';
  });

  readonly canSave = computed(() => {
    const summary = this.summary();
    const collected = this.totalCollectedDraft();
    if (!summary || collected === null || !Number.isFinite(collected) || collected < 0) {
      return false;
    }
    // A cuadre already saved for this date can only be re-saved by an admin — mirrors the backend's rule exactly.
    return !summary.savedClosure || this.isAdmin();
  });

  formatCurrency = formatCurrency;

  /**
   * No fetch here — `@Input() operationDate` isn't set by Angular until after the constructor
   * runs, so fetching this early would silently query with the class field's `''` default
   * (the backend would then fall back to ITS OWN "today", which can be a different calendar
   * day than the browser's if the API server's clock is in a different timezone). The initial
   * fetch happens in `ngOnChanges`'s first-change branch below instead, once `operationDate`
   * actually holds the parent's real value.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['operationDate']) {
      if (!changes['operationDate'].firstChange) {
        // A different date's figures are being loaded — never mix an unsent draft into them.
        this.totalCollectedDraft.set(null);
      }
      this.fetchSummary();
      return;
    }
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.fetchSummary();
    }
  }

  private fetchSummary(): void {
    this.loading.set(true);
    this.rechargesService.getSalesSummary(this.operationDate).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(
          extractErrorMessage(error, 'No se pudo cargar el resumen de ventas.')
        );
      },
    });
  }

  onTotalCollectedInput(value: string): void {
    if (value.trim() === '') {
      this.totalCollectedDraft.set(null);
      return;
    }
    const parsed = Number(value);
    this.totalCollectedDraft.set(Number.isFinite(parsed) ? parsed : null);
  }

  save(): void {
    if (!this.canSave() || this.isSaving() || this.lockReason !== null) {
      return;
    }
    this.isSaving.set(true);
    this.rechargesService
      .registerSalesClosure({ totalCollected: this.totalCollectedDraft()!, operationDate: this.operationDate })
      .subscribe({
        next: (summary) => {
          this.isSaving.set(false);
          this.summary.set(summary);
          // Reset for a new operation, per the ticket's explicit requirement — the just-saved
          // figures stay visible in the read-only block above, driven by `summary` itself.
          this.totalCollectedDraft.set(null);
          this.notificationService.success('Cuadre de recargas guardado correctamente.');
          this.closureSaved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo guardar el cuadre.'));
        },
      });
  }
}
