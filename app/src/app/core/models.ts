export interface SimilarStub {
  titulo: string;
  anioEstreno: number | null;
  director: string;
}

export interface EnrichmentFields {
  poster: string | null;
  rating: number | null;
  genres: string[];
  tmdbId: number | null;
  cast: string[];
  runtimeMin: number | null;
  synopsis: string | null;
  similar: SimilarStub[];
}

export const EMPTY_ENRICHMENT: EnrichmentFields = {
  poster: null,
  rating: null,
  genres: [],
  tmdbId: null,
  cast: [],
  runtimeMin: null,
  synopsis: null,
  similar: [],
};

/**
 * Un visionado individual: fecha_vista + anio_visto de una fila de la hoja.
 * Se guardan ambos porque el filtro "año visto" del catálogo es por
 * visionado, no por película (una peli puede verse en 2019 y de nuevo en 2022).
 */
export interface WatchInstance {
  fecha: string;
  anioVisto: number | null;
}

/** Una entrada por título+año distinto — agrupa todas las veces vista. */
export interface Movie extends EnrichmentFields {
  key: string;
  titulo: string;
  director: string;
  anioEstreno: number | null;
  paisOrigen: string;
  watchInstances: WatchInstance[];
}

/** Una fila de la tabla del catálogo: una película en una fecha vista puntual. */
export interface Viewing {
  movie: Movie;
  fecha: string;
  anioVisto: number | null;
}

/** Una fila de la pestaña por_ver. */
export interface WatchlistItem extends EnrichmentFields {
  key: string;
  titulo: string;
  director: string;
  anioEstreno: number | null;
  paisOrigen: string;
  genero: string;
  agregadaEl: string;
}
