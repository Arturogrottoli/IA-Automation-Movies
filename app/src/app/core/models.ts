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
 *
 * director/paisOrigen quedan acá TAMBIÉN (canonicalizados por fila, no solo
 * una vez por película): el original arma "directores distintos"/"países de
 * origen" de vitals con un Set sobre CADA fila de visionado, no sobre
 * películas deduplicadas — si dos re-visiones de la misma peli tienen el
 * director tipeado distinto (una variante que canonDir no atrapa), cuentan
 * como dos entradas separadas. Usar solo `Movie.director` (una vez por
 * película) subcontaba esos casos.
 */
export interface WatchInstance {
  fecha: string;
  anioVisto: number | null;
  director: string;
  paisOrigen: string;
  /** "Bot Telegram" | "CSV historico" — de dónde vino esta fila (columna `fuente`). */
  fuente: string;
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
  /** Director/país de ESTA fila puntual (ver comentario en WatchInstance). */
  director: string;
  paisOrigen: string;
}

/** Un par etiqueta/valor para un gráfico de barras. */
export interface ChartEntry {
  label: string;
  value: number;
}

/** Una entrada género/década/director → tasa de revisión, de `taste_profile.json`. */
export interface TasteRate {
  tasa: number;
  n: number;
}

/** Salida de `cerebro/taste_profile.py` (pandas + sklearn, corrida offline). */
export interface TasteProfile {
  top_generos: (TasteRate & { genero: string })[];
  top_decadas: (TasteRate & { decada: number })[];
  top_directores: (TasteRate & { director: string })[];
  duracion_revisitadas: number;
  duracion_no_revisitadas: number;
  tasa_por_duracion: (TasteRate & { rango: string })[];
  nota_duracion: string;
  variables_mas_importantes: { variable: string; peso: number }[];
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
