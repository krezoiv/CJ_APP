import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { PriceListType, Product, formatCurrency } from '../../../../../core/models';
import { InventoryService } from '../../../../../core/services/inventory.service';
import { IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './product-search.component.html',
  styleUrl: './product-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSearchComponent {
  /** Which price the dropdown displays per result — purely a display concern, the backend is always the real authority on what gets charged. */
  @Input() priceList: PriceListType = 'PUBLIC';

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
    if (product.stock <= 0) {
      return;
    }
    this.productSelected.emit(product);
    this.query.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.open.set(false);
  }

  onEnter(): void {
    const first = this.results().find((p) => p.stock > 0);
    if (first) {
      this.select(first);
    }
  }

  priceFor(product: Product): number {
    return this.priceList === 'WHOLESALE' ? product.wholesalePrice : product.publicPrice;
  }
}
