/**
 * Funciones puras de normalización, portadas 1:1 desde index.html.
 * `normalizeKey` reemplaza las 3 copias idénticas del original
 * (posterKey/movieKey/rwKey): son la misma fórmula aplicada a distintos
 * orígenes (args sueltos vs. filas de DATA).
 */

export function nf(n: number): string {
  return n.toLocaleString('es-AR');
}

export function deburr(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function normalizeKey(titulo: string | null | undefined, anio: number | null | undefined): string {
  const t = deburr(titulo).replace(/[^a-z0-9]+/g, ' ').trim();
  return `${t}|${anio ?? ''}`;
}

const PAIS_CANON: Record<string, string> = {
  usa: 'Estados Unidos',
  'estados unidos': 'Estados Unidos',
  eeuu: 'Estados Unidos',
  us: 'Estados Unidos',
  uk: 'Reino Unido',
  'reino unido': 'Reino Unido',
  inglaterra: 'Reino Unido',
  'gran bretaña': 'Reino Unido',
  japon: 'Japón',
  japón: 'Japón',
  canada: 'Canadá',
  canadá: 'Canadá',
  'corea del sur': 'Corea del Sur',
  'corea del sur ': 'Corea del Sur',
  'union sovietica': 'Unión Soviética',
  españa: 'España',
  espana: 'España',
};

const DIR_ALIAS: Record<string, string> = {
  'Edgar Wrigth': 'Edgar Wright',
  'Danny Boile': 'Danny Boyle',
  'Orson Wells': 'Orson Welles',
  'John Carpente': 'John Carpenter',
  'Brian Di Palma': 'Brian De Palma',
  'Alex de la iglesia': 'Álex de la Iglesia',
  'Pedro Almodovar': 'Pedro Almodóvar',
  'Adrian Caetano': 'Israel Adrián Caetano',
  'Alfonso Quaron': 'Alfonso Cuarón',
  'Gaspar Noe': 'Gaspar Noé',
  'Damian Szifron': 'Damián Szifrón',
};

export function canonPais(raw: string | null | undefined): string {
  const p = (raw ?? '').split(/[/,]|\s-\s/)[0].trim();
  return PAIS_CANON[deburr(p)] || p || '—';
}

export function canonDir(raw: string | null | undefined): string {
  const d = (raw ?? '').replace(/\s+/g, ' ').trim();
  return DIR_ALIAS[d] || d;
}

/** "Joel Coen, Ethan Coen" -> ["Joel Coen", "Ethan Coen"] — mismo criterio que cerebro/taste_profile.py. */
export function splitDirectores(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(/,| y |\/|&/)
    .map((d) => canonDir(d))
    .filter(Boolean);
}

export function decadeOf(year: number | null | undefined): number | null {
  return year ? Math.floor(year / 10) * 10 : null;
}

/** Agrupa y cuenta; keyFn puede devolver varias claves (ej. géneros de una peli). */
export function tally<T>(items: readonly T[], keyFn: (item: T) => string | string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    const keys = Array.isArray(k) ? k : [k];
    for (const kk of keys) {
      if (!kk) continue;
      m.set(kk, (m.get(kk) ?? 0) + 1);
    }
  }
  return m;
}
