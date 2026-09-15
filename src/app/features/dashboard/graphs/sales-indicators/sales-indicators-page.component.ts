import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/ui';
import { SalesDailyChartComponent } from '../components/sales-daily-chart/sales-daily-chart.component';
import { SalesWeeklyChartComponent } from '../components/sales-weekly-chart/sales-weekly-chart.component';
import { SalesYearlyChartComponent } from '../components/sales-yearly-chart/sales-yearly-chart.component';

/**
 * "Gráficas → Indicadores de Ventas" — puramente visual, mismo esqueleto
 * que "Indicadores de Transacciones". Las 3 gráficas son autocontenidas
 * (cada una hace su propio fetch), esta página solo las apila.
 */
@Component({
  selector: 'app-sales-indicators-page',
  standalone: true,
  imports: [PageHeaderComponent, SalesDailyChartComponent, SalesWeeklyChartComponent, SalesYearlyChartComponent],
  templateUrl: './sales-indicators-page.component.html',
  styleUrl: './sales-indicators-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesIndicatorsPageComponent {}
