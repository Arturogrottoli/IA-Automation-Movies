import { Injectable, signal } from '@angular/core';
import { DATA_BASE_URL } from './enrichment.service';
import { TasteProfile } from './models';

/**
 * Fetch de `taste_profile.json` (salida de `cerebro/taste_profile.py`,
 * pandas + sklearn corrido offline — no en vivo, no depende de Make).
 * Mismo patrón mínimo que `EnrichmentService`: memoizado, expuesto como signal.
 */
@Injectable({ providedIn: 'root' })
export class TasteProfileService {
  readonly profile = signal<TasteProfile | null>(null);

  private cached: Promise<TasteProfile | null> | null = null;

  load(): Promise<TasteProfile | null> {
    if (!this.cached) {
      this.cached = this.fetch().then((profile) => {
        this.profile.set(profile);
        return profile;
      });
    }
    return this.cached;
  }

  private async fetch(): Promise<TasteProfile | null> {
    try {
      const res = await fetch(DATA_BASE_URL + 'taste_profile.json');
      if (!res.ok) return null;
      return (await res.json()) as TasteProfile;
    } catch {
      return null;
    }
  }
}
