import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Dialog } from '../shared/dialog/dialog';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { EnrichmentService } from '../core/enrichment.service';
import { ConfirmService } from '../core/confirm.service';
import { DialogService } from '../core/dialog.service';
import { EMPTY_ENRICHMENT, WatchlistItem } from '../core/models';
import { normalizeKey } from '../core/key.util';

/**
 * Modal de detalle: resuelve la clave abierta contra tres fuentes, en orden —
 * 1) el catálogo de vistas (variante completa, con fechas de visionado)
 * 2) la watchlist (variante "Quiero ver", con agregar/quitar)
 * 3) ninguna de las dos (ej. una "parecida" suelta) — arma una ficha mínima
 *    con lo que haya en el enriquecimiento de TMDB, mostrando "+ Agregar".
 * Replica `openModal`/`openModalPorVer`/`openModalAny` del original.
 */
@Component({
  selector: 'app-movie-detail-dialog',
  imports: [Dialog],
  templateUrl: './movie-detail-dialog.html',
  styleUrl: './movie-detail-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieDetailDialog {
  protected readonly addPending = signal(false);

  protected readonly watchedMovie = computed(() => {
    const target = this.dialog.openTarget();
    if (!target) return null;
    return this.catalog.movies().find((m) => m.key === target.key) ?? null;
  });

  protected readonly watchlistItem = computed(() => {
    const target = this.dialog.openTarget();
    if (!target) return null;
    return this.watchlist.items().find((i) => i.key === target.key) ?? null;
  });

  /** Solo cuando no está ni vista ni en la lista: una ficha mínima armada con el stub + TMDB. */
  private readonly fallbackItem = computed<WatchlistItem | null>(() => {
    const target = this.dialog.openTarget();
    if (!target || this.watchedMovie() || this.watchlistItem()) return null;
    const enrichmentEntry = this.enrichment.map().get(target.key) ?? EMPTY_ENRICHMENT;
    return {
      key: target.key,
      titulo: target.titulo,
      director: target.director,
      anioEstreno: target.anioEstreno,
      paisOrigen: '—',
      genero: '',
      agregadaEl: '',
      ...enrichmentEntry,
    };
  });

  protected readonly watchlistVariant = computed(() => this.watchlistItem() ?? this.fallbackItem());
  protected readonly tracked = computed(() => !!this.watchlistItem());
  protected readonly dates = computed(() => this.watchedMovie()?.watchInstances.map((w) => w.fecha) ?? []);
  protected readonly isOpen = computed(() => !!this.watchedMovie() || !!this.watchlistVariant());

  constructor(
    protected readonly dialog: DialogService,
    private readonly catalog: CatalogDataService,
    private readonly watchlist: WatchlistDataService,
    private readonly enrichment: EnrichmentService,
    private readonly confirmService: ConfirmService,
  ) {}

  protected close(): void {
    this.dialog.close();
  }

  protected openSimilar(titulo: string, director: string, anioEstreno: number | null): void {
    this.dialog.open({ key: normalizeKey(titulo, anioEstreno), titulo, director, anioEstreno });
  }

  protected requestRemove(item: WatchlistItem): void {
    this.confirmService.ask(`¿Sacar "${item.titulo}" de tu lista de "Quiero ver"?`, 'Sacar', async () => {
      const ok = await this.watchlist.remove(item.titulo, item.anioEstreno);
      if (ok) this.dialog.close();
      return ok;
    });
  }

  protected async addToWatchlist(item: WatchlistItem): Promise<void> {
    this.addPending.set(true);
    await this.watchlist.add(item.titulo);
    this.addPending.set(false);
  }
}
