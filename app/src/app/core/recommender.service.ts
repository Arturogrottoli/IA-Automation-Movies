import { Injectable, signal } from '@angular/core';
import { DATA_BASE_URL } from './enrichment.service';
import { SimilarStub } from './models';

interface RawSimilarStub {
  t: string;
  y: number | null;
  d: string;
}

/**
 * Fetch de `similar_ajustado.json` (salida de `cerebro/build_similar_ajustado.py`
 * -- mismo candidate pool que similar.json, pero reponderado con señales
 * reales de taste_profile.json en vez de pesos fijos a mano). La lista "por
 * contenido" no se repite acá: ya está en `EnrichmentService` (similar.json).
 */
@Injectable({ providedIn: 'root' })
export class RecommenderService {
  readonly map = signal<Map<string, SimilarStub[]>>(new Map());

  private cached: Promise<Map<string, SimilarStub[]>> | null = null;

  load(): Promise<Map<string, SimilarStub[]>> {
    if (!this.cached) {
      this.cached = this.fetch().then((map) => {
        this.map.set(map);
        return map;
      });
    }
    return this.cached;
  }

  private async fetch(): Promise<Map<string, SimilarStub[]>> {
    try {
      const res = await fetch(DATA_BASE_URL + 'similar_ajustado.json');
      if (!res.ok) return new Map();
      const raw = (await res.json()) as Record<string, RawSimilarStub[]>;
      const map = new Map<string, SimilarStub[]>();
      for (const key of Object.keys(raw)) {
        map.set(
          key,
          raw[key].map((s): SimilarStub => ({ titulo: s.t, anioEstreno: s.y, director: s.d })),
        );
      }
      return map;
    } catch {
      return new Map();
    }
  }
}
