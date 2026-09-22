import { Injectable, signal } from '@angular/core';
import { normalizeKey } from './key.util';

/**
 * Token de lectura de TMDB (scope "api_read", el mismo que usan los scripts
 * offline en cerebro/tmdb.key) — expuesto a propósito en el cliente, con el
 * usuario avisado: es de solo lectura, TMDB es gratis sin facturación, y el
 * límite de TMDB es por IP, no por token (developer.themoviedb.org/docs/rate-limiting).
 * Sitio lúdico, no hay nada sensible detrás de este token.
 */
const TMDB_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyYzRkNjIyOTJmNGRmYzI3OTliYjkxN2IzODBhZTFiNCIsIm5iZiI6MTc4ODgyODA2Ni44MjksInN1YiI6IjZhOWY1OWEyZTM0OTJlMmJiMDRiMTUwMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NSHR3ISSnourzx14izK0qLQTUdgLN82hLoELPLWsX8U';

export interface LiveRec {
  tmdbId: number;
  titulo: string;
  anioEstreno: number | null;
  poster: string | null;
  synopsis: string | null;
  rating: number | null;
}

/**
 * Recomendaciones en vivo de TMDB (`/movie/{id}/recommendations`) — a
 * diferencia de similar.json (precomputado, solo cubre lo que ya está en la
 * hoja), esto trae películas de TODO TMDB, incluidas las que el usuario
 * nunca vio ni anotó en ningún lado. Cacheado en memoria por tmdbId, no
 * persiste entre cargas de página (no hace falta — es liviano).
 */
@Injectable({ providedIn: 'root' })
export class TmdbLiveService {
  readonly cache = signal<Map<number, LiveRec[]>>(new Map());
  private readonly pending = new Set<number>();

  async load(tmdbId: number): Promise<void> {
    if (this.cache().has(tmdbId) || this.pending.has(tmdbId)) return;
    this.pending.add(tmdbId);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/recommendations?language=es`, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' },
      });
      const recs: LiveRec[] = [];
      if (res.ok) {
        const json = await res.json();
        for (const r of json.results ?? []) {
          const year = r.release_date ? +String(r.release_date).slice(0, 4) : null;
          if (!r.title || !year) continue;
          recs.push({
            tmdbId: r.id,
            titulo: r.title,
            anioEstreno: year,
            poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
            synopsis: r.overview || null,
            rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
          });
        }
      }
      this.cache.update((m) => new Map(m).set(tmdbId, recs));
    } catch {
      this.cache.update((m) => new Map(m).set(tmdbId, []));
    } finally {
      this.pending.delete(tmdbId);
    }
  }

  /** Busca entre todo lo ya cacheado — usado por el modal para armar la ficha de un "parecida" sin datos locales. */
  findByKey(key: string): LiveRec | null {
    for (const list of this.cache().values()) {
      const found = list.find((r) => normalizeKey(r.titulo, r.anioEstreno) === key);
      if (found) return found;
    }
    return null;
  }
}
