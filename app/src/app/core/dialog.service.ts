import { Injectable, signal } from '@angular/core';

/** Lo mínimo para poder mostrar algo mientras se resuelve la ficha completa. */
export interface MovieStub {
  key: string;
  titulo: string;
  director: string;
  anioEstreno: number | null;
}

/**
 * Qué modal de detalle está abierto, si alguno. Compartido entre donde sea
 * que se dispare la apertura (tabla, grilla de catálogo, grilla de "Quiero
 * ver", chips de "parecidas") y el componente que renderiza el modal, que
 * resuelve la ficha completa contra el catálogo, la watchlist, o — si no
 * está en ninguno de los dos — el enriquecimiento de TMDB solo.
 */
const URL_PARAM = 'p';

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly openTarget = signal<MovieStub | null>(null);

  open(stub: MovieStub): void {
    this.openTarget.set(stub);
    this.syncUrl(stub.key);
  }

  close(): void {
    this.openTarget.set(null);
    this.syncUrl(null);
  }

  /** Refleja la película abierta en `?p=key` — sin pushState, para no ensuciar el historial. */
  private syncUrl(key: string | null): void {
    const url = new URL(location.href);
    if (key) url.searchParams.set(URL_PARAM, key);
    else url.searchParams.delete(URL_PARAM);
    history.replaceState(null, '', url);
  }
}
