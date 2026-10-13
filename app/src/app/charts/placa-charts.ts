import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { CountModeService } from '../core/count-mode.service';
import { PeopleGenderService } from '../core/people-gender.service';
import { ChartEntry, Viewing } from '../core/models';
import { decadeOf, nf, splitDirectores, tally } from '../core/key.util';
import { BarChart } from '../shared/bar-chart/bar-chart';
import { CountToggle } from '../shared/count-toggle/count-toggle';

function toEntries(counts: Map<string, number>): ChartEntry[] {
  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

/** Cantidades a elegir en los rankings (directores, actores, directoras, actrices). */
export const CUANTOS = [10, 25, 50, 100] as const;
type Ranking = 'directores' | 'actores' | 'directoras' | 'actrices';

/** Lo que el texto tiene que aclarar sobre el corte: empate incluido entero, o empate enorme recortado. */
const cortes = new WeakMap<ChartEntry[], { tipo: 'empate' | 'recortado'; valor: number; afuera: number }>();

/**
 * Los N primeros, ordenados. Los empatados con el último entran todos (cortar
 * un empate deja afuera a alguien con el mismo número que el último que se
 * ve), salvo que el empate sea enorme (ej. decenas de directoras con 1
 * película): ahí se muestran solo los de arriba y el texto dice cuántos más hay.
 */
function topConEmpates(entries: ChartEntry[], n: number): ChartEntry[] {
  const sorted = entries.filter((e) => e.label).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'));
  if (sorted.length <= n) return sorted;
  const corte = sorted[n - 1].value;
  const conEmpates = sorted.filter((e, i) => i < n || e.value === corte);
  if (conEmpates.length <= n + Math.max(5, Math.ceil(n * 0.2))) {
    if (conEmpates.length > n) cortes.set(conEmpates, { tipo: 'empate', valor: corte, afuera: 0 });
    return conEmpates;
  }
  // Elegir algunos de los empatados sería arbitrario (orden alfabético).
  const arriba = sorted.filter((e) => e.value > corte);
  const top = arriba.length >= Math.ceil(n / 2) ? arriba : sorted.slice(0, n);
  cortes.set(top, { tipo: 'recortado', valor: corte, afuera: conEmpates.length - top.length });
  return top;
}

function empateObs(entries: ChartEntry[]): string {
  const c = cortes.get(entries);
  if (!c) return '';
  return c.tipo === 'empate'
    ? ` Con ${c.valor} hay empate en el último puesto: entran todos.`
    : ` Hay ${c.afuera} más con ${c.valor}, que no entran en el gráfico.`;
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
    private readonly people: PeopleGenderService,
  ) {
    this.people.load();
  }

  /** Cuántos mostrar en cada ranking (selector 10 · 25 · 50 · 100 de cada gráfico). */
  protected readonly opciones = CUANTOS;
  protected readonly cuantos = signal<Record<Ranking, number>>({ directores: 10, actores: 10, directoras: 10, actrices: 10 });

  protected setCuantos(r: Ranking, valor: string): void {
    this.cuantos.update((c) => ({ ...c, [r]: +valor }));
  }

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
    topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => splitDirectores(v.movie.director))), this.cuantos().directores),
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
    topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => v.movie.cast)), this.cuantos().actores),
  );
  protected readonly actorObs = computed(() => {
    const entries = this.byActor();
    if (!entries.length) return '';
    const conActores = this.rows().filter((v) => v.movie.cast.length).length;
    return `${entries[0].label} encabeza con ${entries[0].value} ${this.unidad()}. Cuenta el reparto principal (los 8 primeros de cada película); en "¿Cuánto vi de…?" entran también los cameos. Sobre ${nf(conActores)} ${this.unidad()} con reparto identificado.${empateObs(entries)}`;
  });

  // --- directoras (género según TMDB + correcciones a mano) ---
  /** Directoras de cada fila; la hoja solo guarda el nombre del director, el género sale de data/directors.json. */
  private directorasDe(v: Viewing): string[] {
    return (this.people.directors().get(v.movie.key) ?? []).filter((d) => this.people.director(d) === 'f').map((d) => d.n);
  }
  protected readonly byDirectora = computed<ChartEntry[]>(() =>
    topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => this.directorasDe(v))), this.cuantos().directoras),
  );
  protected readonly directoraObs = computed(() => {
    const entries = this.byDirectora();
    if (!entries.length) return '';
    const conDato = this.rows().filter((v) => this.people.directors().has(v.movie.key));
    const dirigidas = conDato.filter((v) => this.directorasDe(v).length).length;
    const total = new Set(conDato.flatMap((v) => this.directorasDe(v))).size;
    const pct = conDato.length ? Math.round((dirigidas / conDato.length) * 1000) / 10 : 0;
    const que = this.modes.mode() === 'unicas' ? 'películas dirigidas por mujeres' : 'visionados de películas dirigidas por mujeres';
    return `${total} directoras en total: ${nf(dirigidas)} ${que}, el ${pct.toLocaleString('es-AR')}% de ${nf(conDato.length)} con dirección identificada. ${entries[0].label} encabeza con ${entries[0].value}.${empateObs(entries)}`;
  });

  // --- actrices (reparto principal) ---
  protected readonly byActriz = computed<ChartEntry[]>(() =>
    this.people.loaded()
      ? topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => v.movie.cast.filter((n) => this.people.actor(n) === 'f'))), this.cuantos().actrices)
      : [],
  );
  protected readonly actrizObs = computed(() => {
    const entries = this.byActriz();
    return entries.length
      ? `${entries[0].label} encabeza con ${entries[0].value} ${this.unidad()}. Mismo criterio que el gráfico de arriba: reparto principal, sin cameos.${empateObs(entries)}`
      : '';
  });
}
