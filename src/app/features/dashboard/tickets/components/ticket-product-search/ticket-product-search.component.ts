import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { Product, formatCurrency } from '../../../../../core/models';
import { InventoryService } from '../../../../../core/services/inventory.service';
import { IconComponent } from '../../../../../shared/ui';

/**
 * Own small copy of Ventas' `ProductSearchComponent` — this app's established
 * convention (see that component's own doc note) is a per-feature copy over a
 * shared one once the semantics diverge. Here they diverge in one way: a
 * Ticket isn't constrained by real inventory availability the way a Sale is
 * (it never reserves or decrements stock), so results are never disabled for
 * being out of stock.
 */
@Component({
  selector: 'app-ticket-product-search',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './ticket-product-search.component.html',
  styleUrl: './ticket-product-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketProductSearchComponent {
  @Output() productSelected = new EventEmitter<Product>();

  private readonly inventoryService = inject(InventoryService);

  readonly query = signal('');
  readonly results = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly hasSearched = signal(false);

  formatCurrency = formatCurrency;

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
            return of<Product[]>([]);
          }
          this.loading.set(true);
          return this.inventoryService.searchProducts(trimmed).pipe(catchError(() => of<Product[]>([])));
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
    setTimeout(() => this.open.set(false), 150);
  }

  select(product: Product): void {
    this.productSelected.emit(product);
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
