import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartEntry } from '../../core/models';
import { ChartTooltipService } from '../../core/chart-tooltip.service';

interface VBar {
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  valueY: number;
  labelY: number;
  soft: boolean;
  entry: ChartEntry;
}

interface Gridline {
  y: number;
}

interface HBar {
  y: number;
  labelY: number;
  barY: number;
  barHeight: number;
  barWidth: number;
  valueX: number;
  entry: ChartEntry;
}

const V_WIDTH = 640;
const V_HEIGHT = 250;
const V_PAD_B = 34;
const V_PAD_T = 18;
const V_PAD_L = 6;
const V_PAD_R = 6;
const V_GAP = 10;
const V_TICKS = 2;

const H_WIDTH = 640;
const H_ROW_H = 26;
const H_PAD_L = 0;
const H_PAD_R = 44;
const H_PAD_T = 4;
const H_LABEL_W = 168;
const H_TRACK_X = H_LABEL_W + 8;

/**
 * Gráfico de barras SVG a mano, portado de `vBars`/`hBars` del original —
 * un solo componente parametrizado por orientación, en vez de 12 gráficos
 * copy-pasteados. El tooltip flotante es compartido (ChartTooltipService),
 * disparado por (pointermove)/(pointerleave) en vez de onmousemove inline.
 */
@Component({
  selector: 'app-bar-chart',
  imports: [],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChart {
  readonly entries = input.required<ChartEntry[]>();
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  /** Resalta una barra en un tono más claro (ej. el año en curso, parcial). */
  readonly softKey = input<string | null>(null);

  protected readonly viewBox = computed(() => {
    if (this.orientation() === 'horizontal') {
      const h = H_PAD_T + this.entries().length * H_ROW_H + 4;
      return `0 0 ${H_WIDTH} ${h}`;
    }
    return `0 0 ${V_WIDTH} ${V_HEIGHT}`;
  });

  protected readonly baseY = V_HEIGHT - V_PAD_B;

  protected readonly gridlines = computed<Gridline[]>(() => {
    const max = Math.max(...this.entries().map((e) => e.value), 1);
    const lines: Gridline[] = [];
    for (let i = 1; i <= V_TICKS; i++) {
      const v = (max * i) / (V_TICKS + 1);
      const scaled = (V_HEIGHT - V_PAD_B - V_PAD_T) * (v / max);
      lines.push({ y: V_HEIGHT - V_PAD_B - scaled });
    }
    return lines;
  });

  protected readonly vBars = computed<VBar[]>(() => {
    const entries = this.entries();
    const max = Math.max(...entries.map((e) => e.value), 1);
    const n = entries.length || 1;
    const bw = (V_WIDTH - V_PAD_L - V_PAD_R - V_GAP * (n - 1)) / n;
    const scaleY = (v: number) => (V_HEIGHT - V_PAD_B - V_PAD_T) * (v / max);
    return entries.map((entry, i) => {
      const x = V_PAD_L + i * (bw + V_GAP);
      const height = Math.max(scaleY(entry.value), 1.5);
      const y = V_HEIGHT - V_PAD_B - height;
      return {
        x,
        y,
        width: bw,
        height,
        labelX: x + bw / 2,
        valueY: y - 5,
        labelY: V_HEIGHT - V_PAD_B + 15,
        soft: this.softKey() != null && entry.label === this.softKey(),
        entry,
      };
    });
  });

  protected readonly hBars = computed<HBar[]>(() => {
    const entries = this.entries();
    const max = Math.max(...entries.map((e) => e.value), 1);
    const trackW = H_WIDTH - H_TRACK_X - H_PAD_R;
    return entries.map((entry, i) => {
      const y = H_PAD_T + i * H_ROW_H;
      const width = Math.max(trackW * (entry.value / max), 2);
      return {
        y,
        labelY: y + H_ROW_H / 2 + 4,
        barY: y + 4,
        barHeight: H_ROW_H - 11,
        barWidth: width,
        valueX: H_TRACK_X + width + 7,
        entry,
      };
    });
  });

  protected readonly labelW = H_LABEL_W;
  protected readonly trackX = H_TRACK_X;
  protected readonly trackW = H_WIDTH - H_TRACK_X - H_PAD_R;
  protected readonly rowH = H_ROW_H;

  constructor(protected readonly tooltip: ChartTooltipService) {}

  protected onHover(event: MouseEvent, entry: ChartEntry, soft: boolean): void {
    this.tooltip.show(event, entry.label, entry.value, soft ? 'parcial' : undefined);
  }
}
