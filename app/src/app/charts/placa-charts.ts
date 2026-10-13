import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
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

const TOP = 15;
const TOPE_CON_EMPATES = 20;
/** Cuando el empate es demasiado grande para mostrarlo entero: cuántos quedaron afuera y con qué número. */
const cortados = new WeakMap<ChartEntry[], { valor: number; afuera: number }>();

/**
 * Top 15 ordenado; los empatados con el 15° entran todos (cortar un empate deja
 * afuera a alguien con el mismo número que el último que se ve) — salvo que el
 * empate sea enorme (ej. decenas de directoras con 1 película): ahí se corta en
 * 15 y el texto dice cuántas más hay con ese número.
 */
function topConEmpates(entries: ChartEntry[]): ChartEntry[] {
  const sorted = entries.filter((e) => e.label).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'));
  const corte = sorted[TOP - 1]?.value ?? 0;
  const conEmpates = sorted.filter((e, i) => i < TOP || e.value === corte);
  if (conEmpates.length <= TOPE_CON_EMPATES) return conEmpates;
  // Empate enorme: mostrar solo a quienes superan ese número (elegir algunos de los
  // empatados sería arbitrario, por orden alfabético), salvo que queden muy pocos.
  const arriba = sorted.filter((e) => e.value > corte);
  const top = arriba.length >= 5 ? arriba : sorted.slice(0, TOP);
  cortados.set(top, { valor: corte, afuera: conEmpates.length - top.length });
  return top;
}

function empateObs(entries: ChartEntry[]): string {
  const c = cortados.get(entries);
  if (c) return ` Hay ${c.afuera} más con ${c.valor}, que no entran en el gráfico.`;
  return entries.length > TOP ? ` Con ${entries.at(-1)!.value} hay empate en el último puesto: entran todos.` : '';
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

  // --- directoras (género según TMDB + correcciones a mano) ---
  /** Directoras de cada fila; la hoja solo guarda el nombre del director, el género sale de data/directors.json. */
  private directorasDe(v: Viewing): string[] {
    return (this.people.directors().get(v.movie.key) ?? []).filter((d) => this.people.director(d) === 'f').map((d) => d.n);
  }
  protected readonly byDirectora = computed<ChartEntry[]>(() =>
    topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => this.directorasDe(v)))),
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
      ? topConEmpates(toEntries(tally(this.rows(), (v: Viewing) => v.movie.cast.filter((n) => this.people.actor(n) === 'f'))))
      : [],
  );
  protected readonly actrizObs = computed(() => {
    const entries = this.byActriz();
    return entries.length
      ? `${entries[0].label} encabeza con ${entries[0].value} ${this.unidad()}. Mismo criterio que el gráfico de arriba: reparto principal, sin cameos.${empateObs(entries)}`
      : '';
  });
}
