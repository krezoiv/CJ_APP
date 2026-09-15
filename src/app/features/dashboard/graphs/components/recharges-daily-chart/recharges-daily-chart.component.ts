import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { RechargesDailyStat } from '../../../../../core/models';
import { RechargesService } from '../../../../../core/services/recharges.service';
import { formatCurrency } from '../../../../../core/utils/number-format.util';
import { LineChartComponent, LineChartPoint } from '../../../../../shared/ui';

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * "Recargas del mes" en Gráficas → Indicadores de Recargas — reutiliza
 * `RechargesService.getDailyStats()`. Venta total combinada Claro + Tigo
 * (nunca separada por operador — confirmado con el usuario).
 */
@Component({
  selector: 'app-recharges-daily-chart',
  standalone: true,
  imports: [LineChartComponent],
  templateUrl: './recharges-daily-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargesDailyChartComponent {
  private readonly rechargesService = inject(RechargesService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  private readonly days = signal<RechargesDailyStat[]>([]);

  formatCurrency = formatCurrency;

  readonly points = computed<LineChartPoint[]>(() => {
    const todayIso = todayIsoDate();
    return this.days().map((day) => {
      const dayNumber = Number(day.date.slice(-2));
      const monthIndex = Number(day.date.slice(5, 7)) - 1;
      return {
        label: String(dayNumber),
        tooltipLabel: `${dayNumber} de ${MONTH_NAMES_ES[monthIndex]}`,
        value: day.amount,
        isToday: day.date === todayIso,
      };
    });
  });

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.rechargesService.getDailyStats().subscribe({
      next: (stats) => {
        this.days.set(stats.days);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
