import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { IceCream } from '../../../../../core/models';
import { IceCreamService } from '../../../../../core/services/ice-cream.service';
import { IconComponent } from '../../../../../shared/ui';

/**
 * A near-copy of this same folder's `ProductFilterSearchComponent`, adapted
 * for helados: server-side search via `IceCreamService.searchIceCreams()`
 * (the same live-search endpoint the operational Heladería · Compras/Ventas
 * screens already use), with the persistent "selected" chip + clear button
 * pattern a *filter* needs (vs. an "add to receipt" action).
 */
@Component({
  selector: 'app-report-ice-cream-filter',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './ice-cream-filter-search.component.html',
  styleUrl: './ice-cream-filter-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamFilterSearchComponent {
  @Input() selectedIceCream: IceCream | null = null;
  @Output() selectionChange = new EventEmitter<IceCream | null>();

  private readonly iceCreamService = inject(IceCreamService);

  readonly query = signal('');
  readonly results = signal<IceCream[]>([]);
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
    setTimeout(() => this.open.set(false), 150);
  }

  select(iceCream: IceCream): void {
    this.selectionChange.emit(iceCream);
    this.query.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.open.set(false);
  }

  clear(): void {
    this.selectionChange.emit(null);
  }
}
