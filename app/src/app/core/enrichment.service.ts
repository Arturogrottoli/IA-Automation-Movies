import { Injectable, signal } from '@angular/core';
import { EnrichmentFields, SimilarStub } from './models';

interface RawPosterEntry {
  poster: string | null;
  rating: number | null;
  genres: string[];
  tmdb: number | null;
}

interface RawSimilarStub {
  t: string;
  y: number | null;
  d: string;
}

/**
 * Absoluta a propósito: estos JSON viven en la raíz del repo (los actualiza
 * cerebro/*.js/py de forma independiente al build de Angular), no dentro de
 * app/. Una ruta relativa solo resolvería bien si Angular se sirve desde esa
 * misma raíz — no en dev (`ng serve`) ni en un preview en subpath. Mismo
 * criterio que las URLs de los CSV (SHEET_CSV_URL), que ya son absolutas.
 */
const DATA_BASE_URL = 'https://arturogrottoli.github.io/IA-Automation-Movies/';

/**
 * Fetch + merge de los 6 JSON de enriquecimiento (TMDB, generados offline
 * por cerebro/build_*.js/py). Única fuente de esta lógica — CatalogDataService
 * y WatchlistDataService la comparten en vez de duplicar el fetch/merge.
 *
 * Semántica de merge replicada exacta del original: posters-manual.json pisa
 * la entrada COMPLETA de posters.json (no por campo), y solo cuando esa
 * entrada manual tiene `poster` truthy.
 */
@Injectable({ providedIn: 'root' })
export class EnrichmentService {
  /** Última resolución de `load()`, para lookups síncronos (ej. resolver un
   * "parecida" que no está ni en el catálogo ni en la watchlist). */
  readonly map = signal<Map<string, EnrichmentFields>>(new Map());

  private cached: Promise<Map<string, EnrichmentFields>> | null = null;

  /** Memoizado: aunque lo llamen varios servicios, el fetch de los 6 JSON pasa una sola vez. */
  load(): Promise<Map<string, EnrichmentFields>> {
    if (!this.cached) {
      this.cached = this.fetchAndMerge().then((merged) => {
        this.map.set(merged);
        return merged;
      });
    }
    return this.cached;
  }

  private async fetchAndMerge(): Promise<Map<string, EnrichmentFields>> {
    const [auto, manual, actors, runtime, synopsis, similar] = await Promise.all([
      this.grab<Record<string, RawPosterEntry>>('posters.json'),
      this.grab<Record<string, RawPosterEntry>>('posters-manual.json'),
      this.grab<Record<string, string[]>>('actors.json'),
      this.grab<Record<string, number>>('runtime.json'),
      this.grab<Record<string, string>>('synopsis.json'),
      this.grab<Record<string, RawSimilarStub[]>>('similar.json'),
    ]);

    const posters: Record<string, RawPosterEntry> = { ...(auto ?? {}) };
    if (manual) {
      for (const key of Object.keys(manual)) {
        const entry = manual[key];
        if (entry?.poster) posters[key] = entry;
      }
    }

    const keys = new Set<string>([
      ...Object.keys(posters),
      ...Object.keys(actors ?? {}),
      ...Object.keys(runtime ?? {}),
      ...Object.keys(synopsis ?? {}),
      ...Object.keys(similar ?? {}),
    ]);

    const merged = new Map<string, EnrichmentFields>();
    for (const key of keys) {
      const p = posters[key];
      const rawSimilar = similar?.[key] ?? [];
      merged.set(key, {
        poster: p?.poster ?? null,
        rating: p?.rating ?? null,
        genres: p?.genres ?? [],
        tmdbId: p?.tmdb ?? null,
        cast: actors?.[key] ?? [],
        runtimeMin: runtime?.[key] ?? null,
        synopsis: synopsis?.[key] ?? null,
        similar: rawSimilar.map(
          (s): SimilarStub => ({ titulo: s.t, anioEstreno: s.y, director: s.d }),
        ),
      });
    }
    return merged;
  }

  private async grab<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(DATA_BASE_URL + path);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }
}
