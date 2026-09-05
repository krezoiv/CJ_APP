import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { Client, PriceListType } from '../../../../../core/models';
import { IconComponent } from '../../../../../shared/ui';
import { ClientSearchSelectComponent } from '../../../accounts-receivable/components/client-search-select/client-search-select.component';

/**
 * "Venta por mayor" — lets the cashier pick an optional client and a price
 * list (Público/Mayorista) for the receipt about to be built. Reuses
 * `ClientSearchSelectComponent` (already built for Cuentas por Cobrar)
 * rather than duplicating a client picker. Both fields are set once, before
 * or while the cart is empty — `locked` (driven by the parent's
 * `items().length > 0`) disables the price-list toggle once that stops
 * being true, mirroring the backend's own `PRICE_LIST_LOCKED` rule.
 */
@Component({
  selector: 'app-sale-pricing-bar',
  standalone: true,
  imports: [IconComponent, ClientSearchSelectComponent],
  templateUrl: './sale-pricing-bar.component.html',
  styleUrl: './sale-pricing-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalePricingBarComponent {
  @Input() clientId: string | null = null;
  @Input() clientName: string | null = null;
  @Input() priceList: PriceListType = 'PUBLIC';
  @Input() locked = false;
  @Input() disabled = false;

  @Output() configure = new EventEmitter<{ clientId: string | null; priceList: PriceListType }>();

  onClientChange(client: Client | null): void {
    this.configure.emit({ clientId: client?.id ?? null, priceList: this.priceList });
  }

  selectPriceList(priceList: PriceListType): void {
    if (this.locked || this.disabled || priceList === this.priceList) {
      return;
    }
    this.configure.emit({ clientId: this.clientId, priceList });
  }
}
