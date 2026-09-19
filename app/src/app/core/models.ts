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

/** Una entrada por título+año distinto — agrupa todas las veces vista. */
export interface Movie extends EnrichmentFields {
  key: string;
  titulo: string;
  director: string;
  anioEstreno: number | null;
  paisOrigen: string;
  watchDates: string[];
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
