import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/ui';
import { DailyTransactionsChartComponent } from '../components/daily-transactions-chart/daily-transactions-chart.component';
import { WeeklyTransactionsChartComponent } from '../components/weekly-transactions-chart/weekly-transactions-chart.component';
import { YearlyTransactionsChartComponent } from '../components/yearly-transactions-chart/yearly-transactions-chart.component';

/**
 * "Gráficas → Indicadores de Transacciones" — puramente visual, sin
 * filtros/tabla/exportación (eso ya existe en Reportería de
 * Transacciones). Las 3 gráficas son autocontenidas (cada una hace su
 * propio fetch, mismo patrón que `TransactionMonthlyChartComponent`), así
 * que esta página solo las apila dentro de un `app-page-header`.
 */
@Component({
  selector: 'app-transaction-indicators-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    DailyTransactionsChartComponent,
    WeeklyTransactionsChartComponent,
    YearlyTransactionsChartComponent,
  ],
  templateUrl: './transaction-indicators-page.component.html',
  styleUrl: './transaction-indicators-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionIndicatorsPageComponent {}
