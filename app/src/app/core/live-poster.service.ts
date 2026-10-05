import { Injectable, signal } from '@angular/core';
import { TMDB_TOKEN } from './tmdb-live.service';

export interface LivePoster {
  poster: string | null;
  tmdbId: number;
}

interface Pending {
  key: string;
  titulo: string;
  anioEstreno: number | null;
}

const AUTH = { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } };
/** Tope por visita: alcanza para lo agregado en el día y no castiga a TMDB si algo sale mal. */
const MAX_POR_VISITA = 30;

/**
 * Póster en vivo para películas que todavía no están en posters.json — las
 * agregadas por el bot o el sitio desde la última sincronización diaria
 * (.github/workflows/sync-datos.yml). Las que sí están en posters.json, aunque
 * sea como "sin match", no se buscan: ya se intentó y TMDB no las tiene.
 * Mismo criterio de búsqueda que cerebro/build_posters.js (título + año).
 */
@Injectable({ providedIn: 'root' })
export class LivePosterService {
  readonly map = signal<Map<string, LivePoster>>(new Map());
  private readonly asked = new Set<string>();
  private queue: Pending[] = [];
  private running = false;

  request(items: Pending[]): void {
    for (const it of items) {
      if (this.asked.has(it.key) || this.asked.size >= MAX_POR_VISITA) continue;
      this.asked.add(it.key);
      this.queue.push(it);
    }
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const it = this.queue.shift()!;
      const found = await search(it.titulo, it.anioEstreno);
      if (found) this.map.update((m) => new Map(m).set(it.key, found));
    }
    this.running = false;
  }
}

async function search(titulo: string, anio: number | null): Promise<LivePoster | null> {
  const q = encodeURIComponent(titulo);
  const go = async (url: string) => {
    try {
      const res = await fetch(url, AUTH);
      return res.ok ? (await res.json()).results?.[0] : null;
    } catch {
      return null;
    }
  };
  const base = `https://api.themoviedb.org/3/search/movie?query=${q}&language=es`;
  const best = (anio ? await go(`${base}&year=${anio}`) : null) ?? (await go(base));
  return best ? { tmdbId: best.id, poster: best.poster_path ? `https://image.tmdb.org/t/p/w342${best.poster_path}` : null } : null;
}
