import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { SimDailyStock, formatQuantity } from '../../../../../core/models';

/**
 * Dumb, read-only table for the SIM block of the cuadre — Stock Inicial |
 * Compras | Ventas | Stock Final, one row per SIM type. Unlike
 * `RechargeTableComponent`, no cell is editable: "Stock Final" is always
 * `currentStock`, the live result of every purchase/sale that day — there
 * is no separate "confirm the close-out figure" step for physical stock
 * the way there is for the electronic balance's `finalBalance`.
 */
@Component({
  selector: 'app-sim-stock-table',
  standalone: true,
  imports: [],
  templateUrl: './sim-stock-table.component.html',
  styleUrl: './sim-stock-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimStockTableComponent {
  @Input() stocks: SimDailyStock[] = [];
  @Input() loading = false;

  formatQuantity = formatQuantity;
}
