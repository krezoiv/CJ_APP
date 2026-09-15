import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/ui';
import { PurchasesDailyChartComponent } from '../components/purchases-daily-chart/purchases-daily-chart.component';
import { PurchasesWeeklyChartComponent } from '../components/purchases-weekly-chart/purchases-weekly-chart.component';
import { PurchasesYearlyChartComponent } from '../components/purchases-yearly-chart/purchases-yearly-chart.component';

/**
 * "Gráficas → Indicadores de Compras" — puramente visual, mismo esqueleto
 * que "Indicadores de Transacciones"/"Indicadores de Ventas".
 */
@Component({
  selector: 'app-purchases-indicators-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PurchasesDailyChartComponent,
    PurchasesWeeklyChartComponent,
    PurchasesYearlyChartComponent,
  ],
  templateUrl: './purchases-indicators-page.component.html',
  styleUrl: './purchases-indicators-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesIndicatorsPageComponent {}
