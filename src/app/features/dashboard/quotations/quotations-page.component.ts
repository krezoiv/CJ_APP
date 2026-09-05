import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { CreateQuotationTabComponent } from './components/create-quotation-tab/create-quotation-tab.component';
import { QuotationHistoryTabComponent } from './components/quotation-history-tab/quotation-history-tab.component';

type TabValue = 'crear' | 'historial';

/**
 * `Cotizaciones` — a document that is explicitly NOT a sale: it never
 * decrements/reserves inventory, never appears in Ventas' reports or the
 * dashboard, and needs no confirmation before generating its PDF (unlike
 * Ventas/Compras' own post-save PDF prompt). Every line's price/discount is
 * historicized at creation time. See the backend's own `create_quotation`
 * function for the structural guarantee.
 */
@Component({
  selector: 'app-quotations-page',
  standalone: true,
  imports: [CreateQuotationTabComponent, QuotationHistoryTabComponent],
  templateUrl: './quotations-page.component.html',
  styleUrl: './quotations-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationsPageComponent {
  readonly activeTab = signal<TabValue>('crear');

  selectTab(tab: TabValue): void {
    this.activeTab.set(tab);
  }
}
