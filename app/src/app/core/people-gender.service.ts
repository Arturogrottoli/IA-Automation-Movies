import { Injectable, signal } from '@angular/core';
import { DATA_BASE_URL } from './enrichment.service';

/** "f" mujer · "m" hombre · "nb" no binario · "?" sin dato en TMDB. */
export type Genero = 'f' | 'm' | 'nb' | '?';

/**
 * Género de quienes dirigen y actúan, según TMDB (cerebro/build_directors.js y
 * build_cast_gender.js, en la sincronización diaria) más las correcciones a
 * mano de data/genero-manual.json. Lo usan los gráficos de directoras y
 * actrices; CinefilIA lee los mismos archivos del lado del servidor.
 */
@Injectable({ providedIn: 'root' })
export class PeopleGenderService {
  /** Clave de película → directores con su género. */
  readonly directors = signal<Map<string, { n: string; g: Genero }[]>>(new Map());
  private readonly reparto = signal<Record<string, Genero>>({});
  private readonly manual = signal<Record<string, Genero>>({});
  readonly loaded = signal(false);
  private started = false;

  load(): void {
    if (this.started) return;
    this.started = true;
    void Promise.all([grab('directors.json'), grab('genero-reparto.json'), grab('genero-manual.json')]).then(([d, r, m]) => {
      this.directors.set(new Map(Object.entries((d ?? {}) as Record<string, { n: string; g: Genero }[]>)));
      this.reparto.set((r ?? {}) as Record<string, Genero>);
      this.manual.set((m ?? {}) as Record<string, Genero>);
      this.loaded.set(true);
    });
  }

  /** Género de alguien del reparto (la corrección a mano gana si TMDB no lo tiene). */
  actor(name: string): Genero {
    const g = this.reparto()[name];
    return g && g !== '?' ? g : (this.manual()[name] ?? '?');
  }

  /** Género de quien dirige, con la misma regla. */
  director(d: { n: string; g: Genero }): Genero {
    return d.g !== '?' ? d.g : (this.manual()[d.n] ?? '?');
  }
}

async function grab(file: string): Promise<unknown> {
  try {
    const res = await fetch(DATA_BASE_URL + file);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
