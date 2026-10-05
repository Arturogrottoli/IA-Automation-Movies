import { Injectable, signal } from '@angular/core';
import { DATA_BASE_URL, REPO_RAW_URL } from './enrichment.service';
import { TMDB_TOKEN } from './tmdb-live.service';

/** Una película elegida para un casillero. */
export interface NinePick {
  /** Id de TMDB, o null para las que solo existen en el catálogo (pósters manuales). */
  tmdbId: number | null;
  /** Clave del catálogo (titulo|año) — identifica a las que no tienen tmdbId. */
  key: string;
  titulo: string;
  anioEstreno: number | null;
  poster: string | null;
}

/** `data/mis9.json` en el repo: la selección fija del dueño del sitio. */
export interface OwnerNine {
  nombre: string;
  picks: (string | number | null)[];
}

export const NINE_SLOTS = 9;
const STORAGE_KEY = 'mis9';
export const URL_PARAM = 'nueve';
const AUTH = { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } };

/** Pósters manuales vienen como ruta relativa a la raíz del repo (`img/x.jpg`), no a data/. */
export function posterUrl(p: string | null): string | null {
  if (!p) return null;
  return /^https?:/.test(p) ? p : REPO_RAW_URL + p;
}

/** Token de un casillero para el link: el id de TMDB, o la clave del catálogo. Vacío = casillero libre. */
export function pickToken(p: NinePick | null): string {
  return p ? (p.tmdbId != null ? String(p.tmdbId) : p.key) : '';
}

/**
 * Estado de "Mis 9 películas". El link es la fuente de verdad para compartir
 * (`?nueve=id,id,,id…` — sobrevive a que el navegador borre todo), y
 * localStorage es solo comodidad para volver en el mismo navegador. No hay
 * usuarios ni backend: cada visitante tiene la suya en su link.
 */
@Injectable({ providedIn: 'root' })
export class NinePicksService {
  readonly picks = signal<(NinePick | null)[]>(Array(NINE_SLOTS).fill(null));

  private ownerCache: Promise<OwnerNine | null> | null = null;
  private readonly tmdbCache = new Map<number, NinePick | null>();

  set(slot: number, pick: NinePick | null): void {
    this.picks.update((ps) => ps.map((p, i) => (i === slot ? pick : p)));
    this.persist();
  }

  replaceAll(picks: (NinePick | null)[]): void {
    this.picks.set(Array.from({ length: NINE_SLOTS }, (_, i) => picks[i] ?? null));
  }

  clearAll(): void {
    this.replaceAll([]);
    this.persist();
  }

  /** Tokens del link actual, si trae `?nueve=`. */
  urlTokens(): string[] | null {
    const raw = new URLSearchParams(location.search).get(URL_PARAM);
    return raw == null ? null : raw.split(',').slice(0, NINE_SLOTS);
  }

  /** Lo guardado en este navegador (null si no hay nada o el storage no anda). */
  stored(): (NinePick | null)[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  shareUrl(picks: (NinePick | null)[] = this.picks()): string {
    const url = new URL(location.href);
    url.searchParams.delete('p');
    if (picks.some(Boolean)) url.searchParams.set(URL_PARAM, picks.map(pickToken).join(','));
    else url.searchParams.delete(URL_PARAM);
    url.hash = 'mis9';
    return url.toString();
  }

  private persist(): void {
    const picks = this.picks();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {
      /* storage bloqueado (modo privado, etc.): el link sigue andando */
    }
    // Sin pushState: cada cambio reemplaza la URL, así guardarla en favoritos guarda la selección.
    history.replaceState(null, '', this.shareUrl(picks));
  }

  loadOwner(): Promise<OwnerNine | null> {
    this.ownerCache ??= fetch(DATA_BASE_URL + 'mis9.json', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<OwnerNine>) : null))
      .catch(() => null);
    return this.ownerCache;
  }

  async searchTmdb(query: string): Promise<NinePick[]> {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=es`, AUTH);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.results ?? []).slice(0, 8).map((r: RawMovie) => this.fromRaw(r));
    } catch {
      return [];
    }
  }

  /** Ficha mínima por id, para casilleros que vienen de un link y no están en el catálogo. */
  async fetchById(id: number): Promise<NinePick | null> {
    if (this.tmdbCache.has(id)) return this.tmdbCache.get(id)!;
    let pick: NinePick | null = null;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=es`, AUTH);
      if (res.ok) pick = this.fromRaw(await res.json());
    } catch {
      /* queda null: el casillero se muestra vacío */
    }
    this.tmdbCache.set(id, pick);
    return pick;
  }

  private fromRaw(r: RawMovie): NinePick {
    const anio = r.release_date ? +r.release_date.slice(0, 4) : null;
    const titulo = r.title ?? '';
    return {
      tmdbId: r.id,
      key: '',
      titulo,
      anioEstreno: anio,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
    };
  }

  /**
   * Composición cuadrada de 1080×1080 para redes, dibujada en el navegador.
   * Los pósters de TMDB y del repo se sirven con CORS abierto, así que el
   * canvas no queda "tainted" y se puede exportar a PNG.
   */
  async renderImage(picks: (NinePick | null)[], nombre: string): Promise<Blob> {
    const S = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    await Promise.all(
      ['800 64px Archivo', '700 19px Archivo', '500 15px "IBM Plex Mono"', 'italic 400 22px Newsreader'].map((f) =>
        document.fonts.load(f).catch(() => null),
      ),
    );
    const images = await Promise.all(picks.map((p) => loadImage(posterUrl(p?.poster ?? null))));

    // Fondo: la sala oscura del masthead del sitio.
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(0, 0, S, S);
    const ACCENT = '#e6a94a';
    const INK = '#ece6da';
    const MUTED = '#8b8471';

    // Encabezado
    const M = 56;
    ctx.fillStyle = MUTED;
    ctx.font = '500 15px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'alphabetic';
    drawTracked(ctx, 'DIARIO DE PROYECCIÓN', M, 66, 3.5);
    ctx.fillStyle = INK;
    ctx.font = '800 64px Archivo, sans-serif';
    ctx.fillText('Mis 9 películas', M, 132);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(M, 152, 64, 4);

    // Grilla 3x3 — pósters recortados a 4:5 (cubre la celda, recorte leve del 2:3).
    const top = 184;
    const bottom = S - 64;
    const gap = 14;
    const h = Math.floor((bottom - top - 2 * gap) / 3);
    const w = Math.floor(h * 0.8);
    const gridW = 3 * w + 2 * gap;
    // Grilla contra el margen derecho; a la izquierda queda la lista numerada de títulos.
    const left = S - M - gridW;
    for (let i = 0; i < NINE_SLOTS; i++) {
      const x = left + (i % 3) * (w + gap);
      const y = top + Math.floor(i / 3) * (h + gap);
      drawCell(ctx, picks[i], images[i], x, y, w, h);
    }

    // Columna izquierda: números de la lista + firma.
    ctx.textAlign = 'left';
    ctx.font = '500 14px "IBM Plex Mono", monospace';
    let ly = top + 6;
    picks.forEach((p, i) => {
      if (!p) return;
      ctx.fillStyle = ACCENT;
      ctx.fillText(String(i + 1).padStart(2, '0'), M, ly + 14);
      ctx.fillStyle = INK;
      ctx.font = '700 17px Archivo, sans-serif';
      const lines = wrap(ctx, p.titulo, left - M - 34 - 28);
      lines.slice(0, 2).forEach((l, j) => ctx.fillText(l, M + 34, ly + 14 + j * 21));
      ctx.fillStyle = MUTED;
      ctx.font = '500 13px "IBM Plex Mono", monospace';
      const yy = ly + 14 + Math.min(lines.length, 2) * 21;
      if (p.anioEstreno) ctx.fillText(String(p.anioEstreno), M + 34, yy);
      ly = yy + 26;
      ctx.font = '500 14px "IBM Plex Mono", monospace';
    });

    ctx.fillStyle = MUTED;
    ctx.font = '500 13px "IBM Plex Mono", monospace';
    if (nombre.trim()) {
      ctx.fillStyle = INK;
      ctx.font = 'italic 400 22px Newsreader, serif';
      ctx.fillText(`por ${nombre.trim()}`, M, S - 64 + 30);
    }
    ctx.fillStyle = MUTED;
    ctx.font = '500 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(location.host || 'turimoviesdatabase.vercel.app', S - M, S - 64 + 30);

    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
  }
}

interface RawMovie {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
}

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src.replace('/w342/', '/w500/');
  });
}

function drawCell(ctx: CanvasRenderingContext2D, pick: NinePick | null, img: HTMLImageElement | null, x: number, y: number, w: number, h: number): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, 6);
  ctx.clip();
  ctx.fillStyle = '#17171a';
  ctx.fillRect(x, y, w, h);
  if (img) {
    // object-fit: cover
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else if (pick) {
    ctx.fillStyle = '#a49d8f';
    ctx.font = '700 18px Archivo, sans-serif';
    ctx.textAlign = 'center';
    wrap(ctx, pick.titulo, w - 24)
      .slice(0, 4)
      .forEach((l, i) => ctx.fillText(l, x + w / 2, y + h / 2 - 20 + i * 24));
    ctx.textAlign = 'left';
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6);
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): void {
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }
}
