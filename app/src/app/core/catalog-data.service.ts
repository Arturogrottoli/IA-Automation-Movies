import { Injectable, computed, signal } from '@angular/core';
import { parseCsv } from './csv.util';
import { canonDir, canonPais, normalizeKey } from './key.util';
import { EMPTY_ENRICHMENT, EnrichmentFields, Movie, Viewing } from './models';
import { EnrichmentService } from './enrichment.service';

// Publicado desde Google Sheets ("Publicar en la web"), pestaña catalogo_completo.
const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQix1DRbjfgI7Cm-2-52QLMrGrTaDt_B5tHsGd8QV6wqb_jJfduRa1q1kVezcrz0okXo-gtVybYe3zX/pub?gid=1860980534&single=true&output=csv';

const SNAPSHOT_URL = 'data/catalog-snapshot.json';

/** [titulo, director, anio_estreno, pais_origen, fecha_vista, anio_visto, fuente] */
type RawWatchRow = [string, string, number | null, string, string, number | null, string];

/**
 * Dueño de los datos del catálogo (pestaña catalogo_completo): lee la
 * instantánea embebida para pintar al instante, la reemplaza si el CSV en
 * vivo responde, y une todo con el enriquecimiento de TMDB en `Movie[]`.
 * Mismo patrón que el `DATA`/`EMBEDDED`/`LIVE` del index.html original.
 */
@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  private readonly rawRows = signal<RawWatchRow[]>([]);
  private readonly enrichmentMap = signal<Map<string, EnrichmentFields>>(new Map());

  readonly live = signal(false);
  readonly loading = computed(() => this.rawRows().length === 0);
  readonly movies = computed<Movie[]>(() => this.buildMovies(this.rawRows(), this.enrichmentMap()));

  /** Una fila por visionado (una peli revisitada aparece varias veces) — lo que usa la tabla. */
  readonly viewings = computed<Viewing[]>(() =>
    this.movies().flatMap((movie) =>
      movie.watchInstances.map((w) => ({
        movie,
        fecha: w.fecha,
        anioVisto: w.anioVisto,
        director: w.director,
        paisOrigen: w.paisOrigen,
      })),
    ),
  );

  constructor(private readonly enrichment: EnrichmentService) {
    void this.loadSnapshot().then((rows) => {
      if (rows && !this.live()) this.rawRows.set(rows);
    });
    void this.enrichment.load().then((map) => this.enrichmentMap.set(map));
    void this.loadLive().then((rows) => {
      if (rows?.length) {
        this.rawRows.set(rows);
        this.live.set(true);
      }
    });
  }

  private buildMovies(rows: RawWatchRow[], enrichmentMap: Map<string, EnrichmentFields>): Movie[] {
    const groups = new Map<string, RawWatchRow[]>();
    for (const row of rows) {
      const titulo = row[0];
      if (!titulo?.trim()) continue;
      const key = normalizeKey(titulo, row[2]);
      const group = groups.get(key);
      if (group) group.push(row);
      else groups.set(key, [row]);
    }

    const movies: Movie[] = [];
    for (const [key, group] of groups) {
      const [titulo, director, anioEstreno, paisOrigen] = group[0];
      const watchInstances = group
        .map((r) => ({
          fecha: (r[4] || '').slice(0, 10),
          anioVisto: r[5],
          director: canonDir(r[1]),
          paisOrigen: canonPais(r[3]),
          fuente: r[6] || '',
        }))
        .filter((w) => w.fecha)
        .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
      const enrichmentEntry = enrichmentMap.get(key) ?? EMPTY_ENRICHMENT;
      movies.push({
        key,
        titulo,
        director: canonDir(director),
        anioEstreno,
        paisOrigen: canonPais(paisOrigen),
        watchInstances,
        ...enrichmentEntry,
      });
    }
    return movies;
  }

  private async loadSnapshot(): Promise<RawWatchRow[] | null> {
    try {
      const res = await fetch(SNAPSHOT_URL);
      if (!res.ok) return null;
      const rows = (await res.json()) as RawWatchRow[];
      return rows.length ? rows : null;
    } catch {
      return null;
    }
  }

  private async loadLive(): Promise<RawWatchRow[] | null> {
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
      if (!res.ok) return null;
      const rows = parseCsv(await res.text());
      const header = rows[0].map((x) => x.trim());
      const idx = (k: string) => header.indexOf(k);
      const c = {
        t: idx('titulo'),
        d: idx('director'),
        ay: idx('anio_estreno'),
        p: idx('pais_origen'),
        f: idx('fecha_vista'),
        vy: idx('anio_visto'),
        fu: idx('fuente'),
      };
      if (c.t < 0) return null;
      const out: RawWatchRow[] = rows
        .slice(1)
        .filter((r) => r.length > c.t && (r[c.t] || '').trim())
        .map((r) => [r[c.t], r[c.d] || '', +r[c.ay] || null, r[c.p] || '', r[c.f] || '', +r[c.vy] || null, r[c.fu] || '']);
      return out.length ? out : null;
    } catch {
      return null;
    }
  }
}
