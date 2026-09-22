import { Movie, Viewing } from './models';
import { canonDir, deburr, decadeOf } from './key.util';

export interface CatalogFilters {
  search: string;
  decade: number | null;
  country: string;
  anioVisto: number | null;
  genre: string;
  onlyRewatches: boolean;
}

export const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  decade: null,
  country: '',
  anioVisto: null,
  genre: '',
  onlyRewatches: false,
};

export type SortKey = 'y' | 't' | 'd' | 'p' | 'r' | 's';
export interface SortState {
  key: SortKey;
  dir: 1 | -1;
}

/** Dirección por defecto al hacer click por primera vez en cada columna, portado del original. */
export const DEFAULT_SORT_DIR: Record<SortKey, 1 | -1> = {
  y: -1,
  t: 1,
  d: 1,
  p: 1,
  r: -1,
  s: -1,
};

/** Filtros que aplican a nivel película (todas sus visitas comparten estos valores). */
function matchesMovieFilters(movie: Movie, filters: CatalogFilters): boolean {
  const q = deburr(filters.search.trim());
  if (
    q &&
    !(
      deburr(movie.titulo).includes(q) ||
      deburr(movie.director).includes(q) ||
      movie.cast.some((a) => deburr(a).includes(q))
    )
  )
    return false;
  if (filters.decade && decadeOf(movie.anioEstreno) !== filters.decade) return false;
  if (filters.country && movie.paisOrigen !== filters.country) return false;
  if (filters.genre && !movie.genres.includes(filters.genre)) return false;
  if (filters.onlyRewatches && movie.watchInstances.length < 2) return false;
  return true;
}

/** Filtra los visionados (nivel fila de tabla) — "año visto" es por visionado, no por película. */
export function filterViewings(viewings: readonly Viewing[], filters: CatalogFilters): Viewing[] {
  return viewings.filter(
    (v) =>
      matchesMovieFilters(v.movie, filters) && (!filters.anioVisto || v.anioVisto === filters.anioVisto),
  );
}

const MOVIE_SORT_VALUE: Record<SortKey, (m: Movie) => string | number> = {
  y: (m) => m.anioEstreno || 0,
  t: (m) => deburr(m.titulo),
  d: (m) => deburr(canonDir(m.director)),
  p: (m) => deburr(m.paisOrigen),
  r: (m) => m.rating ?? -1,
  s: () => '', // no aplica a nivel película; ver sortViewings
};

export function sortViewings(viewings: readonly Viewing[], sort: SortState): Viewing[] {
  const valueOf = (v: Viewing): string | number => (sort.key === 's' ? v.fecha : MOVIE_SORT_VALUE[sort.key](v.movie));
  return [...viewings].sort((a, b) => {
    const x = valueOf(a);
    const y = valueOf(b);
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
  });
}

export interface GridEntry {
  movie: Movie;
  /** cuántos de los visionados FILTRADOS son de esta película (no el total histórico) */
  count: number;
}

/**
 * De una lista de visionados YA filtrada y ordenada, arma la lista de
 * películas únicas quedándose con la primera aparición de cada una — igual
 * que el original (ordena/filtra las filas primero, después dedupea), así
 * "ordenar por fecha vista" en la grilla también tiene sentido (cada peli se
 * ubica por su visionado más reciente/antiguo según la dirección), y el
 * badge de "×N" refleja los visionados que pasaron el filtro, no el total
 * histórico (relevante si se filtra por "año visto").
 */
export function dedupeToMovies(sortedViewings: readonly Viewing[]): GridEntry[] {
  const index = new Map<string, GridEntry>();
  const order: GridEntry[] = [];
  for (const v of sortedViewings) {
    const existing = index.get(v.movie.key);
    if (existing) {
      existing.count++;
    } else {
      const entry: GridEntry = { movie: v.movie, count: 1 };
      index.set(v.movie.key, entry);
      order.push(entry);
    }
  }
  return order;
}
