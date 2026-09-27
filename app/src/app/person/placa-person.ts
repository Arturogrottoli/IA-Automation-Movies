import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { TasteProfileService } from '../core/taste-profile.service';
import { DialogService } from '../core/dialog.service';
import { PersonCredit, PersonHit, PersonSearchService } from '../core/person-search.service';
import { deburr, normalizeKey, splitDirectores } from '../core/key.util';
import { Movie } from '../core/models';

/** Una persona del catálogo local: director/a (columna director) o reparto (actors.json). */
interface LocalPerson {
  nombre: string;
  movieKeys: Set<string>;
  dirige: boolean;
  actua: boolean;
}

/** Una sugerencia del autocompletado: del catálogo (con cuántas viste) o solo de TMDB. */
interface Suggestion {
  nombre: string;
  detalle: string;
  local: LocalPerson | null;
  tmdbId: number | null;
}

interface WatchedEntry {
  movie: Movie;
  comoDirector: boolean;
  vecesVista: number;
}

interface RecEntry {
  credit: PersonCredit;
  score: number;
  enLista: boolean;
}

// Promedio bayesiano del rating de TMDB: con pocos votos, tira hacia C.
const PRIOR_VOTOS = 150;
const PRIOR_RATING = 6.3;
const MIN_VOTOS = 200;

/**
 * Placa X · buscar un actor/actriz o director/a. Autocompleta primero con la
 * gente que ya está en el catálogo (con cuántas películas suyas viste) y
 * después con TMDB en vivo, para gente de la que todavía no viste nada.
 * Al elegir: filmografía completa de TMDB cruzada contra lo visto, y las que
 * faltan, ordenadas por rating (bayesiano, para no premiar 3 votos de 10)
 * ajustado por la tasa de revisión de sus géneros en el perfil de gusto.
 */
@Component({
  selector: 'app-placa-person',
  imports: [],
  templateUrl: './placa-person.html',
  styleUrl: './placa-person.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaPerson {
  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly open = signal(false);
  private readonly tmdbHits = signal<PersonHit[]>([]);
  private readonly selectedName = signal<string | null>(null);
  private readonly selectedId = signal<number | null>(null);
  protected readonly notFound = signal(false);

  /** Todas las personas del catálogo, por nombre sin tildes. */
  private readonly people = computed(() => {
    const map = new Map<string, LocalPerson>();
    const add = (nombre: string, key: string, dirige: boolean) => {
      const k = deburr(nombre).trim();
      if (!k) return;
      let p = map.get(k);
      if (!p) map.set(k, (p = { nombre, movieKeys: new Set(), dirige: false, actua: false }));
      p.movieKeys.add(key);
      if (dirige) p.dirige = true;
      else p.actua = true;
    };
    for (const m of this.catalog.movies()) {
      for (const d of splitDirectores(m.director)) add(d, m.key, true);
      for (const a of m.cast) add(a, m.key, false);
    }
    return map;
  });

  protected readonly suggestions = computed<Suggestion[]>(() => {
    const q = deburr(this.query()).trim();
    if (!q || this.selectedName()) return [];
    const tokens = q.split(/\s+/);
    const local = [...this.people().entries()]
      .filter(([k]) => {
        const words = k.split(/[\s.-]+/);
        return k.includes(q) || tokens.every((t) => words.some((w) => w.startsWith(t)));
      })
      .map(([k, p]) => ({ p, starts: k.startsWith(q) }))
      .sort((a, b) => b.p.movieKeys.size - a.p.movieKeys.size || Number(b.starts) - Number(a.starts))
      .slice(0, 6)
      .map(({ p }): Suggestion => ({
        nombre: p.nombre,
        detalle: `${p.movieKeys.size} vista${p.movieKeys.size === 1 ? '' : 's'} · ${this.rolLabel(p)}`,
        local: p,
        tmdbId: null,
      }));
    const seen = new Set(local.map((s) => deburr(s.nombre)));
    const remote = this.tmdbHits()
      .filter((h) => !seen.has(deburr(h.nombre)))
      .slice(0, 8 - local.length)
      .map((h): Suggestion => {
        const p = this.people().get(deburr(h.nombre));
        return { nombre: h.nombre, detalle: p ? `${p.movieKeys.size} vistas · ${this.rolLabel(p)}` : `TMDB · ${h.rol}`, local: p ?? null, tmdbId: h.id };
      });
    return [...local, ...remote];
  });

  protected readonly filmography = computed(() => {
    const id = this.selectedId();
    return id == null ? undefined : this.personSearch.filmographies().get(id);
  });

  protected readonly selectedLabel = computed(() => this.filmography()?.nombre ?? this.selectedName());

  protected readonly watched = computed<WatchedEntry[]>(() => {
    const f = this.filmography();
    const name = this.selectedName();
    if (!f && !name) return [];
    const byId = new Map((f?.credits ?? []).map((c) => [c.tmdbId, c]));
    const local = this.people().get(deburr(f?.nombre ?? name ?? ''));
    const out: WatchedEntry[] = [];
    for (const m of this.catalog.movies()) {
      const credit = m.tmdbId != null ? byId.get(m.tmdbId) : undefined;
      if (!credit && !local?.movieKeys.has(m.key)) continue;
      const comoDirector = credit?.comoDirector ?? splitDirectores(m.director).some((d) => deburr(d) === deburr(local!.nombre));
      out.push({ movie: m, comoDirector, vecesVista: m.watchInstances.length });
    }
    return out.sort((a, b) => (b.movie.anioEstreno ?? 0) - (a.movie.anioEstreno ?? 0));
  });

  protected readonly vistasTotales = computed(() => this.watched().reduce((n, w) => n + w.vecesVista, 0));
  protected readonly comoDirector = computed(() => this.watched().filter((w) => w.comoDirector).length);

  /** "Revisitás el X% de sus películas" — solo si está en el perfil de gusto (mínimo de n del script). */
  protected readonly tasaRevision = computed(() => {
    const nombre = this.selectedLabel();
    const rates = this.taste.profile()?.dir_rate_full ?? [];
    return nombre ? (rates.find((r) => deburr(r.director) === deburr(nombre)) ?? null) : null;
  });

  protected readonly recs = computed<RecEntry[]>(() => {
    const f = this.filmography();
    if (!f) return [];
    const watchedIds = new Set(this.catalog.movies().map((m) => m.tmdbId).filter((id) => id != null));
    // Por título sin año también: TMDB a veces tiene la misma peli dos veces
    // (ej. un corte de festival del año anterior) y no queremos recomendarla.
    const watchedTitles = new Set(this.watched().map((w) => normalizeKey(w.movie.titulo, null)));
    const lista = this.watchlist.items();
    const listaIds = new Set(lista.map((i) => i.tmdbId).filter((id) => id != null));
    const listaKeys = new Set(lista.map((i) => i.key));
    const rates = new Map((this.taste.profile()?.genre_rate_full ?? []).map((g) => [g.genero, g.tasa]));
    const avgRate = rates.size ? [...rates.values()].reduce((a, b) => a + b, 0) / rates.size : 0;
    const thisYear = new Date().getFullYear();

    return f.credits
      // Piso de votos alto a propósito: deja afuera cortos y rarezas que TMDB lista igual.
      .filter((c) => c.anioEstreno && c.anioEstreno <= thisYear && c.votos >= MIN_VOTOS)
      .filter((c) => c.comoDirector || (c.ordenReparto ?? 99) <= 6)
      .filter((c) => !watchedIds.has(c.tmdbId) && !watchedTitles.has(normalizeKey(c.titulo, null)))
      .map((c): RecEntry => {
        const bayes = (c.votos * (c.rating ?? 0) + PRIOR_VOTOS * PRIOR_RATING) / (c.votos + PRIOR_VOTOS);
        const gr = c.genres.map((g) => rates.get(g)).filter((r): r is number => r != null);
        const afinidad = gr.length && avgRate ? gr.reduce((a, b) => a + b, 0) / gr.length / avgRate : 1;
        // Empujón suave (±10% como mucho): el rating manda, el género desempata.
        const factor = Math.min(1.1, Math.max(0.9, 1 + 0.3 * (afinidad - 1)));
        const enLista = listaIds.has(c.tmdbId) || listaKeys.has(normalizeKey(c.titulo, c.anioEstreno));
        return { credit: c, score: bayes * factor, enLista };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  });

  constructor(
    private readonly catalog: CatalogDataService,
    private readonly watchlist: WatchlistDataService,
    private readonly taste: TasteProfileService,
    private readonly personSearch: PersonSearchService,
    private readonly movieDialog: DialogService,
  ) {
    void this.taste.load();
    // Sugerencias de TMDB, con debounce: solo mientras se escribe, no con alguien elegido.
    effect((onCleanup) => {
      const q = this.query();
      if (this.selectedName() || q.trim().length < 3) {
        this.tmdbHits.set([]);
        return;
      }
      const t = setTimeout(async () => {
        const hits = await this.personSearch.search(q);
        if (this.query() === q) this.tmdbHits.set(hits);
      }, 300);
      onCleanup(() => clearTimeout(t));
    });
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
    this.selectedName.set(null);
    this.selectedId.set(null);
    this.notFound.set(false);
    this.active.set(0);
    this.open.set(true);
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.suggestions().length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.open.set(true);
      this.active.set((this.active() + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.active.set((this.active() - 1 + n) % n);
    } else if (e.key === 'Enter' && n && this.open()) {
      e.preventDefault();
      this.select(this.suggestions()[this.active()]);
    } else if (e.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected onBlur(): void {
    // Diferido: si el blur viene de clickear una sugerencia, el click tiene que llegar primero.
    setTimeout(() => this.open.set(false), 150);
  }

  protected async select(s: Suggestion): Promise<void> {
    this.query.set(s.nombre);
    this.selectedName.set(s.nombre);
    this.open.set(false);
    const id = s.tmdbId ?? (await this.personSearch.resolveId(s.nombre));
    if (this.selectedName() !== s.nombre) return; // cambió la búsqueda mientras tanto
    if (id == null) {
      this.notFound.set(true);
      return;
    }
    this.selectedId.set(id);
    void this.personSearch.load(id);
  }

  protected clear(): void {
    this.updateQuery('');
    this.open.set(false);
  }

  protected openWatched(m: Movie): void {
    this.movieDialog.open({ key: m.key, titulo: m.titulo, director: m.director, anioEstreno: m.anioEstreno });
  }

  protected openCredit(c: PersonCredit): void {
    this.movieDialog.open({
      key: normalizeKey(c.titulo, c.anioEstreno),
      titulo: c.titulo,
      director: '',
      anioEstreno: c.anioEstreno,
      poster: c.poster?.replace('/w185/', '/w342/') ?? null,
      tmdbId: c.tmdbId,
    });
  }

  private rolLabel(p: LocalPerson): string {
    return p.dirige && p.actua ? 'dirección y actuación' : p.dirige ? 'dirección' : 'actuación';
  }
}
