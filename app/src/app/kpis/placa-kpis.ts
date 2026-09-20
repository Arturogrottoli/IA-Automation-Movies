import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { ChartEntry, WatchInstance } from '../core/models';
import { BarChart } from '../shared/bar-chart/bar-chart';

const fmtFecha = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

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

  protected readonly porDia = computed<ChartEntry[]>(() => {
    const map = new Map<string, number>();
    for (const w of this.botInstances()) map.set(w.fecha, (map.get(w.fecha) ?? 0) + 1);
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([fecha, value]) => ({ label: fmtFecha(fecha), value }));
  });

  protected readonly pico = computed(() => Math.max(0, ...this.porDia().map((e) => e.value)));

  constructor(private readonly catalog: CatalogDataService) {}
}
