import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Product, ProductPresentation, PurchasePaymentType, Supplier } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { PdfPromptModalService } from '../../../core/services/pdf-prompt-modal.service';
import { PurchaseDraft, PurchaseDraftStore } from '../../../core/services/purchase-draft.store';
import { PurchasesService } from '../../../core/services/purchases.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { PurchaseProductSearchComponent } from './components/purchase-product-search/purchase-product-search.component';
import { PurchaseItemsTableComponent } from './components/purchase-items-table/purchase-items-table.component';
import { PurchaseSummaryComponent } from './components/purchase-summary/purchase-summary.component';
import { CancelConfirmModalComponent } from './components/cancel-confirm-modal/cancel-confirm-modal.component';
import { SaveConfirmModalComponent } from './components/save-confirm-modal/save-confirm-modal.component';

/**
 * All invoice state (supplier/date/items/total, for every open tab) lives in
 * `PurchaseDraftStore`, a root-provided singleton persisted to
 * `sessionStorage` — this component is purely a thin view over whichever
 * draft is currently active. That's what makes navigating away (e.g. to
 * Inventario) and back lose nothing, and what makes an accidental reload
 * lose nothing either. The tab bar (`draft.drafts()`) is what lets a cashier
 * work on several unrelated invoices at once — see `PurchaseDraftStore`'s
 * own doc comment for why this is Compras-only and not also on Ventas.
 */
@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [
    FormsModule,
    PurchaseProductSearchComponent,
    PurchaseItemsTableComponent,
    PurchaseSummaryComponent,
    CancelConfirmModalComponent,
    SaveConfirmModalComponent,
  ],
  templateUrl: './purchases-page.component.html',
  styleUrl: './purchases-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesPageComponent {
  private readonly purchasesService = inject(PurchasesService);
  private readonly supplierService = inject(SupplierService);
  private readonly notificationService = inject(NotificationService);
  private readonly pdfPromptModalService = inject(PdfPromptModalService);
  protected readonly draft = inject(PurchaseDraftStore);

  /** Real, active suppliers from the backend — never hardcoded. */
  readonly suppliers = signal<Supplier[]>([]);
  readonly isSaving = signal(false);

  /** Non-`null` while the close/cancel confirmation is open, holding the id of the tab it targets — set by either the "Cancelar" action (the active tab) or a tab's own "×" (any tab, active or not). */
  readonly closeConfirmDraftId = signal<string | null>(null);
  readonly isSaveConfirmOpen = signal(false);

  readonly selectedSupplierName = computed(() => {
    const supplier = this.suppliers().find((s) => s.id === this.draft.supplierId());
    return supplier?.name ?? '';
  });

  /** The raw `yyyy-MM-dd` signal as a real `Date`, for the confirmation modal's display pipe. */
  readonly purchaseDateAsDate = computed(() => new Date(`${this.draft.purchaseDate()}T00:00:00`));

  constructor() {
    this.supplierService.getSuppliers().subscribe({
      next: (suppliers) => this.suppliers.set(suppliers),
      error: () => this.notificationService.error('No se pudieron cargar los proveedores.'),
    });
  }

  onSupplierChange(supplierId: string): void {
    this.draft.setSupplier(supplierId);
  }

  onDateChange(date: string): void {
    this.draft.setPurchaseDate(date);
  }

  onPaymentTypeChange(paymentType: PurchasePaymentType): void {
    this.draft.setPaymentType(paymentType);
  }

  onPaymentDueDateChange(date: string): void {
    this.draft.setPaymentDueDate(date);
  }

  onProductSelected(product: Product): void {
    this.draft.onProductSelected(product);
  }

  onQuantityChange(change: { productId: string; quantity: number }): void {
    this.draft.updateQuantity(change.productId, change.quantity);
  }

  onCostPriceChange(change: { productId: string; costPrice: number }): void {
    this.draft.updateCostPrice(change.productId, change.costPrice);
  }

  onPublicPriceChange(change: { productId: string; publicPrice: number }): void {
    this.draft.updatePublicPrice(change.productId, change.publicPrice);
  }

  onPresentationChange(change: { productId: string; presentation: ProductPresentation | null }): void {
    this.draft.updatePresentation(change.productId, change.presentation);
  }

  onRemoveItem(productId: string): void {
    this.draft.removeItem(productId);
  }

  // ---- Tabs (multiple simultaneous compras) ----

  /** Supplier name if chosen, else a stable positional label — never blank, so an empty new tab is still identifiable in the bar. */
  draftLabel(draftItem: PurchaseDraft): string {
    const supplier = this.suppliers().find((s) => s.id === draftItem.supplierId);
    if (supplier) {
      return supplier.name;
    }
    const index = this.draft.drafts().findIndex((d) => d.id === draftItem.id);
    return `Compra ${index + 1}`;
  }

  draftHasItems(draftItem: PurchaseDraft): boolean {
    return draftItem.items.length > 0;
  }

  switchDraft(id: string): void {
    this.draft.setActiveDraft(id);
  }

  openNewDraft(): void {
    this.draft.openNewDraft();
  }

  /** Explicit "×" on a tab — targets that specific draft, whether or not it's the active one. */
  requestCloseTab(id: string): void {
    const target = this.draft.drafts().find((d) => d.id === id);
    if (!target || target.items.length === 0) {
      this.draft.closeDraft(id);
      return;
    }
    this.closeConfirmDraftId.set(id);
  }

  /** "Cancelar" in the summary panel — always targets whichever tab is currently active. */
  requestCancel(): void {
    this.requestCloseTab(this.draft.activeDraftId());
  }

  confirmCloseTab(): void {
    const id = this.closeConfirmDraftId();
    this.closeConfirmDraftId.set(null);
    if (id) {
      this.draft.closeDraft(id);
    }
  }

  dismissCancel(): void {
    this.closeConfirmDraftId.set(null);
  }

  requestSave(): void {
    if (!this.draft.supplierId() || this.draft.items().length === 0 || this.isSaving()) {
      return;
    }
    if (this.draft.paymentType() === 'CREDITO' && !this.draft.paymentDueDate()) {
      this.notificationService.error('Selecciona la fecha de pago para una compra a crédito.');
      return;
    }
    this.isSaveConfirmOpen.set(true);
  }

  dismissSaveConfirm(): void {
    if (this.isSaving()) {
      return;
    }
    this.isSaveConfirmOpen.set(false);
  }

  confirmSave(): void {
    if (this.isSaving()) {
      return;
    }

    // Captured up front, not re-read from `activeDraftId()` inside the
    // response handler — the confirm modal is a blocking overlay so the
    // active tab can't actually change mid-request, but closing the exact
    // tab that was submitted (rather than "whatever is active now") is the
    // correct guarantee to code for regardless.
    const savedDraftId = this.draft.activeDraftId();

    this.isSaving.set(true);
    this.purchasesService
      .createPurchase({
        supplierId: this.draft.supplierId(),
        purchaseDate: new Date(`${this.draft.purchaseDate()}T00:00:00`).toISOString(),
        items: this.draft.items().map((item) => ({
          productId: item.productId,
          presentationId: item.presentationId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          publicPrice: item.publicPrice,
        })),
        paymentType: this.draft.paymentType(),
        paymentDueDate: this.draft.paymentType() === 'CREDITO' ? this.draft.paymentDueDate() : undefined,
      })
      .subscribe({
        next: (purchase) => {
          this.isSaving.set(false);
          this.isSaveConfirmOpen.set(false);
          this.draft.closeDraft(savedDraftId);
          this.notificationService.success('Compra registrada correctamente.');
          this.pdfPromptModalService.prompt({
            title: 'Compra registrada',
            generate: () => this.purchasesService.exportPurchasePdf(purchase.id),
            filename: `compra-${purchase.id.slice(0, 8)}.pdf`,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.isSaveConfirmOpen.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la compra.'));
        },
      });
  }
}
