import { deburr } from './key.util';

/**
 * Nombres de país en español ↔ código ISO de 2 letras. Los nombres salen de
 * `Intl.DisplayNames` (sin tabla a mano), y los alias cubren cómo vienen
 * escritos en la hoja: abreviaturas, sin tilde, países que ya no existen.
 */
const display = new Intl.DisplayNames(['es'], { type: 'region' });

/** Nombres más cortos que los oficiales de Intl ("RAE de Hong Kong (China)" → "Hong Kong"). */
const NOMBRE_CORTO: Record<string, string> = { HK: 'Hong Kong', MO: 'Macao', PS: 'Palestina' };

const ALIAS: Record<string, string> = {
  usa: 'US',
  eeuu: 'US',
  'ee uu': 'US',
  uk: 'GB',
  inglaterra: 'GB',
  escocia: 'GB',
  'gran bretana': 'GB',
  'union sovietica': 'RU',
  urss: 'RU',
  'alemania occidental': 'DE',
  'alemania oriental': 'DE',
  'alemania del este': 'DE',
  checoslovaquia: 'CZ',
  yugoslavia: 'RS',
  holanda: 'NL',
  corea: 'KR',
  'hong kong': 'HK',
};

export function countryName(a2: string): string {
  return NOMBRE_CORTO[a2] ?? display.of(a2) ?? a2;
}

/** Códigos reservados o en desuso que Intl igual nombra (FX "Francia metropolitana", UK, EU…). */
const RESERVADOS = new Set(['FX', 'UK', 'EU', 'EZ', 'UN', 'QO', 'AC', 'CP', 'DG', 'EA', 'IC', 'TA', 'CQ']);

let byName: Map<string, string> | null = null;
function nameIndex(): Map<string, string> {
  if (byName) return byName;
  byName = new Map(Object.entries(ALIAS));
  // Todas las regiones que Intl conoce: AA..ZZ, quedándose con las que tienen nombre real.
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i, j);
      const name = display.of(code);
      if (!name || name === code || RESERVADOS.has(code)) continue;
      const n = norm(countryName(code));
      if (!byName.has(n)) byName.set(n, code); // el primero gana: FR antes que FX, GB antes que UK
    }
  }
  return byName;
}

function norm(s: string): string {
  return deburr(s).replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** "Japon", "USA", "Brasil-Francia", "Unión Soviética" → "JP", "US", "BR", "RU". Null si no lo reconoce. */
export function countryCode(raw: string | null | undefined): string | null {
  const first = (raw ?? '').split(/[/,]|-/)[0];
  const n = norm(first);
  return n ? (nameIndex().get(n) ?? null) : null;
}
