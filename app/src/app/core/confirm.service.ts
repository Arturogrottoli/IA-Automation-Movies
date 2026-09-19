import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  /** Devuelve si la acción se completó — si es false, el diálogo queda abierto para reintentar. */
  onConfirm: () => Promise<boolean>;
}

/** Diálogo de confirmación genérico, disparable desde cualquier lugar (modal de detalle, grilla de "Quiero ver"). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(message: string, confirmLabel: string, onConfirm: () => Promise<boolean>): void {
    this.request.set({ message, confirmLabel, onConfirm });
  }

  close(): void {
    this.request.set(null);
  }
}
