import { Injectable, signal } from '@angular/core';

import { IceCream, IceCreamReportRow, IceCreamReportSummary, User } from '../models';

/**
 * Holds the Reportería de Heladería page's checkboxes, filters, and
 * last-fetched results in a root-provided singleton — same reasoning as
 * `AssetsReceivablesReportStateService` (see its own doc comment).
 */
@Injectable({ providedIn: 'root' })
export class IceCreamReportStateService {
  // Draft (form-bound) checkboxes/filters. Both movements default checked, same reasoning
  // as the Activos/Cuentas por Cobrar report's own state service.
  readonly draftIncludeSales = signal(true);
  readonly draftIncludePurchases = signal(true);
  readonly draftIceCream = signal<IceCream | null>(null);
  readonly draftUser = signal<User | null>(null);
  readonly draftStartDate = signal('');
  readonly draftEndDate = signal('');

  // Applied (query-driving) checkboxes/filters.
  readonly includeSales = signal(true);
  readonly includePurchases = signal(true);
  readonly iceCream = signal<IceCream | null>(null);
  readonly user = signal<User | null>(null);
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly page = signal(1);

  // Last-fetched results — restored as-is when the user navigates back.
  readonly rows = signal<IceCreamReportRow[]>([]);
  readonly total = signal(0);
  readonly summary = signal<IceCreamReportSummary | null>(null);
  readonly hasQueried = signal(false);

  // Always false when the user isn't actively mid-request — not persisted state so much as
  // shared UI flags that need to live alongside the rest of this store.
  readonly loadingTable = signal(false);
  readonly loadingSummary = signal(false);
  readonly exporting = signal(false);
}
