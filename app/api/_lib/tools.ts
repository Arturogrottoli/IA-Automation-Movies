// Herramientas de CinefilIA (tool calling de Gemini). El modelo decide cuál
// llamar y con qué filtros; filtrar, contar y ordenar se hace acá, en código,
// sobre el catálogo real: los LLM cuentan mal y completan listas de memoria.
// TMDB aporta lo que el catálogo no tiene (filmografías, películas parecidas),
// con cada resultado marcado como visto o no, para que recomiende sin repetir.

import { cargarDatos, deburr, normKey, type Datos, type Genero, type Pelicula } from './datos';

// Token de solo lectura: es el mismo que ya usa el sitio en el navegador.
const TMDB_TOKEN =
  process.env['TMDB_TOKEN'] ||
  'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyYzRkNjIyOTJmNGRmYzI3OTliYjkxN2IzODBhZTFiNCIsIm5iZiI6MTc4ODgyODA2Ni44MjksInN1YiI6IjZhOWY1OWEyZTM0OTJlMmJiMDRiMTUwMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NSHR3ISSnourzx14izK0qLQTUdgLN82hLoELPLWsX8U';

// ---------- declaraciones (lo que ve el modelo) ----------

const FILTROS = {
  titulo: { type: 'string', description: 'Parte del título' },
  director: { type: 'string', description: 'Nombre o apellido de quien dirigió' },
  actor: { type: 'string', description: 'Nombre o apellido de alguien del reparto principal (actor o actriz)' },
  genero: { type: 'string', description: 'Género en castellano: Drama, Terror, Comedia, Suspense, Crimen, Acción, Ciencia ficción, Documental, Animación, Western, etc.' },
  pais: { type: 'string', description: 'País de origen, ej. Argentina, Estados Unidos, Japón' },
  estreno_desde: { type: 'integer', description: 'Año de estreno mínimo (para una década: 1980 y estreno_hasta 1989)' },
  estreno_hasta: { type: 'integer', description: 'Año de estreno máximo' },
  visto_en: { type: 'integer', description: 'Año en que Turi la vio (2018 en adelante)' },
  dirigida_por_mujer: { type: 'boolean', description: 'true: solo películas con al menos una directora' },
  solo_revistas: { type: 'boolean', description: 'true: solo las que vio más de una vez' },
};

export const DECLARACIONES = [
  {
    name: 'resumen_catalogo',
    description: 'Totales del diario de Turi: películas distintas, visionados, rango de fechas, primera y última vista.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'buscar_vistas',
    description:
      'Busca en las películas que Turi vio, con filtros combinables. Devuelve los totales exactos y la lista. Usala para "¿vio X?", "¿qué vio de Y?", "¿cuántas de Z?".',
    parameters: {
      type: 'object',
      properties: {
        ...FILTROS,
        orden: { type: 'string', enum: ['mas_vistas', 'recientes', 'antiguas', 'estreno'], description: 'Orden de la lista (por defecto mas_vistas)' },
        limite: { type: 'integer', description: 'Máximo de películas en la lista (por defecto 40, tope 100). Los totales siempre son exactos.' },
      },
    },
  },
  {
    name: 'ranking',
    description:
      'Ranking de lo que Turi más vio, contado sobre películas distintas: directores, directoras, actores, actrices, géneros, países, años de visionado o décadas de estreno. Acepta los mismos filtros que buscar_vistas (ej. directores más vistos de terror).',
    parameters: {
      type: 'object',
      properties: {
        dimension: {
          type: 'string',
          enum: ['director', 'directora', 'actor', 'actriz', 'genero', 'pais', 'anio_visto', 'decada_estreno'],
          description: 'Qué se rankea. actor/actriz = reparto principal (los 8 primeros de cada película).',
        },
        limite: { type: 'integer', description: 'Cuántos puestos (por defecto 15, tope 50)' },
        ...FILTROS,
      },
      required: ['dimension'],
    },
  },
  {
    name: 'quiero_ver',
    description: 'La lista "Quiero ver" de Turi (pendientes que anotó). Con texto, filtra por título, director o género.',
    parameters: { type: 'object', properties: { texto: { type: 'string', description: 'Filtro opcional' } } },
  },
  {
    name: 'tmdb_persona',
    description:
      'Filmografía de un director o actor según TMDB, con cada película marcada vista: true/false según el diario de Turi. Usala para recomendar de alguien ("¿qué me falta de Kubrick?") o para datos de filmografía.',
    parameters: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre completo' },
        rol: { type: 'string', enum: ['director', 'actor'], description: 'Como qué buscar su filmografía (por defecto, su oficio principal)' },
      },
      required: ['nombre'],
    },
  },
  {
    name: 'tmdb_pelicula',
    description:
      'Ficha de una película según TMDB (dirección, reparto, géneros, sinopsis) y películas parecidas, todas marcadas vista: true/false según el diario de Turi. Usala para recomendar algo parecido a una película o para datos de una que Turi no vio.',
    parameters: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Título (original o en castellano)' },
        anio: { type: 'integer', description: 'Año de estreno, si se sabe' },
      },
      required: ['titulo'],
    },
  },
];

// ---------- ejecución ----------

type Args = Record<string, unknown>;
const str = (a: Args, k: string) => (typeof a[k] === 'string' && (a[k] as string).trim() ? (a[k] as string).trim() : undefined);
const num = (a: Args, k: string) => (typeof a[k] === 'number' && Number.isFinite(a[k]) ? Math.trunc(a[k] as number) : undefined);
const clamp = (n: number | undefined, def: number, max: number) => Math.max(1, Math.min(n ?? def, max));

/** ¿Cada palabra de la consulta aparece como comienzo de palabra en el nombre? "Scorsese" → Martin Scorsese; "Emma Stone" no → Sharon Stone. */
function coincide(nombre: string, consulta: string): boolean {
  const palabras = deburr(nombre).split(/[^a-z0-9]+/);
  return deburr(consulta)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .every((q) => palabras.some((p) => p.startsWith(q)));
}

/** Directores de una película: los de TMDB (con nombre bien escrito y género) o, si no hay, los de la hoja. */
function direccion(p: Pelicula, d: Datos): { n: string; g: Genero }[] {
  return p.direccionTmdb.length ? p.direccionTmdb.map((x) => ({ n: x.n, g: d.generoDirector(x) })) : p.directores.map((n) => ({ n, g: '?' as Genero }));
}

function filtrar(d: Datos, a: Args): Pelicula[] {
  const titulo = str(a, 'titulo');
  const director = str(a, 'director');
  const actor = str(a, 'actor');
  const genero = str(a, 'genero');
  const pais = str(a, 'pais');
  const desde = num(a, 'estreno_desde');
  const hasta = num(a, 'estreno_hasta');
  const vistoEn = num(a, 'visto_en');
  return d.peliculas.filter(
    (p) =>
      (!titulo || deburr(p.titulo).includes(deburr(titulo))) &&
      // Contra TMDB y contra la hoja: la hoja tiene nombres mal escritos o agrupados ("Safdie Brothers").
      (!director || direccion(p, d).some((x) => coincide(x.n, director)) || p.directores.some((x) => coincide(x, director))) &&
      (!actor || p.reparto.some((x) => coincide(x, actor))) &&
      (!genero || p.generos.some((g) => deburr(g).startsWith(deburr(genero)))) &&
      (!pais || p.paises.some((x) => coincide(x, pais))) &&
      (desde == null || (p.anio != null && p.anio >= desde)) &&
      (hasta == null || (p.anio != null && p.anio <= hasta)) &&
      (vistoEn == null || p.vistas.some((f) => f.startsWith(String(vistoEn)))) &&
      (!a['dirigida_por_mujer'] || direccion(p, d).some((x) => x.g === 'f')) &&
      (!a['solo_revistas'] || p.vistas.length > 1),
  );
}

const fila = (p: Pelicula, d: Datos) => ({
  titulo: p.titulo,
  anio: p.anio,
  direccion: direccion(p, d).map((x) => x.n).join(', ') || null,
  generos: p.generos,
  pais: p.paises.join(', ') || null,
  veces_vista: p.vistas.length,
  ultima_vez: p.vistas.at(-1) ?? null,
});

/** Fechas de visionado que cuentan: con visto_en, solo las de ese año (no todas las de la película). */
function vistasDe(p: Pelicula, a: Args): string[] {
  const anio = num(a, 'visto_en');
  return anio == null ? p.vistas : p.vistas.filter((f) => f.startsWith(String(anio)));
}

const visionados = (ps: Pelicula[], a: Args) => ps.reduce((n, p) => n + vistasDe(p, a).length, 0);

function resumenCatalogo(d: Datos) {
  const fechas = d.peliculas.flatMap((p) => p.vistas).sort();
  return {
    peliculas_distintas: d.peliculas.length,
    visionados: fechas.length,
    revistas: d.peliculas.filter((p) => p.vistas.length > 1).length,
    primera_vista: fechas[0] ?? null,
    ultima_vista: fechas.at(-1) ?? null,
    en_quiero_ver: d.pendientes.length,
  };
}

function buscarVistas(d: Datos, a: Args) {
  const ps = filtrar(d, a);
  const orden = str(a, 'orden') ?? 'mas_vistas';
  const ultima = (p: Pelicula) => p.vistas.at(-1) ?? '';
  const sorters: Record<string, (x: Pelicula, y: Pelicula) => number> = {
    mas_vistas: (x, y) => y.vistas.length - x.vistas.length || ultima(y).localeCompare(ultima(x)),
    recientes: (x, y) => ultima(y).localeCompare(ultima(x)),
    antiguas: (x, y) => (x.vistas[0] ?? '').localeCompare(y.vistas[0] ?? ''),
    estreno: (x, y) => (x.anio ?? 9999) - (y.anio ?? 9999),
  };
  const lim = clamp(num(a, 'limite'), 40, 100);
  const lista = [...ps].sort(sorters[orden] ?? sorters['mas_vistas']).slice(0, lim);
  return {
    peliculas_distintas: ps.length,
    visionados: visionados(ps, a),
    ...(ps.length > lista.length ? { aviso: `Se muestran ${lista.length} de ${ps.length}; los totales son exactos.` } : {}),
    peliculas: lista.map((p) => fila(p, d)),
  };
}

function ranking(d: Datos, a: Args) {
  const dim = str(a, 'dimension') ?? 'director';
  const ps = filtrar(d, a);
  const claves: Record<string, (p: Pelicula) => string[]> = {
    director: (p) => direccion(p, d).map((x) => x.n),
    directora: (p) => direccion(p, d).filter((x) => x.g === 'f').map((x) => x.n),
    actor: (p) => p.reparto.filter((n) => d.generoActor(n) === 'm'),
    actriz: (p) => p.reparto.filter((n) => d.generoActor(n) === 'f'),
    genero: (p) => p.generos,
    pais: (p) => p.paises,
    anio_visto: (p) => [...new Set(p.vistas.map((f) => f.slice(0, 4)))],
    decada_estreno: (p) => (p.anio ? [`${Math.floor(p.anio / 10) * 10}s`] : []),
  };
  const clave = claves[dim] ?? claves['director'];
  const acc = new Map<string, { peliculas: number; visionados: number; titulos: string[] }>();
  for (const p of ps) {
    for (const k of new Set(clave(p))) {
      const e = acc.get(k) ?? { peliculas: 0, visionados: 0, titulos: [] };
      e.peliculas++;
      // Por año de visionado cuenta las veces de ese año, no las de toda la película.
      e.visionados += dim === 'anio_visto' ? p.vistas.filter((f) => f.startsWith(k)).length : vistasDe(p, a).length;
      e.titulos.push(`${p.titulo} (${p.anio ?? '?'})`);
      acc.set(k, e);
    }
  }
  const orden = [...acc.entries()].sort((x, y) =>
    dim === 'anio_visto' || dim === 'decada_estreno' ? x[0].localeCompare(y[0]) : y[1].peliculas - x[1].peliculas || x[0].localeCompare(y[0]),
  );
  const lim = clamp(num(a, 'limite'), dim === 'anio_visto' || dim === 'decada_estreno' ? 50 : 15, 50);
  const top = orden.slice(0, lim);
  // Empates en el último puesto: que el modelo no diga "el 15.º es X" si hay otros 20 con lo mismo.
  const corte = top.at(-1)?.[1].peliculas;
  const empatados = corte != null ? orden.slice(lim).filter(([, e]) => e.peliculas === corte).length : 0;
  const notas: Record<string, string> = {
    actor: 'Reparto principal: los 8 primeros de cada película según TMDB; los cameos no cuentan.',
    actriz: 'Reparto principal: los 8 primeros de cada película según TMDB; los cameos no cuentan.',
    directora: 'Género según TMDB más correcciones a mano; a algunas personas TMDB no les tiene el género, podría haber alguna más.',
  };
  return {
    dimension: dim,
    peliculas_consideradas: ps.length,
    nombres_distintos: acc.size,
    ...(notas[dim] ? { criterio: notas[dim] } : {}),
    ...(empatados ? { aviso: `Hay ${empatados} más empatados con el último puesto (${corte} películas).` } : {}),
    // Con pocas películas por puesto, los títulos exactos: evita que complete de memoria.
    ranking: top.map(([nombre, e]) => ({ nombre, ...e, titulos: e.peliculas <= 12 ? e.titulos : undefined })),
  };
}

function quieroVer(d: Datos, a: Args) {
  const t = str(a, 'texto');
  const ps = t ? d.pendientes.filter((p) => deburr(`${p.titulo} ${p.director} ${p.genero}`).includes(deburr(t))) : d.pendientes;
  return { total: ps.length, pendientes: ps.slice(0, 80) };
}

// ---------- TMDB ----------

async function tmdb<T>(path: string): Promise<T> {
  const r = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json() as Promise<T>;
}

interface TmdbPeli {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  popularity?: number;
  vote_count?: number;
  job?: string;
  character?: string;
}

/** Marca cada película de TMDB como vista o no, por id y, si no, por título. */
function marcar(d: Datos, m: TmdbPeli) {
  const anio = +(m.release_date ?? '').slice(0, 4) || null;
  const vista =
    d.idsVistos.has(m.id) ||
    [m.title, m.original_title].some((t) => t && d.peliculas.some((p) => p.key === normKey(t, anio)));
  const pendiente = [m.title, m.original_title].some((t) => t && d.pendientes.some((p) => normKey(p.titulo, null) === normKey(t, null)));
  return {
    titulo: m.title,
    ...(m.original_title && m.original_title !== m.title ? { original: m.original_title } : {}),
    anio,
    vista,
    ...(pendiente ? { en_quiero_ver: true } : {}),
  };
}

async function tmdbPersona(d: Datos, a: Args) {
  const nombre = str(a, 'nombre');
  if (!nombre) return { error: 'Falta el nombre.' };
  const busq = await tmdb<{ results: { id: number; name: string; known_for_department?: string }[] }>(
    `/search/person?query=${encodeURIComponent(nombre)}&language=es-ES`,
  );
  const persona = busq.results[0];
  if (!persona) return { error: `TMDB no encontró a "${nombre}".` };
  const creditos = await tmdb<{ cast: TmdbPeli[]; crew: TmdbPeli[] }>(`/person/${persona.id}/movie_credits?language=es-ES`);
  const rol = str(a, 'rol') ?? (persona.known_for_department === 'Directing' ? 'director' : 'actor');
  const pelis = (rol === 'director' ? creditos.crew.filter((c) => c.job === 'Director') : creditos.cast)
    .filter((m) => m.release_date) // sin fecha suelen ser proyectos anunciados
    .filter((m, i, xs) => xs.findIndex((y) => y.id === m.id) === i)
    .sort((x, y) => (y.vote_count ?? 0) - (x.vote_count ?? 0))
    .slice(0, 40)
    .map((m) => marcar(d, m));
  return {
    persona: persona.name,
    rol,
    vistas_por_turi: pelis.filter((p) => p.vista).length,
    mostradas: pelis.length,
    nota: 'Las más conocidas primero (hasta 40). Para recomendar, solo las que tienen vista: false.',
    filmografia: pelis,
  };
}

async function tmdbPelicula(d: Datos, a: Args) {
  const titulo = str(a, 'titulo');
  if (!titulo) return { error: 'Falta el título.' };
  const anio = num(a, 'anio');
  const busq = await tmdb<{ results: TmdbPeli[] }>(
    `/search/movie?query=${encodeURIComponent(titulo)}&language=es-ES${anio ? `&year=${anio}` : ''}`,
  );
  const m = busq.results[0];
  if (!m) return { error: `TMDB no encontró "${titulo}".` };
  const det = await tmdb<{
    title: string;
    original_title: string;
    release_date?: string;
    overview?: string;
    genres?: { name: string }[];
    credits?: { cast: { name: string }[]; crew: { name: string; job: string }[] };
    recommendations?: { results: TmdbPeli[] };
  }>(`/movie/${m.id}?language=es-ES&append_to_response=credits,recommendations`);
  const propia = marcar(d, { ...m, title: det.title, original_title: det.original_title });
  const enCatalogo = d.peliculas.find((p) => p.tmdbId === m.id);
  return {
    ...propia,
    ...(enCatalogo ? { veces_vista: enCatalogo.vistas.length, ultima_vez: enCatalogo.vistas.at(-1) } : {}),
    direccion: det.credits?.crew.filter((c) => c.job === 'Director').map((c) => c.name) ?? [],
    reparto: det.credits?.cast.slice(0, 6).map((c) => c.name) ?? [],
    generos: det.genres?.map((g) => g.name) ?? [],
    sinopsis: (det.overview ?? '').slice(0, 400),
    parecidas: (det.recommendations?.results ?? []).slice(0, 15).map((r) => marcar(d, r)),
  };
}

/** Ejecuta una llamada del modelo. Los errores vuelven como resultado: el modelo los puede explicar. */
export async function ejecutar(nombre: string, args: Args): Promise<unknown> {
  try {
    const d = await cargarDatos();
    switch (nombre) {
      case 'resumen_catalogo':
        return resumenCatalogo(d);
      case 'buscar_vistas':
        return buscarVistas(d, args);
      case 'ranking':
        return ranking(d, args);
      case 'quiero_ver':
        return quieroVer(d, args);
      case 'tmdb_persona':
        return await tmdbPersona(d, args);
      case 'tmdb_pelicula':
        return await tmdbPelicula(d, args);
      default:
        return { error: `No existe la herramienta ${nombre}.` };
    }
  } catch (e) {
    console.error('tool', nombre, e);
    return { error: 'No se pudieron consultar los datos en este momento.' };
  }
}
