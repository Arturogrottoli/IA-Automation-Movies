import { Injectable, signal } from '@angular/core';

const DEFAULT_DURATION_MS = 3000;

/** Toast simple, uno a la vez — reemplaza al anterior si se dispara otro antes de que se oculte solo. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<string | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, durationMs = DEFAULT_DURATION_MS): void {
    if (this.timer) clearTimeout(this.timer);
    this.message.set(message);
    this.timer = setTimeout(() => this.message.set(null), durationMs);
  }
}
