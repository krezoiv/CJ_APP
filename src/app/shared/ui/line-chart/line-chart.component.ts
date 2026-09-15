import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { CardComponent } from '../card/card.component';
import { IconComponent } from '../icon/icon.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

/** Wide, short "banner sparkline" proportions — spans the full card width without ever reading as tall. Same values `TransactionMonthlyChartComponent` already uses. */
const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 190;
const PADDING = { top: 10, right: 12, bottom: 20, left: 30 };
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

/** A rare, unique-enough id suffix so two `<app-line-chart>` instances on the same page never collide on the gradient's `id` (SVG `<defs>` ids are global to the document). */
let instanceCounter = 0;

export interface LineChartPoint {
  /** Short text for the X axis tick ("14", "Semana 2", "Sep"). */
  label: string;
  /** Longer text for the hover tooltip ("14 de septiembre", "Semana 2 (8-14 sep)", "Septiembre 2026"). */
  tooltipLabel: string;
  value: number;
  /** Draws the gold "today" marker on this point — set on at most one point, only when the series is fine-grained enough (daily) to have a real "today" column; omitted entirely for weekly/monthly series rather than guessing. */
  isToday?: boolean;
}

interface RenderedPoint {
  x: number;
  y: number;
  point: LineChartPoint;
  isMax: boolean;
  isMin: boolean;
}

/** "Nice" round ticks (1/2/5 × 10^n) for the Y axis — never a fixed scale, always derived from the real max. Identical to `TransactionMonthlyChartComponent`'s own helper. */
function computeYAxisMax(rawMax: number): number {
  if (rawMax <= 0) {
    return 5;
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

/** Just 0 / half / max — a compact chart reads better with fewer gridlines. */
function buildYAxisTicks(axisMax: number): number[] {
  return [0, Math.round(axisMax / 2), axisMax];
}

/** Catmull-Rom → cubic Bezier, uniform tension — passes exactly through every point, only the connecting segments are curved instead of straight. Standard 1/6 control-point scaling. Identical to `TransactionMonthlyChartComponent`'s own helper. */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Generic, presentational line chart — the exact same hand-rolled SVG
 * visual language `TransactionMonthlyChartComponent` already established
 * (smooth curve, gradient area fill, dashed 3-tick Y axis, sparse X-axis
 * labels, dark-pill hover tooltip, gold "today" marker, skeleton/error/
 * empty states inside an `app-card`), extracted into a reusable,
 * `@Input()`-driven component so a new chart never has to re-implement any
 * of it. `TransactionMonthlyChartComponent` itself is intentionally left
 * untouched — it stays self-contained (fetches its own data) and keeps
 * working byte-for-byte the same on Resumen/Transaccionar/Reporte de
 * Transacciones; this component is for every *other* chart that needs the
 * same look with its own data source.
 *
 * The caller owns fetching and mapping its data into `LineChartPoint[]` —
 * this component never knows about products/ventas/transacciones/etc.,
 * only labels and numbers, exactly like `BarcodeScannerModalComponent`'s
 * own "single responsibility, no business knowledge" precedent.
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CardComponent, IconComponent, EmptyStateComponent],
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent {
  @Input() points: LineChartPoint[] = [];
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() icon = 'trending-up';
  /** Appended after the formatted number in the tooltip: "38 {{valueLabel}}". Ignored when `formatValue` already embeds its own unit (e.g. currency) — pass `''` in that case. */
  @Input() valueLabel = 'transacciones';
  /** How `LineChartPoint.value` is rendered in the tooltip and the Pico/Mínimo pills — defaults to the plain number (counts). Pass `formatCurrency` for a money series. */
  @Input() formatValue: (value: number) => string = (value) => String(value);
  @Input() loading = false;
  @Input() loadError = false;
  @Input() emptyTitle = 'Sin datos registrados';
  @Input() emptyDescription = 'Aquí verás el comportamiento en cuanto haya datos registrados.';

  @Output() retry = new EventEmitter<void>();

  protected readonly gradientId = `line-chart-area-gradient-${++instanceCounter}`;

  readonly hoveredIndex = signal<number | null>(null);

  readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
  readonly aspectRatio = `${VIEW_WIDTH} / ${VIEW_HEIGHT}`;
  readonly plotRight = VIEW_WIDTH - PADDING.right;
  readonly plotLeft = PADDING.left;
  readonly plotBottom = PADDING.top + PLOT_HEIGHT;
  readonly xAxisLabelY = VIEW_HEIGHT - 4;

  readonly hasActivity = computed(() => this.points.some((p) => p.value > 0));

  private readonly maxValue = computed(() => this.points.reduce((max, p) => Math.max(max, p.value), 0));

  private readonly maxIndex = computed(() => {
    const points = this.points;
    if (points.length === 0) return -1;
    return points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  });

  private readonly minIndex = computed(() => {
    const points = this.points;
    if (points.length === 0) return -1;
    return points.reduce((best, p, i) => (p.value < points[best].value ? i : best), 0);
  });

  readonly maxPoint = computed(() => (this.maxIndex() >= 0 ? this.points[this.maxIndex()] : null));
  readonly minPoint = computed(() => (this.minIndex() >= 0 ? this.points[this.minIndex()] : null));

  private readonly axisMax = computed(() => computeYAxisMax(this.maxValue()));
  readonly yAxisTicks = computed(() => buildYAxisTicks(this.axisMax()));

  readonly chartPoints = computed<RenderedPoint[]>(() => {
    const points = this.points;
    const axisMax = this.axisMax();
    const maxIndex = this.maxIndex();
    const minIndex = this.minIndex();
    const denominator = points.length > 1 ? points.length - 1 : 1;

    return points.map((point, i) => ({
      x: PADDING.left + (i / denominator) * PLOT_WIDTH,
      y: PADDING.top + PLOT_HEIGHT - (point.value / axisMax) * PLOT_HEIGHT,
      point,
      isMax: i === maxIndex,
      isMin: i === minIndex && minIndex !== maxIndex,
    }));
  });

  readonly linePath = computed(() => buildSmoothPath(this.chartPoints()));

  readonly areaPath = computed(() => {
    const points = this.chartPoints();
    if (points.length === 0) return '';
    const baseline = PADDING.top + PLOT_HEIGHT;
    const first = points[0];
    const last = points[points.length - 1];
    return `${buildSmoothPath(points)} L${last.x.toFixed(2)},${baseline} L${first.x.toFixed(2)},${baseline} Z`;
  });

  /**
   * A series with few enough points (weekly ≈5, yearly ≤12) shows every
   * label — each one is a meaningfully distinct, short category name, not
   * noise. A finer-grained series (daily, up to 31 points) falls back to
   * the original sparse selection (first, every 5th, last) so labels never
   * overlap.
   */
  readonly labelPoints = computed(() => {
    const points = this.chartPoints();
    if (points.length <= 15) {
      return points;
    }
    return points.filter((p, i, all) => i === 0 || (i + 1) % 5 === 0 || i === all.length - 1);
  });

  readonly hoveredPoint = computed(() => {
    const index = this.hoveredIndex();
    return index === null ? null : (this.chartPoints()[index] ?? null);
  });

  /** The one point (if any) whose `LineChartPoint.isToday` is true — see that field's own doc comment for why this is never fabricated. */
  readonly todayMarker = computed(() => this.chartPoints().find((p) => p.point.isToday) ?? null);

  /** SVG y-coordinate for a given Y-axis tick value — the last (top) tick always equals `axisMax` by construction of `buildYAxisTicks`. */
  tickY(tick: number): number {
    const ticks = this.yAxisTicks();
    const axisMax = ticks[ticks.length - 1] || 1;
    return this.plotBottom - (tick / axisMax) * PLOT_HEIGHT;
  }

  onPointHover(index: number): void {
    this.hoveredIndex.set(index);
  }

  onPointLeave(): void {
    this.hoveredIndex.set(null);
  }

  /** Small downward-pointing triangle hovering just above the trend line at (x, y) — rides the curve's own height at that column. */
  todayMarkerPoints(x: number, y: number): string {
    const top = y - 11;
    const tip = y - 5;
    return `${(x - 4).toFixed(2)},${top} ${(x + 4).toFixed(2)},${top} ${x.toFixed(2)},${tip}`;
  }

  leftPercent(x: number): number {
    return (x / VIEW_WIDTH) * 100;
  }

  topPercent(y: number): number {
    return (y / VIEW_HEIGHT) * 100;
  }

  onRetry(): void {
    this.retry.emit();
  }
}
