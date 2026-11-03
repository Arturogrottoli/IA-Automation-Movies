import { Injectable, signal } from '@angular/core';

/** Ancho a partir del cual las grillas pasan a la versión de celular (igual que el @media de styles.css). */
const CELULAR = '(max-width: 600px)';

/**
 * Si la pantalla es de celular, como signal: las grillas de películas muestran
 * menos tarjetas por página ahí (12 en 3 columnas, en vez de ~25 en 2), para no
 * tener que scrollear 4.000 px por página. Se actualiza al girar el teléfono.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly mq = typeof matchMedia === 'function' ? matchMedia(CELULAR) : null;
  readonly celular = signal(this.mq?.matches ?? false);

  constructor() {
    this.mq?.addEventListener('change', (e) => this.celular.set(e.matches));
  }
}
