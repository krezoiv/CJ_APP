import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import {
  Client,
  CreateTicketItemInput,
  Product,
  TicketDraftItem,
  calculateTicketDraftItemTotal,
  calculateTicketDraftTotal,
  formatCurrency,
} from '../../../../../core/models';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { TicketsService } from '../../../../../core/services/tickets.service';
import { downloadBlob } from '../../../../../core/utils/download-blob';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';
import { ClientSearchSelectComponent } from '../../../accounts-receivable/components/client-search-select/client-search-select.component';
import { TicketProductSearchComponent } from '../ticket-product-search/ticket-product-search.component';

/**
 * A Ticket is explicitly NOT a real sale — the cart here is pure local
 * component state (never a server-side draft/reservation the way Ventas'
 * receipt is), since a ticket never reserves or affects inventory and has
 * nothing to protect against a race. Nothing is sent to the backend until
 * "Guardar Ticket".
 */
@Component({
  selector: 'app-create-ticket-tab',
  standalone: true,
  imports: [TicketProductSearchComponent, ClientSearchSelectComponent, EmptyStateComponent, IconComponent, ButtonComponent],
  templateUrl: './create-ticket-tab.component.html',
  styleUrl: './create-ticket-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTicketTabComponent {
  private readonly ticketsService = inject(TicketsService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

  readonly items = signal<TicketDraftItem[]>([]);
  readonly selectedClientId = signal<string | null>(null);
  readonly selectedClientName = signal<string | null>(null);
  readonly isSaving = signal(false);

  calculateItemTotal = calculateTicketDraftItemTotal;
  formatCurrency = formatCurrency;

  get total(): number {
    return calculateTicketDraftTotal(this.items());
  }

  onClientSelectionChange(client: Client | null): void {
    this.selectedClientId.set(client?.id ?? null);
    this.selectedClientName.set(client?.name ?? null);
  }

  onProductSelected(product: Product): void {
    const existing = this.items().find((item) => item.productId === product.id);
    if (existing) {
      this.updateQuantity(product.id, existing.quantity + 1);
      return;
    }
    this.items.update((items) => [
      ...items,
      { productId: product.id, name: product.name, sku: product.sku, unitPrice: product.publicPrice, quantity: 1, observation: '' },
    ]);
  }

  updateQuantity(productId: string, quantity: number): void {
    const safeQuantity = Math.max(quantity, 1);
    this.items.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, quantity: safeQuantity } : item)),
    );
  }

  updateObservation(productId: string, observation: string): void {
    this.items.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, observation } : item)),
    );
  }

  /**
   * Manual price override for this line, shown pre-filled with the product's
   * real current price. Only ever changes what's saved on this ticket's own
   * `ticket_details.unit_price` snapshot — never the product's real price in
   * the database (the backend never writes to `products` from `create_ticket`
   * regardless of what's sent here).
   */
  updatePrice(productId: string, unitPrice: number): void {
    const safePrice = Number.isFinite(unitPrice) ? Math.max(unitPrice, 0) : 0;
    this.items.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, unitPrice: safePrice } : item)),
    );
  }

  increment(item: TicketDraftItem): void {
    this.updateQuantity(item.productId, item.quantity + 1);
  }

  decrement(item: TicketDraftItem): void {
    this.updateQuantity(item.productId, item.quantity - 1);
  }

  removeItem(productId: string): void {
    this.items.update((items) => items.filter((item) => item.productId !== productId));
  }

  async saveTicket(): Promise<void> {
    if (this.items().length === 0 || this.isSaving()) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      type: 'SAVE',
      title: 'Guardar ticket',
      message: '¿Desea guardar este ticket? Un ticket no afecta el inventario ni se registra como una venta real.',
      confirmText: 'Guardar ticket',
    });
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    const items: CreateTicketItemInput[] = this.items().map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      observation: item.observation.trim() || undefined,
      unitPrice: item.unitPrice,
    }));

    this.ticketsService.createTicket({ clientId: this.selectedClientId() ?? undefined, items }).subscribe({
      next: (ticket) => {
        this.notificationService.success(`Ticket ${ticket.ticketNumber} registrado correctamente.`);
        this.items.set([]);
        this.selectedClientId.set(null);
        this.selectedClientName.set(null);
        // Auto-download the PDF — no yes/no prompt, unlike Ventas/Compras' post-save PDF modal.
        this.ticketsService.exportTicketPdf(ticket.id).subscribe({
          next: (blob) => {
            downloadBlob(blob, `${ticket.ticketNumber}.pdf`);
            this.isSaving.set(false);
          },
          error: () => {
            this.notificationService.error('El ticket se guardó, pero no se pudo generar el PDF automáticamente.');
            this.isSaving.set(false);
          },
        });
      },
      error: (error) => {
        this.notificationService.error(extractErrorMessage(error, 'No se pudo guardar el ticket.'));
        this.isSaving.set(false);
      },
    });
  }
}
