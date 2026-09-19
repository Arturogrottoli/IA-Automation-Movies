import { Injectable, signal } from '@angular/core';

export interface TooltipData {
  label: string;
  value: number;
  note?: string;
}

/** Tooltip flotante único, compartido por los 6 gráficos (igual que el `#tip` global del original). */
@Injectable({ providedIn: 'root' })
export class ChartTooltipService {
  readonly data = signal<TooltipData | null>(null);
  readonly position = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  show(event: MouseEvent, label: string, value: number, note?: string): void {
    this.data.set({ label, value, note });
    this.position.set({ x: event.clientX, y: event.clientY });
  }

  hide(): void {
    this.data.set(null);
  }
}
