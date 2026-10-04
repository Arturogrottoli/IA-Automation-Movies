import { ChangeDetectionStrategy, Component, computed, effect, signal, untracked } from '@angular/core';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { ChartTooltipService } from '../core/chart-tooltip.service';
import { DialogService } from '../core/dialog.service';
import { TMDB_TOKEN } from '../core/tmdb-live.service';
import { NUMERIC_TO_A2 } from '../core/world-numeric';
import { countryCode, countryName } from '../core/countries.util';
import { deburr, normalizeKey } from '../core/key.util';
import { Movie } from '../core/models';

interface CountryShape {
  a2: string;
  nombre: string;
  d: string;
}

interface CountryOption {
  a2: string;
  nombre: string;
  vistas: number;
}

interface Suggestion {
  tmdbId: number;
  titulo: string;
  anioEstreno: number | null;
  poster: string | null;
  rating: number | null;
  enLista: boolean;
}

/** Escalones de la escala: las cantidades van de 1 a ~800, una escala lineal dejaría casi todo del mismo tono. */
export const BINS = [
  { min: 1, max: 1, label: '1' },
  { min: 2, max: 5, label: '2–5' },
  { min: 6, max: 20, label: '6–20' },
  { min: 21, max: 100, label: '21–100' },
  { min: 101, max: Infinity, label: '101+' },
];

const W = 960;
const H = 470;
const AUTH = { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } };

/**
 * Películas, Placa VI · mapa del mundo coloreado por cuántas películas de
 * cada país vio (país de origen, el primero si es coproducción). Buscar o
 * tocar un país muestra las vistas; si no hay ninguna, sugiere las mejor
 * puntuadas de ese país en TMDB (`/discover/movie?with_origin_country=`).
 * Geometría: world-atlas 110m (servida desde public/data), proyección
 * Natural Earth de d3-geo, dibujada una sola vez como paths SVG.
 */
@Component({
  selector: 'app-placa-world',
  templateUrl: './placa-world.html',
  styleUrl: './placa-world.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaWorld {
  protected readonly W = W;
  protected readonly H = H;
  protected readonly bins = BINS;
  protected readonly shapes = signal<CountryShape[]>([]);
  protected readonly selected = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly activeOpt = signal(0);
  protected readonly suggestions = signal<Suggestion[] | null>(null);

  /** Películas vistas por país (código de 2 letras). */
  private readonly byCountry = computed(() => {
    const m = new Map<string, Movie[]>();
    for (const movie of this.catalog.movies()) {
      const a2 = countryCode(movie.paisOrigen);
      if (!a2) continue;
      const list = m.get(a2);
      if (list) list.push(movie);
      else m.set(a2, [movie]);
    }
    return m;
  });

  protected readonly paises = computed(() => this.byCountry().size);

  /** Todos los países buscables: los del mapa más los que tienen películas y no tienen forma (ej. Hong Kong). */
  private readonly options = computed<CountryOption[]>(() => {
    const codes = new Set([...this.shapes().map((s) => s.a2), ...this.byCountry().keys()]);
    return [...codes]
      .map((a2) => ({ a2, nombre: countryName(a2), vistas: this.byCountry().get(a2)?.length ?? 0 }))
      .sort((a, b) => b.vistas - a.vistas || a.nombre.localeCompare(b.nombre, 'es'));
  });

  protected readonly matches = computed(() => {
    const q = deburr(this.query()).trim();
    if (!q) return [];
    return this.options()
      .filter((o) => {
        const n = deburr(o.nombre);
        return n.startsWith(q) || n.split(/[^a-z]+/).some((w) => w.startsWith(q));
      })
      .slice(0, 8);
  });

  /** Ranking completo para la vista de tabla (accesible sin el mapa). */
  protected readonly ranking = computed(() => this.options().filter((o) => o.vistas > 0));

  protected readonly selectedInfo = computed(() => {
    const a2 = this.selected();
    if (!a2) return null;
    const movies = [...(this.byCountry().get(a2) ?? [])].sort((a, b) => lastSeen(b).localeCompare(lastSeen(a)));
    return { a2, nombre: countryName(a2), movies };
  });

  constructor(
    private readonly catalog: CatalogDataService,
    private readonly watchlist: WatchlistDataService,
    private readonly tooltip: ChartTooltipService,
    private readonly dialog: DialogService,
  ) {
    void this.loadMap();
    // Sin vistas de ese país: sugerencias de TMDB.
    effect(() => {
      const info = this.selectedInfo();
      untracked(() => {
        this.suggestions.set(null);
        if (info && !info.movies.length) void this.loadSuggestions(info.a2);
      });
    });
  }

  private async loadMap(): Promise<void> {
    try {
      const topo = (await (await fetch('data/countries-110m.json')).json()) as Topology<{ countries: GeometryCollection<{ name: string }> }>;
      const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
      // Sin la Antártida: ocupa un tercio del alto y no tiene cine.
      const features = fc.features.filter((f) => f.id && f.id !== '010' && NUMERIC_TO_A2[String(f.id)]);
      const projection = geoNaturalEarth1().fitSize([W, H], { type: 'FeatureCollection', features } as FeatureCollection);
      const path = geoPath(projection);
      this.shapes.set(
        features.map((f: Feature<Geometry, { name: string }>) => {
          const a2 = NUMERIC_TO_A2[String(f.id)];
          return { a2, nombre: countryName(a2), d: path(f) ?? '' };
        }),
      );
    } catch {
      this.shapes.set([]);
    }
  }

  protected count(a2: string): number {
    return this.byCountry().get(a2)?.length ?? 0;
  }

  protected bin(a2: string): number {
    const n = this.count(a2);
    return n ? BINS.findIndex((b) => n >= b.min && n <= b.max) + 1 : 0;
  }

  protected hover(e: MouseEvent, s: CountryShape): void {
    const n = this.count(s.a2);
    this.tooltip.show(e, s.nombre, n, n === 1 ? 'película vista' : 'películas vistas');
  }

  protected hideTip(): void {
    this.tooltip.hide();
  }

  protected select(a2: string): void {
    this.selected.set(a2);
    this.query.set('');
    this.activeOpt.set(0);
  }

  protected updateQuery(v: string): void {
    this.query.set(v);
    this.activeOpt.set(0);
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.matches().length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.activeOpt.set((this.activeOpt() + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.activeOpt.set((this.activeOpt() - 1 + n) % n);
    } else if (e.key === 'Enter' && n) {
      e.preventDefault();
      this.select(this.matches()[this.activeOpt()].a2);
    } else if (e.key === 'Escape') {
      this.query.set('');
    }
  }

  protected openMovie(m: Movie): void {
    this.dialog.open({ key: m.key, titulo: m.titulo, director: m.director, anioEstreno: m.anioEstreno });
  }

  protected openSuggestion(s: Suggestion): void {
    this.dialog.open({
      key: normalizeKey(s.titulo, s.anioEstreno),
      titulo: s.titulo,
      director: '',
      anioEstreno: s.anioEstreno,
      poster: s.poster?.replace('/w185/', '/w342/') ?? null,
      tmdbId: s.tmdbId,
    });
  }

  private async loadSuggestions(a2: string): Promise<void> {
    const lista = this.watchlist.items();
    const listaIds = new Set(lista.map((i) => i.tmdbId).filter((x) => x != null));
    const fetchPage = async (minVotos: number) => {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?with_origin_country=${a2}&sort_by=vote_average.desc&vote_count.gte=${minVotos}&language=es&include_adult=false`,
        AUTH,
      );
      return res.ok ? ((await res.json()).results ?? []) : [];
    };
    try {
      // Países con poca producción en TMDB: si con 150 votos no hay casi nada, se baja el piso.
      let results = await fetchPage(150);
      if (results.length < 4) results = await fetchPage(20);
      if (this.selected() !== a2) return;
      this.suggestions.set(
        results.slice(0, 8).map((r: { id: number; title: string; release_date?: string; poster_path?: string | null; vote_average?: number }) => ({
          tmdbId: r.id,
          titulo: r.title,
          anioEstreno: r.release_date ? +r.release_date.slice(0, 4) : null,
          poster: r.poster_path ? `https://image.tmdb.org/t/p/w185${r.poster_path}` : null,
          rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
          enLista: listaIds.has(r.id),
        })),
      );
    } catch {
      if (this.selected() === a2) this.suggestions.set([]);
    }
  }
}

function lastSeen(m: Movie): string {
  return m.watchInstances.at(-1)?.fecha ?? '';
}
