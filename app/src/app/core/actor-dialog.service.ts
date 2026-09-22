import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActorDialogService {
  readonly openName = signal<string | null>(null);

  open(nombre: string): void {
    this.openName.set(nombre);
  }

  close(): void {
    this.openName.set(null);
  }
}
