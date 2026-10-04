import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, signal, untracked } from '@angular/core';
import { CatalogDataService } from '../../core/catalog-data.service';
import { DialogService } from '../../core/dialog.service';
import { TMDB_TOKEN } from '../../core/tmdb-live.service';
import { Movie } from '../../core/models';

interface Slide {
  movie: Movie;
  url: string;
}

const SLIDES = 8;
const INTERVAL_MS = 9000;
const AUTH = { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } };

/**
 * Fondo de la portada: fotogramas (backdrops horizontales de TMDB) de
 * películas ya vistas, que rotan con un fundido. Cada visita elige al azar
 * entre las favoritas — revisitadas o bien puntuadas — y pide los backdrops
 * de a uno (`/movie/{id}`), precargando la imagen antes de mostrarla.
 * Con "reducir movimiento" se queda en una sola imagen fija.
 */
@Component({
  selector: 'app-hero-backdrop',
  templateUrl: './hero-backdrop.html',
  styleUrl: './hero-backdrop.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBackdrop {
  protected readonly slides = signal<Slide[]>([]);
  protected readonly active = signal(0);
  protected readonly current = computed(() => this.slides()[this.active()] ?? null);

  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private started = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly catalog: CatalogDataService,
    private readonly dialog: DialogService,
    destroyRef: DestroyRef,
  ) {
    // Arranca una sola vez, cuando el catálogo ya tiene los ids de TMDB.
    effect(() => {
      const movies = this.catalog.movies();
      if (this.started || !movies.some((m) => m.tmdbId)) return;
      this.started = true;
      untracked(() => void this.start(movies));
    });
    destroyRef.onDestroy(() => this.timer && clearInterval(this.timer));
  }

  private async start(movies: Movie[]): Promise<void> {
    const favoritas = movies.filter((m) => m.tmdbId && (m.watchInstances.length > 1 || (m.rating ?? 0) >= 7.3));
    const elegidas = shuffle(favoritas).slice(0, this.reducedMotion ? 1 : SLIDES);
    for (const movie of elegidas) {
      const url = await backdropUrl(movie.tmdbId!);
      if (!url || !(await preload(url))) continue;
      this.slides.update((s) => [...s, { movie, url }]);
      if (this.slides().length === 2 && !this.reducedMotion) this.startRotation();
    }
  }

  private startRotation(): void {
    this.timer = setInterval(() => {
      if (document.hidden) return; // no gastar fundidos con la pestaña oculta
      const n = this.slides().length;
      if (n > 1) this.active.set((this.active() + 1) % n);
    }, INTERVAL_MS);
  }

  protected openCurrent(): void {
    const m = this.current()?.movie;
    if (m) this.dialog.open({ key: m.key, titulo: m.titulo, director: m.director, anioEstreno: m.anioEstreno });
  }

  protected veces(m: Movie): string {
    const n = m.watchInstances.length;
    return n > 1 ? `vista ${n} veces` : 'vista';
  }
}

async function backdropUrl(tmdbId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}`, AUTH);
    if (!res.ok) return null;
    const j = await res.json();
    return j.backdrop_path ? `https://image.tmdb.org/t/p/w1280${j.backdrop_path}` : null;
  } catch {
    return null;
  }
}

function preload(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
