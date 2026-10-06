import { Injectable, signal } from '@angular/core';
import { Viewing } from './models';

/** 'unicas' = cada película una vez · 'todas' = cada visionado (repeticiones incluidas). */
export type CountMode = 'unicas' | 'todas';

const STORAGE_KEY = 'modo-conteo';

/**
 * Modo de conteo compartido por todos los gráficos de la sección Datos:
 * un solo selector "Sin repetir / Contando repetidas" que cambia todos a la
 * vez (Placa I y Dashboard). Se recuerda en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class CountModeService {
  readonly mode = signal<CountMode>(readMode());

  set(mode: CountMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* sin storage: vale para esta visita */
    }
  }

  /** Palabra para los textos: "películas" o "visionados". */
  unit(n = 2): string {
    const unicas = this.mode() === 'unicas';
    return n === 1 ? (unicas ? 'película' : 'visionado') : unicas ? 'películas' : 'visionados';
  }

  /**
   * Las filas a contar según el modo. `periodo` agrupa por fecha (ej. año
   * visto): sin repetir, una película cuenta una vez por período — vista en
   * 2019 y en 2022 suma en los dos años, vista dos veces en 2022 suma una.
   */
  rows(viewings: Viewing[], periodo?: (v: Viewing) => string | number | null): Viewing[] {
    if (this.mode() === 'todas') return viewings;
    const seen = new Set<string>();
    return viewings.filter((v) => {
      const k = v.movie.key + '|' + (periodo ? (periodo(v) ?? '') : '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
}

function readMode(): CountMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'todas' ? 'todas' : 'unicas';
  } catch {
    return 'unicas';
  }
}
