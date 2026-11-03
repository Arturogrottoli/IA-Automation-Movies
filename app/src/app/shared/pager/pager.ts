import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Paginador genérico, reusado por el catálogo (25/página) y "Quiero ver" (24/página);
 * en celular, 12 por página en los dos.
 */
@Component({
  selector: 'app-pager',
  imports: [],
  templateUrl: './pager.html',
  styleUrl: './pager.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pager {
  readonly total = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly page = input.required<number>();
  /** Adónde volver al cambiar de página: el paginador está abajo y la página nueva empieza arriba. */
  readonly scrollTarget = input<HTMLElement | null>(null);
  readonly pageChange = output<number>();

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  protected go(delta: number): void {
    this.pageChange.emit(this.page() + delta);
    const el = this.scrollTarget();
    // Solo si el comienzo quedó fuera de la pantalla (en escritorio suele estar a la vista).
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }
}
