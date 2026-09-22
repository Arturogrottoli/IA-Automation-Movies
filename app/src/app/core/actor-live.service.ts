import { Injectable, signal } from '@angular/core';
import { TMDB_TOKEN } from './tmdb-live.service';

export interface ActorKnownFor {
  tmdbId: number;
  titulo: string;
  anioEstreno: number | null;
  poster: string | null;
}

export interface ActorInfo {
  id: number;
  nombre: string;
  foto: string | null;
  knownFor: ActorKnownFor[];
}

interface RawCredit {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  popularity?: number;
  job?: string;
}

const AUTH = { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } };

/**
 * Ficha de persona en vivo desde TMDB — sirve para actores Y directores (es
 * la misma entidad "person" en TMDB). Dos llamados: `/search/person` para
 * resolver el id, y `/person/{id}/movie_credits` para el catálogo real de
 * películas (actuadas + dirigidas). El "known_for" de la búsqueda no alcanza
 * — es un resumen de lo más popular de la persona en CUALQUIER medio, y para
 * gente conocida sobre todo por TV (ej. Adrián Suar) puede salir vacío de
 * películas aunque tenga decenas de créditos de cine reales.
 */
@Injectable({ providedIn: 'root' })
export class ActorLiveService {
  readonly cache = signal<Map<string, ActorInfo | null>>(new Map());
  private readonly pending = new Set<string>();

  async load(nombre: string): Promise<void> {
    const key = nombre.trim().toLowerCase();
    if (!key || this.cache().has(key) || this.pending.has(key)) return;
    this.pending.add(key);
    try {
      const info = await this.fetchInfo(nombre);
      this.cache.update((m) => new Map(m).set(key, info));
    } catch {
      this.cache.update((m) => new Map(m).set(key, null));
    } finally {
      this.pending.delete(key);
    }
  }

  private async fetchInfo(nombre: string): Promise<ActorInfo | null> {
    const searchRes = await fetch(`https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(nombre)}&language=es`, AUTH);
    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json();
    const p = searchJson.results?.[0];
    if (!p) return null;

    const creditsRes = await fetch(`https://api.themoviedb.org/3/person/${p.id}/movie_credits?language=es`, AUTH);
    const credits = creditsRes.ok ? await creditsRes.json() : { cast: [], crew: [] };
    const asActor: RawCredit[] = credits.cast ?? [];
    const asDirector: RawCredit[] = (credits.crew ?? []).filter((c: RawCredit) => c.job === 'Director');

    const merged = new Map<number, RawCredit>();
    for (const m of [...asActor, ...asDirector]) {
      if (!m.title || !m.release_date) continue;
      const prev = merged.get(m.id);
      if (!prev || (m.popularity ?? 0) > (prev.popularity ?? 0)) merged.set(m.id, m);
    }

    const knownFor: ActorKnownFor[] = [...merged.values()]
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 8)
      .map((m) => ({
        tmdbId: m.id,
        titulo: m.title!,
        anioEstreno: +m.release_date!.slice(0, 4),
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null,
      }));

    return {
      id: p.id,
      nombre: p.name,
      foto: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
      knownFor,
    };
  }
}
