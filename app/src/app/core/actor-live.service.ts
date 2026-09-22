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

/**
 * Búsqueda en vivo de personas en TMDB (`/search/person`) — un solo llamado
 * trae foto + "known for" (títulos + pósters), sin necesitar una segunda
 * consulta a créditos. Cacheado por nombre (lowercase), `null` = buscado y
 * sin resultado (evita reintentar en loop).
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
      const res = await fetch(`https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(nombre)}&language=es`, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' },
      });
      let info: ActorInfo | null = null;
      if (res.ok) {
        const json = await res.json();
        const p = json.results?.[0];
        if (p) {
          info = {
            id: p.id,
            nombre: p.name,
            foto: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
            knownFor: (p.known_for ?? [])
              .filter((m: { media_type: string; title?: string }) => m.media_type === 'movie' && m.title)
              .slice(0, 6)
              .map(
                (m: { id: number; title: string; release_date?: string; poster_path?: string | null }): ActorKnownFor => ({
                  tmdbId: m.id,
                  titulo: m.title,
                  anioEstreno: m.release_date ? +m.release_date.slice(0, 4) : null,
                  poster: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null,
                }),
              ),
          };
        }
      }
      this.cache.update((m) => new Map(m).set(key, info));
    } catch {
      this.cache.update((m) => new Map(m).set(key, null));
    } finally {
      this.pending.delete(key);
    }
  }
}
