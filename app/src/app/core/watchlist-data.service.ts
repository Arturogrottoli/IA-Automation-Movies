import { Injectable, computed, signal } from '@angular/core';
import { parseCsv } from './csv.util';
import { canonDir, canonPais, normalizeKey } from './key.util';
import { EMPTY_ENRICHMENT, WatchlistItem } from './models';
import { EnrichmentService } from './enrichment.service';

const POR_VER_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQix1DRbjfgI7Cm-2-52QLMrGrTaDt_B5tHsGd8QV6wqb_jJfduRa1q1kVezcrz0okXo-gtVybYe3zX/pub?gid=1297033198&single=true&output=csv';

const POR_VER_WEBHOOK_URL = 'https://hook.us2.make.com/fknhoyw2eqb3b92x1j4ihsurmbpi3kdb';

interface RawPvRow {
  titulo: string;
  director: string;
  anioEstreno: number | null;
  paisOrigen: string;
  genero: string;
  agregadaEl: string;
}

/**
 * Dueño de la pestaña por_ver: lee el CSV (sin instantánea embebida, igual
 * que el original), enriquece con TMDB, y expone el único camino de
 * escritura de todo el sitio: agregar/quitar, optimista + POST fire-and-forget
 * al mismo webhook de Make que ya usa el sitio actual.
 */
@Injectable({ providedIn: 'root' })
export class WatchlistDataService {
  private readonly rawItems = signal<WatchlistItem[]>([]);
  readonly loaded = signal(false);

  readonly items = computed(() => this.rawItems());

  constructor(private readonly enrichment: EnrichmentService) {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const [rows, enrichmentMap] = await Promise.all([this.loadRaw(), this.enrichment.load()]);
    const items = rows.map((row) => {
      const key = normalizeKey(row.titulo, row.anioEstreno);
      const enrichmentEntry = enrichmentMap.get(key) ?? EMPTY_ENRICHMENT;
      return {
        key,
        titulo: row.titulo,
        director: canonDir(row.director),
        anioEstreno: row.anioEstreno,
        paisOrigen: canonPais(row.paisOrigen),
        genero: row.genero,
        agregadaEl: row.agregadaEl,
        ...enrichmentEntry,
      };
    });
    this.rawItems.set(items);
    this.loaded.set(true);
  }

  /** Título libre — Make completa director/año/país/género vía Gemini, igual que el bot. */
  async add(titulo: string): Promise<boolean> {
    try {
      await fetch(POR_VER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'agregar', titulo, director: '', anio_estreno: '', pais_origen: '' }),
      });
      const optimistic: WatchlistItem = {
        key: normalizeKey(titulo, null),
        titulo,
        director: '',
        anioEstreno: null,
        paisOrigen: '—',
        genero: '',
        agregadaEl: new Date().toISOString().slice(0, 10),
        ...EMPTY_ENRICHMENT,
      };
      this.rawItems.update((items) => [...items, optimistic]);
      return true;
    } catch {
      return false;
    }
  }

  async remove(titulo: string, anioEstreno: number | null): Promise<boolean> {
    try {
      await fetch(POR_VER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'quitar', titulo, director: '', anio_estreno: anioEstreno, pais_origen: '' }),
      });
      const key = normalizeKey(titulo, anioEstreno);
      this.rawItems.update((items) => items.filter((i) => i.key !== key));
      return true;
    } catch {
      return false;
    }
  }

  private async loadRaw(): Promise<RawPvRow[]> {
    try {
      const res = await fetch(POR_VER_CSV_URL, { cache: 'no-store' });
      if (!res.ok) return [];
      const rows = parseCsv(await res.text());
      const header = rows[0].map((x) => x.trim().toLowerCase());
      const idx = (k: string) => header.indexOf(k);
      const c = {
        t: idx('titulo'),
        d: idx('director'),
        ay: idx('anio_estreno'),
        p: idx('pais_origen'),
        g: idx('genero'),
        a: idx('agregada_el'),
      };
      if (c.t < 0) return [];
      return rows
        .slice(1)
        .filter((r) => r.length > c.t && (r[c.t] || '').trim())
        .map((r) => ({
          titulo: r[c.t].trim(),
          director: (r[c.d] || '').trim(),
          anioEstreno: +r[c.ay] || null,
          paisOrigen: (r[c.p] || '').trim(),
          genero: (r[c.g] || '').trim(),
          agregadaEl: (r[c.a] || '').slice(0, 10),
        }));
    } catch {
      return [];
    }
  }
}
