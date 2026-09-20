import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { ChartEntry, Movie } from '../core/models';
import { decadeOf } from '../core/key.util';
import { BarChart } from '../shared/bar-chart/bar-chart';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Mismos cortes que `cerebro/taste_profile.py` — una sola escala de duración en todo el sitio. */
const DUR_BINS: { max: number; label: string }[] = [
  { max: 80, label: '<80' },
  { max: 95, label: '80-95' },
  { max: 110, label: '95-110' },
  { max: 125, label: '110-125' },
  { max: 140, label: '125-140' },
  { max: 160, label: '140-160' },
  { max: Infinity, label: '160+' },
];

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function toDecadeEntries(movies: { anioEstreno: number | null }[]): ChartEntry[] {
  const counts = new Map<number, number>();
  for (const m of movies) {
    const d = decadeOf(m.anioEstreno);
    if (d == null) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([d, value]) => ({ label: `${d}s`, value }));
}

/**
 * Placa VI · dashboard más profundo — 100% signals sobre datos que ya están
 * cargados (catálogo + watchlist), sin JSON nuevo ni paso por Python. Mismo
 * esqueleto que placa-charts.ts (un `BarChart` reusado, sin cambios, por gráfico).
 */
@Component({
  selector: 'app-placa-dashboard',
  imports: [BarChart],
  templateUrl: './placa-dashboard.html',
  styleUrl: './placa-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaDashboard {
  constructor(
    private readonly catalog: CatalogDataService,
    private readonly watchlist: WatchlistDataService,
  ) {}

  private readonly viewings = computed(() => this.catalog.viewings());
  private readonly movies = computed(() => this.catalog.movies());

  // --- duración promedio por año ---
  protected readonly durPorAnio = computed<ChartEntry[]>(() => {
    const byYear = new Map<number, number[]>();
    for (const v of this.viewings()) {
      if (!v.anioVisto || v.movie.runtimeMin == null) continue;
      const arr = byYear.get(v.anioVisto) ?? [];
      arr.push(v.movie.runtimeMin);
      byYear.set(v.anioVisto, arr);
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, durs]) => ({ label: String(year), value: Math.round(avg(durs)) }));
  });
  protected readonly durPorAnioObs = computed(() => {
    const entries = this.durPorAnio();
    if (!entries.length) return '';
    const max = [...entries].sort((a, b) => b.value - a.value)[0];
    const min = [...entries].sort((a, b) => a.value - b.value)[0];
    return `El año con películas más largas en promedio fue ${max.label} (${max.value} min); el más corto, ${min.label} (${min.value} min).`;
  });

  // --- distribución de duración ---
  protected readonly durDistribucion = computed<ChartEntry[]>(() => {
    const counts = new Map(DUR_BINS.map((b) => [b.label, 0]));
    for (const m of this.movies()) {
      if (m.runtimeMin == null) continue;
      const bin = DUR_BINS.find((b) => m.runtimeMin! < b.max)!;
      counts.set(bin.label, (counts.get(bin.label) ?? 0) + 1);
    }
    return DUR_BINS.map((b) => ({ label: b.label, value: counts.get(b.label) ?? 0 }));
  });
  protected readonly durDistribucionObs = computed(() => {
    const entries = this.durDistribucion();
    const top = [...entries].sort((a, b) => b.value - a.value)[0];
    return top ? `El rango ${top.label} min concentra la mayoría, con ${top.value} películas.` : '';
  });

  // --- rating promedio por género ---
  protected readonly ratingPorGenero = computed<ChartEntry[]>(() => {
    const byGenre = new Map<string, number[]>();
    for (const v of this.viewings()) {
      if (v.movie.rating == null) continue;
      for (const g of v.movie.genres) {
        const arr = byGenre.get(g) ?? [];
        arr.push(v.movie.rating);
        byGenre.set(g, arr);
      }
    }
    return [...byGenre.entries()]
      .map(([label, ratings]) => ({ label, value: Math.round(avg(ratings) * 10) / 10 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 14);
  });
  protected readonly ratingPorGeneroObs = computed(() => {
    const entries = this.ratingPorGenero();
    return entries.length ? `${entries[0].label} tiene el rating promedio más alto (${entries[0].value}).` : '';
  });

  // --- estacionalidad ---
  protected readonly porMes = computed<ChartEntry[]>(() => {
    const counts = new Array(12).fill(0);
    for (const v of this.viewings()) {
      if (!v.fecha) continue;
      const m = +v.fecha.slice(5, 7) - 1;
      if (m >= 0 && m < 12) counts[m]++;
    }
    return MESES.map((label, i) => ({ label, value: counts[i] }));
  });
  protected readonly porMesObs = computed(() => {
    const entries = this.porMes();
    if (!entries.length) return '';
    const top = [...entries].sort((a, b) => b.value - a.value)[0];
    return `${top.label} es el mes con más películas vistas, sumando los ${new Set(this.viewings().map((v) => v.anioVisto)).size} años de registro.`;
  });

  // --- vistas vs. pendientes, por década ---
  protected readonly decadaVistas = computed<ChartEntry[]>(() => toDecadeEntries(this.movies() as Movie[]));
  protected readonly decadaPendientes = computed<ChartEntry[]>(() => toDecadeEntries(this.watchlist.items()));
}
