import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { CountModeService } from '../core/count-mode.service';
import { ChartEntry, Viewing } from '../core/models';
import { decadeOf, nf, splitDirectores, tally } from '../core/key.util';
import { BarChart } from '../shared/bar-chart/bar-chart';
import { CountToggle } from '../shared/count-toggle/count-toggle';

function toEntries(counts: Map<string, number>): ChartEntry[] {
  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

/** Top 15 ordenado; los empatados con el 15° entran todos (cortar un empate deja afuera a alguien con el mismo número que el último que se ve). */
function topConEmpates(entries: ChartEntry[]): ChartEntry[] {
  const sorted = entries.filter((e) => e.label).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'));
  const corte = sorted[14]?.value ?? 0;
  return sorted.filter((e, i) => i < 15 || e.value === corte);
}

function empateObs(entries: ChartEntry[]): string {
  return entries.length > 15 ? ` Con ${entries.at(-1)!.value} hay empate en el último puesto: entran todos.` : '';
}

@Component({
  selector: 'app-placa-charts',
  imports: [BarChart, CountToggle],
  templateUrl: './placa-charts.html',
  styleUrl: './placa-charts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaCharts {
  constructor(
    protected readonly catalog: CatalogDataService,
    private readonly modes: CountModeService,
  ) {}

  /**
   * Filas a contar según el selector "Sin repetir / Contando repetidas": una
   * por película o una por visionado. La de año agrupa por año visto: sin
   * repetir, una peli vista en 2019 y en 2022 suma en los dos años.
   */
  private readonly rows = computed(() => this.modes.rows(this.catalog.viewings()));
  private readonly rowsPorAnio = computed(() => this.modes.rows(this.catalog.viewings(), (v) => v.anioVisto));
  private readonly unidad = computed(() => this.modes.unit());

  // --- por año ---
  protected readonly byYear = computed<ChartEntry[]>(() =>
    toEntries(tally(this.rowsPorAnio(), (v: Viewing) => (v.anioVisto ? String(v.anioVisto) : ''))).sort(
      (a, b) => +a.label - +b.label,
    ),
  );
  protected readonly lastYear = computed(() => {
    const entries = this.byYear();
    return entries.length ? entries[entries.length - 1].label : null;
  });
  protected readonly yearObs = computed(() => {
    const entries = this.byYear();
    if (!entries.length) return '';
    const peak = [...entries].sort((a, b) => b.value - a.value)[0];
    const rest = entries.filter((e) => e.label !== this.lastYear());
    const avg = rest.length ? Math.round(rest.reduce((s, e) => s + e.value, 0) / rest.length) : 0;
    return `Promedio de ${avg} ${this.unidad()} por año; el pico fue ${peak.label} con ${peak.value}. La barra clara es el año en curso.`;
  });

  // --- por década ---
  protected readonly byDecade = computed<ChartEntry[]>(() => {
    const counts = tally(this.rows(), (v: Viewing) => {
      const d = decadeOf(v.movie.anioEstreno);
      return d ? String(d) : '';
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label: +label, value }))
      .sort((a, b) => a.label - b.label)
      .map((e) => ({ label: `${e.label}s`, value: e.value }));
  });
  protected readonly decadeObs = computed(() => {
    const entries = this.byDecade();
    if (!entries.length) return '';
    const top = [...entries].sort((a, b) => b.value - a.value)[0];
    return `Los ${top.label} concentran ${top.value} ${this.unidad()}, pero la cola llega hasta 1925.`;
  });

  // --- por país ---
  protected readonly byCountry = computed<ChartEntry[]>(() =>
    toEntries(tally(this.rows(), (v: Viewing) => v.paisOrigen))
      .filter((e) => e.label !== '—')
      .sort((a, b) => b.value - a.value)
      .slice(0, 12),
  );
  protected readonly countryObs = computed(() => {
    const arg = this.byCountry().find((e) => e.label === 'Argentina');
    return arg ? `Estados Unidos manda por lejos; Argentina es segunda con ${arg.value} ${this.unidad()}.` : 'Estados Unidos manda por lejos.';
  });

  // --- directores (codirecciones por separado, como en "¿Cuánto vi de…?") ---
  protected readonly byDirector = computed<ChartEntry[]>(() =>
    topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => splitDirectores(v.movie.director)))),
  );
  protected readonly directorObs = computed(() => {
    const entries = this.byDirector();
    const top = entries[0];
    return top ? `${top.label} encabeza con ${top.value} ${this.unidad()}.${empateObs(entries)}` : '';
  });

  // --- género (TMDB) ---
  protected readonly byGenre = computed<ChartEntry[]>(() =>
    toEntries(tally(this.rows(), (v: Viewing) => v.movie.genres))
      .sort((a, b) => b.value - a.value)
      .slice(0, 14),
  );
  protected readonly genreObs = computed(() => {
    const entries = this.byGenre();
    if (!entries.length) return '';
    const conGenero = this.rows().filter((v) => v.movie.genres.length).length;
    return `${entries[0].label} arriba de todo (${entries[0].value}). Sobre ${nf(conGenero)} ${this.unidad()} con género identificado.`;
  });

  // --- actores/actrices (TMDB) ---
  protected readonly byActor = computed<ChartEntry[]>(() =>
    topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => v.movie.cast))),
  );
  protected readonly actorObs = computed(() => {
    const entries = this.byActor();
    if (!entries.length) return '';
    const conActores = this.rows().filter((v) => v.movie.cast.length).length;
    return `${entries[0].label} encabeza con ${entries[0].value} ${this.unidad()}. Cuenta el reparto principal (los 8 primeros de cada película); en "¿Cuánto vi de…?" entran también los cameos. Sobre ${nf(conActores)} ${this.unidad()} con reparto identificado.${empateObs(entries)}`;
  });
}
