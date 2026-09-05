import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { IceCream, formatIceCreamCurrency, formatQuantity } from '../../../../../../core/models';
import { IceCreamService } from '../../../../../../core/services/ice-cream.service';
import { IconComponent } from '../../../../../../shared/ui';

/** Same live-search pattern as Compras' `PurchaseProductSearchComponent` — its own doc comment explains why this is a feature-local copy, not a shared one. */
@Component({
  selector: 'app-ice-cream-purchase-product-search',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './ice-cream-product-search.component.html',
  styleUrl: './ice-cream-product-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamProductSearchComponent {
  @Output() iceCreamSelected = new EventEmitter<IceCream>();

  private readonly iceCreamService = inject(IceCreamService);

  readonly query = signal('');
  readonly results = signal<IceCream[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly hasSearched = signal(false);

  formatCurrency = formatIceCreamCurrency;
  formatQuantity = formatQuantity;

  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = term.trim();
          if (!trimmed) {
            this.hasSearched.set(false);
            return of<IceCream[]>([]);
          }
          this.loading.set(true);
          return this.iceCreamService.searchIceCreams(trimmed).pipe(catchError(() => of<IceCream[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.loading.set(false);
        this.hasSearched.set(this.query().trim().length > 0);
        this.results.set(results);
      });
  }

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.query$.next(value);
    if (!value.trim()) {
      this.results.set([]);
      this.hasSearched.set(false);
    }
  }

  onFocus(): void {
    if (this.results().length > 0 || this.hasSearched()) {
      this.open.set(true);
    }
  }

  onBlur(): void {
    // Delay so a click on a result registers before the dropdown closes.
    setTimeout(() => this.open.set(false), 150);
  }

  select(iceCream: IceCream): void {
    this.iceCreamSelected.emit(iceCream);
    this.query.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.open.set(false);
  }

  onEnter(): void {
    const first = this.results()[0];
    if (first) {
      this.select(first);
    }
  }
}
