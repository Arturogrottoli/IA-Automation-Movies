import { Injectable, signal } from '@angular/core';
import { TMDB_TOKEN } from './tmdb-live.service';

/** Una sugerencia de persona de TMDB (para el autocompletado, más allá del catálogo local). */
export interface PersonHit {
  id: number;
  nombre: string;
  rol: string;
}

/** Una película de la filmografía de la persona, como actor/actriz o como director. */
export interface PersonCredit {
  tmdbId: number;
  titulo: string;
  anioEstreno: number | null;
  poster: string | null;
  rating: number | null;
  votos: number;
  genres: string[];
  comoDirector: boolean;
  /** Orden en el reparto (0 = protagonista); null si solo dirigió. */
  ordenReparto: number | null;
}

export interface PersonFilmography {
  id: number;
  nombre: string;
  foto: string | null;
  rol: string;
  credits: PersonCredit[];
}

const AUTH = { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } };
const API = 'https://api.themoviedb.org/3';

const ROLES: Record<string, string> = { Acting: 'Actuación', Directing: 'Dirección', Writing: 'Guion', Production: 'Producción' };
const rolDe = (dept: string | undefined): string => ROLES[dept ?? ''] ?? dept ?? '';

interface RawCredit {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  job?: string;
  order?: number;
  character?: string;
}

/**
 * Buscador de personas en vivo (TMDB) para la Placa X: sugerencias por nombre
 * (`/search/person`) y filmografía completa (`/person/{id}/movie_credits`,
 * actuadas + dirigidas, con géneros). A diferencia de `ActorLiveService`, que
 * solo trae las 8 más populares para la fichita, acá hace falta TODO el
 * catálogo de la persona: para cruzarlo con lo visto y para elegir qué falta ver.
 * Cacheado en memoria, igual que el resto de los servicios en vivo.
 */
@Injectable({ providedIn: 'root' })
export class PersonSearchService {
  readonly filmographies = signal<Map<number, PersonFilmography | null>>(new Map());
  private readonly pending = new Set<number>();
  private readonly hitsCache = new Map<string, PersonHit[]>();
  private genres: Promise<Map<number, string>> | null = null;

  async search(query: string): Promise<PersonHit[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    const cached = this.hitsCache.get(q);
    if (cached) return cached;
    try {
      const res = await fetch(`${API}/search/person?query=${encodeURIComponent(q)}&language=es`, AUTH);
      if (!res.ok) return [];
      const json = await res.json();
      // Sin filtrar por departamento: hay directores que TMDB clasifica como
      // "Writing" (ej. Robert Hiltzik) y quedarían afuera.
      const hits: PersonHit[] = (json.results ?? [])
        .slice(0, 6)
        .map((p: { id: number; name: string; known_for_department?: string }) => ({
          id: p.id,
          nombre: p.name,
          rol: rolDe(p.known_for_department),
        }));
      this.hitsCache.set(q, hits);
      return hits;
    } catch {
      return [];
    }
  }

  /** Resuelve un nombre (ej. uno del catálogo local) al id de TMDB más probable. */
  async resolveId(nombre: string): Promise<number | null> {
    try {
      const res = await fetch(`${API}/search/person?query=${encodeURIComponent(nombre)}&language=es`, AUTH);
      if (!res.ok) return null;
      const json = await res.json();
      return json.results?.[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  async load(id: number): Promise<void> {
    if (this.filmographies().has(id) || this.pending.has(id)) return;
    this.pending.add(id);
    try {
      const [genreMap, personRes] = await Promise.all([
        this.loadGenres(),
        fetch(`${API}/person/${id}?language=es&append_to_response=movie_credits`, AUTH),
      ]);
      let result: PersonFilmography | null = null;
      if (personRes.ok) {
        const p = await personRes.json();
        const cast: RawCredit[] = p.movie_credits?.cast ?? [];
        const directed: RawCredit[] = (p.movie_credits?.crew ?? []).filter((c: RawCredit) => c.job === 'Director');
        const merged = new Map<number, PersonCredit>();
        const add = (c: RawCredit, comoDirector: boolean) => {
          if (!c.title) return;
          const prev = merged.get(c.id);
          if (prev) {
            prev.comoDirector ||= comoDirector;
            if (!comoDirector && c.order != null) prev.ordenReparto = Math.min(prev.ordenReparto ?? c.order, c.order);
            return;
          }
          merged.set(c.id, {
            tmdbId: c.id,
            titulo: c.title,
            anioEstreno: c.release_date ? +c.release_date.slice(0, 4) : null,
            poster: c.poster_path ? `https://image.tmdb.org/t/p/w185${c.poster_path}` : null,
            rating: c.vote_average ? Math.round(c.vote_average * 10) / 10 : null,
            votos: c.vote_count ?? 0,
            genres: (c.genre_ids ?? []).map((g) => genreMap.get(g)).filter((g): g is string => !!g),
            comoDirector,
            ordenReparto: comoDirector ? null : (c.order ?? null),
          });
        };
        // Apariciones como sí mismo (documentales, making-of) no son "su" película.
        for (const c of cast) if (!/\b(self|himself|herself|él mismo|ella misma)\b/i.test(c.character ?? '')) add(c, false);
        for (const c of directed) add(c, true);
        result = {
          id: p.id,
          nombre: p.name,
          foto: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
          rol: rolDe(p.known_for_department),
          credits: [...merged.values()],
        };
      }
      this.filmographies.update((m) => new Map(m).set(id, result));
    } catch {
      this.filmographies.update((m) => new Map(m).set(id, null));
    } finally {
      this.pending.delete(id);
    }
  }

  private loadGenres(): Promise<Map<number, string>> {
    this.genres ??= fetch(`${API}/genre/movie/list?language=es`, AUTH)
      .then((r) => (r.ok ? r.json() : { genres: [] }))
      .then((j) => new Map<number, string>((j.genres ?? []).map((g: { id: number; name: string }) => [g.id, g.name])))
      .catch(() => new Map<number, string>());
    return this.genres;
  }
}
