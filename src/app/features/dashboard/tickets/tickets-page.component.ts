import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { CreateTicketTabComponent } from './components/create-ticket-tab/create-ticket-tab.component';
import { TicketHistoryTabComponent } from './components/ticket-history-tab/ticket-history-tab.component';

type TabValue = 'crear' | 'historial';

/**
 * `Tickets` — a receipt that is explicitly NOT a real sale: it never
 * decrements/reserves inventory, never appears in Ventas' reports or the
 * dashboard, and needs no confirmation before generating its PDF (unlike
 * Ventas/Compras' own post-save PDF prompt). See the backend's own
 * `create_ticket` function for the structural guarantee.
 */
@Component({
  selector: 'app-tickets-page',
  standalone: true,
  imports: [CreateTicketTabComponent, TicketHistoryTabComponent],
  templateUrl: './tickets-page.component.html',
  styleUrl: './tickets-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsPageComponent {
  readonly activeTab = signal<TabValue>('crear');

  selectTab(tab: TabValue): void {
    this.activeTab.set(tab);
  }
}
