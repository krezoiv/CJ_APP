import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { ButtonComponent } from '../../../../../shared/ui';

/** Generic page-N-of-M control — no existing pagination component in this app to reuse (checked first), so this is the one place both reports (and any future paginated screen) can share. */
@Component({
  selector: 'app-report-pagination',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './report-pagination.component.html',
  styleUrl: './report-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportPaginationComponent {
  private readonly totalSignal = signal(0);
  private readonly pageSignal = signal(1);
  private readonly limitSignal = signal(20);

  @Input({ required: true })
  set total(value: number) {
    this.totalSignal.set(value);
  }
  @Input({ required: true })
  set page(value: number) {
    this.pageSignal.set(value);
  }
  @Input({ required: true })
  set limit(value: number) {
    this.limitSignal.set(value);
  }

  @Output() pageChange = new EventEmitter<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalSignal() / this.limitSignal())));
  readonly currentPage = computed(() => this.pageSignal());
  readonly hasItems = computed(() => this.totalSignal() > 0);
  readonly canGoPrevious = computed(() => this.currentPage() > 1);
  readonly canGoNext = computed(() => this.currentPage() < this.totalPages());

  previous(): void {
    if (this.canGoPrevious()) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  next(): void {
    if (this.canGoNext()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }
}
