import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'dp-theme';

type Theme = 'light' | 'dark';

/**
 * Replica exacta del toggle de tema de index.html: sin override explícito
 * sigue la preferencia del SO; al tocar el botón queda fijado a light/dark
 * en localStorage (no hay forma de "volver" a automático desde la UI,
 * igual que el original).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly explicit = signal<Theme | null>(this.readSaved());

  constructor() {
    effect(() => {
      const value = this.explicit();
      if (value) {
        document.documentElement.setAttribute('data-theme', value);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    });
  }

  toggle(): void {
    const current =
      this.explicit() ??
      (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    this.explicit.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage inaccesible (modo privado, etc.) — no rompe el toggle */
    }
  }

  private readSaved(): Theme | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch {
      return null;
    }
  }
}
