import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { Product, formatCurrency, formatQuantity } from '../../../../../core/models';
import { InventoryService } from '../../../../../core/services/inventory.service';
import { IconComponent } from '../../../../../shared/ui';

/**
 * Purchases' own product picker — structurally the same live-search pattern
 * as Ventas' `ProductSearchComponent` (same debounce/search mechanics,
 * reuses `InventoryService.searchProducts()`), but the dropdown shows cost
 * price alongside public price and stock, since a purchase invoice needs
 * both current prices pre-filled. Kept as a separate component rather than
 * importing Ventas' version, matching how every other near-identical
 * component pair in this app (summary/toolbar/table/modal across Categories,
 * Businesses, Suppliers...) is its own feature-local copy, not a shared one.
 */
@Component({
  selector: 'app-purchase-product-search',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './purchase-product-search.component.html',
  styleUrl: './purchase-product-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseProductSearchComponent {
  @Output() productSelected = new EventEmitter<Product>();

  private readonly inventoryService = inject(InventoryService);

  readonly query = signal('');
  readonly results = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly hasSearched = signal(false);

  formatCurrency = formatCurrency;
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
            return of<Product[]>([]);
          }
          this.loading.set(true);
          return this.inventoryService.searchProducts(trimmed).pipe(
            catchError(() => of<Product[]>([])),
          );
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
