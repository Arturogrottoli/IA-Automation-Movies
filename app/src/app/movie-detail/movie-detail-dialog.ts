import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { Dialog } from '../shared/dialog/dialog';
import { CatalogDataService } from '../core/catalog-data.service';
import { DialogService } from '../core/dialog.service';
import { normalizeKey } from '../core/key.util';

/**
 * Modal de detalle para una película VISTA (está en el catálogo). La
 * variante para una película solo en "Quiero ver" (sin fechas de visionado,
 * con acción de agregar/quitar) se suma en la Fase 4, cuando exista
 * WatchlistDataService — recién ahí este componente pasa a decidir entre
 * las dos variantes (como hacía `openModalAny` en el original).
 */
@Component({
  selector: 'app-movie-detail-dialog',
  imports: [Dialog],
  templateUrl: './movie-detail-dialog.html',
  styleUrl: './movie-detail-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieDetailDialog {
  protected readonly movie = computed(() => {
    const key = this.dialog.openMovieKey();
    if (!key) return null;
    return this.catalog.movies().find((m) => m.key === key) ?? null;
  });

  protected readonly dates = computed(() => this.movie()?.watchInstances.map((w) => w.fecha) ?? []);

  constructor(
    protected readonly dialog: DialogService,
    private readonly catalog: CatalogDataService,
  ) {}

  protected close(): void {
    this.dialog.close();
  }

  protected openSimilar(titulo: string, anioEstreno: number | null): void {
    const key = normalizeKey(titulo, anioEstreno);
    const found = this.catalog.movies().find((m) => m.key === key);
    if (found) {
      this.dialog.open(found.key);
    }
    // Si no está en el catálogo de vistas (solo en la watchlist), se resuelve
    // en la Fase 4 — ahí este método deriva a la variante de "Quiero ver".
  }
}
