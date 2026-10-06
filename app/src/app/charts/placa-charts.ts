import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { ChartEntry, Viewing } from '../core/models';
import { decadeOf, nf, splitDirectores, tally } from '../core/key.util';
import { BarChart } from '../shared/bar-chart/bar-chart';

function toEntries(counts: Map<string, number>): ChartEntry[] {
  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

@Component({
  selector: 'app-placa-charts',
  imports: [BarChart],
  templateUrl: './placa-charts.html',
  styleUrl: './placa-charts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaCharts {
  constructor(protected readonly catalog: CatalogDataService) {}

  private readonly viewings = computed(() => this.catalog.viewings());

  // --- por año ---
  protected readonly byYear = computed<ChartEntry[]>(() =>
    toEntries(tally(this.viewings(), (v: Viewing) => (v.anioVisto ? String(v.anioVisto) : ''))).sort(
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
    return `Promedio de ${avg} por año; el pico fue ${peak.label} con ${peak.value}. La barra clara es el año en curso.`;
  });

  // --- por década ---
  protected readonly byDecade = computed<ChartEntry[]>(() => {
    const counts = tally(this.viewings(), (v: Viewing) => {
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
    return `Los ${top.label} concentran ${top.value} títulos, pero la cola llega hasta 1925.`;
  });

  // --- por país ---
  protected readonly byCountry = computed<ChartEntry[]>(() =>
    toEntries(tally(this.viewings(), (v: Viewing) => v.paisOrigen))
      .filter((e) => e.label !== '—')
      .sort((a, b) => b.value - a.value)
      .slice(0, 12),
  );
  protected readonly countryObs = computed(() => {
    const arg = this.byCountry().find((e) => e.label === 'Argentina');
    return arg ? `Estados Unidos manda por lejos; Argentina es segunda con ${arg.value}.` : 'Estados Unidos manda por lejos.';
  });

  // --- directores ---
  // Mismo criterio que actores: películas distintas (antes contaba visionados y
  // decía "32 películas" de Scorsese, que son 25), codirecciones por separado
  // como en "¿Cuánto vi de…?", y los empatados con el 15° entran todos.
  protected readonly byDirector = computed<ChartEntry[]>(() => {
    const sorted = toEntries(tally(this.catalog.movies(), (m) => splitDirectores(m.director)))
      .filter((e) => e.label)
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'));
    const corte = sorted[14]?.value ?? 0;
    return sorted.filter((e, i) => i < 15 || e.value === corte);
  });
  protected readonly directorObs = computed(() => {
    const entries = this.byDirector();
    const top = entries[0];
    if (!top) return '';
    const empate = entries.length > 15 ? ` Con ${entries.at(-1)!.value} hay empate en el último puesto: entran todos.` : '';
    return `${top.label} encabeza con ${top.value} películas.${empate}`;
  });

  // --- género (TMDB) ---
  protected readonly byGenre = computed<ChartEntry[]>(() =>
    toEntries(tally(this.viewings(), (v: Viewing) => v.movie.genres))
      .sort((a, b) => b.value - a.value)
      .slice(0, 14),
  );
  protected readonly genreObs = computed(() => {
    const entries = this.byGenre();
    if (!entries.length) return '';
    const conGenero = this.viewings().filter((v) => v.movie.genres.length).length;
    return `${entries[0].label} arriba de todo (${entries[0].value}). Sobre ${nf(conGenero)} películas con género identificado.`;
  });

  // --- actores/actrices (TMDB) ---
  // Por película distinta, no por visionado: el texto dice "películas" y así
  // coincide con "¿Cuánto vi de…?" (antes una peli vista 3 veces sumaba 3).
  // Top 15, pero los empatados con el 15° entran todos: cortar un empate deja
  // afuera a alguien con el mismo número que el último que se ve.
  protected readonly byActor = computed<ChartEntry[]>(() => {
    const sorted = toEntries(tally(this.catalog.movies(), (m) => m.cast))
      .filter((e) => e.label)
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'));
    const corte = sorted[14]?.value ?? 0;
    return sorted.filter((e, i) => i < 15 || e.value === corte);
  });
  protected readonly actorObs = computed(() => {
    const entries = this.byActor();
    if (!entries.length) return '';
    const conActores = this.catalog.movies().filter((m) => m.cast.length).length;
    const empate = entries.length > 15 ? ` Con ${entries.at(-1)!.value} hay empate en el último puesto: entran todos.` : '';
    return `${entries[0].label} encabeza con ${entries[0].value} películas. Sobre ${nf(conActores)} películas con reparto identificado.${empate}`;
  });
}
