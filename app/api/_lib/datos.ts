// Capa de datos de CinefilIA: el catálogo (hoja de Google), "Quiero ver" y lo que
// la sincronización diaria deja en data/ (TMDB), cargado en forma estructurada
// para que las herramientas filtren y cuenten en código. Cacheado 10 minutos.
//
// Está en api/_lib/ a propósito: Vercel publica cada archivo de api/ como un
// endpoint, salvo los que están en carpetas que empiezan con "_".

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQix1DRbjfgI7Cm-2-52QLMrGrTaDt_B5tHsGd8QV6wqb_jJfduRa1q1kVezcrz0okXo-gtVybYe3zX/pub?gid=1860980534&single=true&output=csv';
const POR_VER_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQix1DRbjfgI7Cm-2-52QLMrGrTaDt_B5tHsGd8QV6wqb_jJfduRa1q1kVezcrz0okXo-gtVybYe3zX/pub?gid=1297033198&single=true&output=csv';
const DATA_BASE_URL = 'https://raw.githubusercontent.com/Arturogrottoli/IA-Automation-Movies/main/data/';
const TTL_MS = 10 * 60 * 1000;

export type Genero = 'f' | 'm' | 'nb' | '?';

export interface Pelicula {
  key: string;
  titulo: string;
  anio: number | null;
  /** Como está en la hoja, separado por codirección ("Joel Coen, Ethan Coen" → 2). */
  directores: string[];
  /** Directores según TMDB, con género (la hoja no lo tiene). */
  direccionTmdb: { n: string; g: Genero }[];
  /** Reparto principal: los 8 primeros de TMDB. */
  reparto: string[];
  generos: string[];
  /** Países de origen, con los alias unificados ("USA" y "Estados Unidos" son uno). */
  paises: string[];
  /** Fechas de cada visionado (AAAA-MM-DD), ordenadas. */
  vistas: string[];
  /** Minutos, según TMDB (data/runtime.json). */
  duracion: number | null;
  tmdbId: number | null;
}

export interface Pendiente {
  titulo: string;
  anio: number | null;
  director: string;
  genero: string;
}

export interface Datos {
  peliculas: Pelicula[];
  pendientes: Pendiente[];
  /** Ids de TMDB de lo visto: para marcar "vista" en lo que devuelve TMDB. */
  idsVistos: Set<number>;
  /** Títulos vistos normalizados, sin año: para verificar recomendaciones. */
  titulosVistos: Set<string>;
  generoActor: (nombre: string) => Genero;
  generoDirector: (d: { n: string; g: Genero }) => Genero;
}

let cache: { at: number; datos: Datos } | null = null;

export function deburr(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Misma clave que usan el sitio y los scripts: título normalizado + "|" + año. */
export function normKey(titulo: string, anio: string | number | null): string {
  return `${deburr(titulo).replace(/[^a-z0-9]+/g, ' ').trim()}|${anio || ''}`;
}

export function splitDirectores(raw: string): string[] {
  return (raw || '')
    .split(/,| y |\/|&/)
    .map((d) => d.trim())
    .filter(Boolean);
}

// La hoja escribe el mismo país de varias formas; las más comunes, unificadas.
const ALIAS_PAIS: Record<string, string> = {
  usa: 'Estados Unidos',
  eeuu: 'Estados Unidos',
  'estados unidos': 'Estados Unidos',
  us: 'Estados Unidos',
  uk: 'Reino Unido',
  'reino unido': 'Reino Unido',
  inglaterra: 'Reino Unido',
  japon: 'Japón',
  canada: 'Canadá',
  mexico: 'México',
  alemania: 'Alemania',
  francia: 'Francia',
};

function splitPaises(raw: string): string[] {
  return raw
    .split(/[/,]|\s-\s/)
    .map((p) => p.trim())
    .filter((p) => p && !/^\d+$/.test(p)) // algunas filas tienen un año en esa columna
    .map((p) => ALIAS_PAIS[deburr(p).replace(/\./g, '')] ?? p);
}

export function parseCsv(s: string): string[][] {
  const rows: string[][] = [];
  let f = '';
  let row: string[] = [];
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n') {
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else if (c !== '\r') f += c;
  }
  if (f.length || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}

async function getText(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

const json = async <T>(file: string, vacio: T): Promise<T> => {
  try {
    return JSON.parse(await getText(DATA_BASE_URL + file)) as T;
  } catch {
    return vacio;
  }
};

export async function cargarDatos(): Promise<Datos> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.datos;

  const [catCsv, pvCsv, posters, directors, generoManual, actors, generoReparto, runtime] = await Promise.all([
    getText(SHEET_CSV_URL),
    getText(POR_VER_CSV_URL).catch(() => ''),
    json<Record<string, { genres?: string[]; tmdb?: number } | null>>('posters.json', {}),
    json<Record<string, { n: string; g: Genero }[]>>('directors.json', {}),
    json<Record<string, Genero>>('genero-manual.json', {}),
    json<Record<string, string[]>>('actors.json', {}),
    json<Record<string, Genero>>('genero-reparto.json', {}),
    json<Record<string, number | null>>('runtime.json', {}),
  ]);

  const rows = parseCsv(catCsv);
  const h = rows[0].map((x) => x.trim());
  const col = (k: string) => h.indexOf(k);
  const porClave = new Map<string, Pelicula>();
  for (const r of rows.slice(1)) {
    const titulo = (r[col('titulo')] || '').trim();
    if (!titulo) continue;
    const anio = +r[col('anio_estreno')] || null;
    const key = normKey(titulo, anio);
    let p = porClave.get(key);
    if (!p) {
      const px = posters[key];
      p = {
        key,
        titulo,
        anio,
        directores: splitDirectores(r[col('director')] || ''),
        direccionTmdb: directors[key] ?? [],
        reparto: actors[key] ?? [],
        generos: px?.genres ?? [],
        paises: splitPaises(r[col('pais_origen')] || ''),
        vistas: [],
        duracion: runtime[key] || null,
        tmdbId: px?.tmdb ?? null,
      };
      porClave.set(key, p);
    }
    const fecha = (r[col('fecha_vista')] || '').slice(0, 10);
    if (fecha) p.vistas.push(fecha);
  }
  const peliculas = [...porClave.values()];
  peliculas.forEach((p) => p.vistas.sort());

  let pendientes: Pendiente[] = [];
  if (pvCsv) {
    const pv = parseCsv(pvCsv);
    const ph = pv[0].map((x) => x.trim().toLowerCase());
    const pc = (k: string) => ph.indexOf(k);
    pendientes = pv
      .slice(1)
      .filter((r) => (r[pc('titulo')] || '').trim())
      .map((r) => ({
        titulo: r[pc('titulo')].trim(),
        anio: +r[pc('anio_estreno')] || null,
        director: (r[pc('director')] || '').trim(),
        genero: (r[pc('genero')] || '').trim(),
      }));
  }

  const datos: Datos = {
    peliculas,
    pendientes,
    idsVistos: new Set(peliculas.map((p) => p.tmdbId).filter((x): x is number => x != null)),
    titulosVistos: new Set(peliculas.map((p) => normKey(p.titulo, null))),
    generoActor: (n) => (generoReparto[n] && generoReparto[n] !== '?' ? generoReparto[n] : (generoManual[n] ?? '?')),
    generoDirector: (d) => (d.g !== '?' ? d.g : (generoManual[d.n] ?? '?')),
  };
  cache = { at: Date.now(), datos };
  return datos;
}
