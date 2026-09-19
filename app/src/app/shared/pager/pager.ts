import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Paginador genérico, reusado por el catálogo (25/página) y "Quiero ver" (24/página). */
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
  readonly pageChange = output<number>();

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  protected go(delta: number): void {
    this.pageChange.emit(this.page() + delta);
  }
}
