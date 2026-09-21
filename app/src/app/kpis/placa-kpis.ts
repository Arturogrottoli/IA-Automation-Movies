import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { ChartEntry, WatchInstance } from '../core/models';
import { BarChart } from '../shared/bar-chart/bar-chart';

type Granularidad = 'dia' | 'semana' | 'mes' | 'anio';

const fmtFecha = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Lunes de la semana ISO que contiene `fecha` (YYYY-MM-DD) — todo en UTC, sin líos de timezone. */
function inicioDeSemana(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7; // 0 = lunes
  date.setUTCDate(date.getUTCDate() - dow);
  return date.toISOString().slice(0, 10);
}

const GRANULARIDADES: { value: Granularidad; label: string; titulo: string }[] = [
  { value: 'dia', label: 'Por día', titulo: 'Registros por día' },
  { value: 'semana', label: 'Por semana', titulo: 'Registros por semana' },
  { value: 'mes', label: 'Por mes', titulo: 'Registros por mes' },
  { value: 'anio', label: 'Por año', titulo: 'Registros por año' },
];

/**
 * Placa VIII · KPIs de la automatización en sí, no del catálogo de películas.
 * Solo volumen (registros vía bot, `fuente = "Bot Telegram"`) — tasa de
 * aprobación y errores no dejan rastro en la hoja hoy (ver docs/kpis-operacion.md).
 * Contenido narrado, mismo formato no interactivo que la Placa V.
 */
@Component({
  selector: 'app-placa-kpis',
  imports: [BarChart],
  templateUrl: './placa-kpis.html',
  styleUrl: './placa-kpis.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaKpis {
  protected readonly granularidades = GRANULARIDADES;
  protected readonly granularidad = signal<Granularidad>('dia');

  protected readonly botInstances = computed<WatchInstance[]>(() =>
    this.catalog
      .movies()
      .flatMap((m) => m.watchInstances.filter((w) => w.fuente === 'Bot Telegram'))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0)),
  );

  protected readonly total = computed(() => this.botInstances().length);
  protected readonly primero = computed(() => this.botInstances()[0]?.fecha ?? null);
  protected readonly ultimo = computed(() => this.botInstances().at(-1)?.fecha ?? null);

  protected readonly spanDias = computed(() => {
    const p = this.primero();
    const u = this.ultimo();
    if (!p || !u) return 0;
    return Math.round((new Date(u).getTime() - new Date(p).getTime()) / 86400000) + 1;
  });

  protected readonly promedioStr = computed(() => (this.spanDias() ? (this.total() / this.spanDias()).toFixed(2) : '—'));

  /** Siempre por día exacto — la base para "pico en un mismo día", sin importar la granularidad elegida para el gráfico. */
  private readonly porDiaExacto = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const w of this.botInstances()) map.set(w.fecha, (map.get(w.fecha) ?? 0) + 1);
    return map;
  });

  protected readonly pico = computed(() => Math.max(0, ...this.porDiaExacto().values()));

  /** El gráfico: reagrupa `porDiaExacto` según la granularidad elegida. */
  protected readonly porPeriodo = computed<ChartEntry[]>(() => {
    const g = this.granularidad();
    if (g === 'dia') {
      return [...this.porDiaExacto().entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([fecha, value]) => ({ label: fmtFecha(fecha), value }));
    }
    const bucketOf = g === 'semana' ? inicioDeSemana : g === 'mes' ? (f: string) => f.slice(0, 7) : (f: string) => f.slice(0, 4);
    const labelOf =
      g === 'semana'
        ? (b: string) => fmtFecha(b)
        : g === 'mes'
          ? (b: string) => b
          : (b: string) => b;
    const map = new Map<string, number>();
    for (const [fecha, count] of this.porDiaExacto()) {
      const bucket = bucketOf(fecha);
      map.set(bucket, (map.get(bucket) ?? 0) + count);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([bucket, value]) => ({ label: labelOf(bucket), value }));
  });

  protected readonly tituloGrafico = computed(
    () => this.granularidades.find((g) => g.value === this.granularidad())?.titulo ?? 'Registros',
  );

  protected setGranularidad(value: string): void {
    this.granularidad.set(value as Granularidad);
  }

  constructor(private readonly catalog: CatalogDataService) {}
}
