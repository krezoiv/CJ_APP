import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { Product } from '../../../../../core/models';
import { InventoryService } from '../../../../../core/services/inventory.service';
import { IconComponent } from '../../../../../shared/ui';

/**
 * A near-copy of Ventas'/Compras' own product-search dropdowns, adapted for
 * a *filter* rather than an "add to receipt" action: no out-of-stock
 * disabling (a report can reasonably filter by a product that's since sold
 * out), and a persistent "selected" chip replaces the search box until
 * cleared, since a filter selection sticks around instead of firing once.
 */
@Component({
  selector: 'app-report-product-filter',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './product-filter-search.component.html',
  styleUrl: './product-filter-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFilterSearchComponent {
  @Input() selectedProduct: Product | null = null;
  @Output() selectionChange = new EventEmitter<Product | null>();

  private readonly inventoryService = inject(InventoryService);

  readonly query = signal('');
  readonly results = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly hasSearched = signal(false);

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
    this.selectionChange.emit(product);
    this.query.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.open.set(false);
  }

  clear(): void {
    this.selectionChange.emit(null);
  }
}
