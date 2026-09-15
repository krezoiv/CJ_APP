import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/ui';
import { RechargesDailyChartComponent } from '../components/recharges-daily-chart/recharges-daily-chart.component';
import { RechargesWeeklyChartComponent } from '../components/recharges-weekly-chart/recharges-weekly-chart.component';
import { RechargesYearlyChartComponent } from '../components/recharges-yearly-chart/recharges-yearly-chart.component';

/**
 * "Gráficas → Indicadores de Recargas" — puramente visual, mismo esqueleto
 * que "Indicadores de Transacciones"/"Indicadores de Ventas"/"Indicadores
 * de Compras".
 */
@Component({
  selector: 'app-recharges-indicators-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    RechargesDailyChartComponent,
    RechargesWeeklyChartComponent,
    RechargesYearlyChartComponent,
  ],
  templateUrl: './recharges-indicators-page.component.html',
  styleUrl: './recharges-indicators-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargesIndicatorsPageComponent {}
