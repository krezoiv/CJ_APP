import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Client,
  CreateQuotationItemInput,
  Product,
  QuotationDraftItem,
  calculateQuotationDraftDiscount,
  calculateQuotationDraftItemTotal,
  calculateQuotationDraftSubtotal,
  calculateQuotationDraftTotal,
  formatCurrency,
} from '../../../../../core/models';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { QuotationsService } from '../../../../../core/services/quotations.service';
import { downloadBlob } from '../../../../../core/utils/download-blob';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';
import { ClientSearchSelectComponent } from '../../../accounts-receivable/components/client-search-select/client-search-select.component';
import { QuotationProductSearchComponent } from '../quotation-product-search/quotation-product-search.component';

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * A Cotización is explicitly NOT a sale — the cart here is pure local
 * component state (never a server-side draft/reservation), since a
 * cotización never reserves or affects inventory. Nothing is sent to the
 * backend until "Guardar Cotización". Unlike Ticket's cart, each line
 * carries an editable discount, and the running totals show three lines
 * (Subtotal/Descuento/Total) computed with the exact same math
 * `create_quotation()` uses server-side.
 */
@Component({
  selector: 'app-create-quotation-tab',
  standalone: true,
  imports: [
    FormsModule,
    QuotationProductSearchComponent,
    ClientSearchSelectComponent,
    EmptyStateComponent,
    IconComponent,
    ButtonComponent,
  ],
  templateUrl: './create-quotation-tab.component.html',
  styleUrl: './create-quotation-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateQuotationTabComponent {
  private readonly quotationsService = inject(QuotationsService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

  readonly items = signal<QuotationDraftItem[]>([]);
  readonly selectedClientId = signal<string | null>(null);
  readonly selectedClientName = signal<string | null>(null);
  readonly expirationDate = signal(todayIsoDate());
  readonly observations = signal('');
  readonly commercialTerms = signal('');
  readonly isSaving = signal(false);
  readonly clientError = signal(false);
  readonly dateError = signal(false);

  readonly today = todayIsoDate();

  calculateItemTotal = calculateQuotationDraftItemTotal;
  formatCurrency = formatCurrency;

  get subtotal(): number {
    return calculateQuotationDraftSubtotal(this.items());
  }

  get discountTotal(): number {
    return calculateQuotationDraftDiscount(this.items());
  }

  get total(): number {
    return calculateQuotationDraftTotal(this.items());
  }

  onClientSelectionChange(client: Client | null): void {
    this.selectedClientId.set(client?.id ?? null);
    this.selectedClientName.set(client?.name ?? null);
    if (client) {
      this.clientError.set(false);
    }
  }

  onExpirationDateChange(value: string): void {
    this.expirationDate.set(value);
    this.dateError.set(value < this.today);
  }

  onProductSelected(product: Product): void {
    const existing = this.items().find((item) => item.productId === product.id);
    if (existing) {
      this.updateQuantity(product.id, existing.quantity + 1);
      return;
    }
    this.items.update((items) => [
      ...items,
      { productId: product.id, name: product.name, sku: product.sku, unitPrice: product.publicPrice, quantity: 1, discount: 0 },
    ]);
  }

  updateQuantity(productId: string, quantity: number): void {
    const safeQuantity = Math.max(quantity, 1);
    this.items.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, quantity: safeQuantity } : item)),
    );
  }

  updateDiscount(productId: string, discount: number): void {
    const safeDiscount = Math.max(discount || 0, 0);
    this.items.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, discount: safeDiscount } : item)),
    );
  }

  increment(item: QuotationDraftItem): void {
    this.updateQuantity(item.productId, item.quantity + 1);
  }

  decrement(item: QuotationDraftItem): void {
    this.updateQuantity(item.productId, item.quantity - 1);
  }

  removeItem(productId: string): void {
    this.items.update((items) => items.filter((item) => item.productId !== productId));
  }

  async saveQuotation(): Promise<void> {
    if (this.items().length === 0 || this.isSaving()) {
      return;
    }

    const clientId = this.selectedClientId();
    if (!clientId) {
      this.clientError.set(true);
      this.notificationService.error('Debe seleccionar un cliente para la cotización.');
      return;
    }
    if (this.expirationDate() < this.today) {
      this.dateError.set(true);
      this.notificationService.error('La fecha de vencimiento no puede ser anterior a hoy.');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      type: 'SAVE',
      title: 'Guardar cotización',
      message: '¿Desea guardar esta cotización? Una cotización no afecta el inventario ni se registra como una venta real.',
      confirmText: 'Guardar cotización',
    });
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    const items: CreateQuotationItemInput[] = this.items().map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      discount: item.discount,
    }));

    this.quotationsService
      .createQuotation({
        clientId,
        expirationDate: this.expirationDate(),
        observations: this.observations().trim() || undefined,
        commercialTerms: this.commercialTerms().trim() || undefined,
        items,
      })
      .subscribe({
        next: (quotation) => {
          this.notificationService.success(`Cotización ${quotation.quotationNumber} registrada correctamente.`);
          this.resetForm();
          // Auto-download the PDF — no yes/no prompt, unlike Ventas/Compras' post-save PDF modal.
          this.quotationsService.exportQuotationPdf(quotation.id).subscribe({
            next: (blob) => {
              downloadBlob(blob, `${quotation.quotationNumber}.pdf`);
              this.isSaving.set(false);
            },
            error: () => {
              this.notificationService.error('La cotización se guardó, pero no se pudo generar el PDF automáticamente.');
              this.isSaving.set(false);
            },
          });
        },
        error: (error) => {
          this.notificationService.error(extractErrorMessage(error, 'No se pudo guardar la cotización.'));
          this.isSaving.set(false);
        },
      });
  }

  private resetForm(): void {
    this.items.set([]);
    this.selectedClientId.set(null);
    this.selectedClientName.set(null);
    this.expirationDate.set(this.today);
    this.observations.set('');
    this.commercialTerms.set('');
    this.clientError.set(false);
    this.dateError.set(false);
  }
}
