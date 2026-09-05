import { Injectable, signal } from '@angular/core';

import { AssetsReceivablesReportRow, AssetsReceivablesReportSummary, Client } from '../models';
import { ReportStatusFilter } from '../models';

/**
 * Holds the Reportería de Activos y Cuentas por Cobrar page's checkboxes,
 * filters, and last-fetched results in a root-provided singleton — the
 * same `providedIn: 'root'` + signals technique `PurchaseDraftStore`/
 * `SalesDraftStore` already established for surviving component
 * destruction on route navigation (see those services' own doc comments).
 * Unlike a purchase/sale draft, there is nothing here to persist to
 * `sessionStorage`: this is read-only report state, not data the user is
 * building up that could be lost on an accidental reload — losing it just
 * means re-clicking "Consultar", so an in-memory signal is enough.
 */
@Injectable({ providedIn: 'root' })
export class AssetsReceivablesReportStateService {
  // Draft (form-bound) checkboxes/filters — edited freely, never drive the query directly.
  // Both types default checked so the page is immediately useful on first load, without
  // requiring the user to touch anything — the "select at least one" validation only ever
  // fires if the user actively unchecks both and then queries.
  readonly draftIncludeAssets = signal(true);
  readonly draftIncludeReceivables = signal(true);
  readonly draftClient = signal<Client | null>(null);
  readonly draftStartDate = signal('');
  readonly draftEndDate = signal('');
  readonly draftStatus = signal<ReportStatusFilter>('all');
  readonly draftSearch = signal('');

  // Applied (query-driving) checkboxes/filters — only change via applyFilters()/clearFilters() in the page component.
  readonly includeAssets = signal(true);
  readonly includeReceivables = signal(true);
  readonly client = signal<Client | null>(null);
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly status = signal<ReportStatusFilter>('all');
  readonly search = signal('');
  readonly page = signal(1);

  // Last-fetched results — restored as-is when the user navigates back, no refetch needed.
  readonly rows = signal<AssetsReceivablesReportRow[]>([]);
  readonly total = signal(0);
  readonly summary = signal<AssetsReceivablesReportSummary | null>(null);
  readonly hasQueried = signal(false);

  // Always false when the user isn't actively mid-request — not persisted state so much as
  // shared UI flags that need to live alongside the rest of this store.
  readonly loadingTable = signal(false);
  readonly loadingSummary = signal(false);
  readonly exporting = signal(false);
}
