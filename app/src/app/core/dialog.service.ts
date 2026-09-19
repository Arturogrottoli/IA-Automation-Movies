import { Injectable, signal } from '@angular/core';

/**
 * Qué modal de detalle está abierto (clave de la película), si alguno.
 * Compartido entre donde sea que se dispare la apertura (tabla, grilla,
 * chips de "parecidas") y el componente que renderiza el modal.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly openMovieKey = signal<string | null>(null);

  open(key: string): void {
    this.openMovieKey.set(key);
  }

  close(): void {
    this.openMovieKey.set(null);
  }
}
