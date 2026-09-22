import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { Dialog } from '../shared/dialog/dialog';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { EnrichmentService } from '../core/enrichment.service';
import { ConfirmService } from '../core/confirm.service';
import { DialogService } from '../core/dialog.service';
import { TmdbLiveService } from '../core/tmdb-live.service';
import { EMPTY_ENRICHMENT, WatchlistItem } from '../core/models';
import { normalizeKey } from '../core/key.util';

export interface RecomendadaEntry {
  titulo: string;
  anioEstreno: number | null;
  director: string;
  yaVista: boolean;
}

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

  /** Solo cuando no está ni vista ni en la lista: una ficha mínima armada con el stub + TMDB (local o, si no hay, en vivo). */
  private readonly fallbackItem = computed<WatchlistItem | null>(() => {
    const target = this.dialog.openTarget();
    if (!target || this.watchedMovie() || this.watchlistItem()) return null;
    const enrichmentEntry = this.enrichment.map().get(target.key);
    const live = enrichmentEntry?.poster ? null : this.tmdbLive.findByKey(target.key);
    return {
      key: target.key,
      titulo: target.titulo,
      director: target.director,
      anioEstreno: target.anioEstreno,
      paisOrigen: '—',
      genero: '',
      agregadaEl: '',
      ...(enrichmentEntry ?? EMPTY_ENRICHMENT),
      ...(live ? { poster: live.poster, synopsis: live.synopsis, rating: live.rating, tmdbId: live.tmdbId } : {}),
    };
  });

  protected readonly watchlistVariant = computed(() => this.watchlistItem() ?? this.fallbackItem());
  protected readonly tracked = computed(() => !!this.watchlistItem());
  protected readonly dates = computed(() => this.watchedMovie()?.watchInstances.map((w) => w.fecha) ?? []);
  protected readonly isOpen = computed(() => !!this.watchedMovie() || !!this.watchlistVariant());

  /** El tmdbId de lo que esté abierto ahora, sea cual sea la variante — dispara la carga en vivo. */
  private readonly activeTmdbId = computed(() => this.watchedMovie()?.tmdbId ?? this.watchlistVariant()?.tmdbId ?? null);

  /**
   * "Parecidas" + "Recomendadas (que no viste)" fusionadas en una sola grilla:
   * primero lo precomputado (similar.json, ya conocido), después lo nuevo de
   * TMDB en vivo que no se repite — cada entrada marcada si ya está en el
   * catálogo de vistas, para pintarla distinto en el template.
   */
  protected readonly recomendadas = computed<RecomendadaEntry[]>(() => {
    const base = this.watchedMovie()?.similar ?? this.watchlistVariant()?.similar ?? [];
    const id = this.activeTmdbId();
    const live = id ? (this.tmdbLive.cache().get(id) ?? []) : [];
    const movieKeys = new Set(this.catalog.movies().map((m) => m.key));
    const seen = new Set<string>();
    const out: RecomendadaEntry[] = [];

    for (const s of base) {
      const k = normalizeKey(s.titulo, s.anioEstreno);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ titulo: s.titulo, anioEstreno: s.anioEstreno, director: s.director, yaVista: movieKeys.has(k) });
    }
    for (const r of live) {
      const k = normalizeKey(r.titulo, r.anioEstreno);
      if (seen.has(k) || out.length >= 10) continue;
      seen.add(k);
      out.push({ titulo: r.titulo, anioEstreno: r.anioEstreno, director: '', yaVista: movieKeys.has(k) });
    }
    return out;
  });

  protected readonly parecidasVistas = computed(() => this.recomendadas().filter((r) => r.yaVista));
  protected readonly parecidasNuevas = computed(() => this.recomendadas().filter((r) => !r.yaVista));

  constructor(
    protected readonly dialog: DialogService,
    private readonly catalog: CatalogDataService,
    private readonly watchlist: WatchlistDataService,
    private readonly enrichment: EnrichmentService,
    private readonly confirmService: ConfirmService,
    private readonly tmdbLive: TmdbLiveService,
  ) {
    effect(() => {
      const id = this.activeTmdbId();
      if (id) void this.tmdbLive.load(id);
    });
  }

  protected close(): void {
    this.dialog.close();
  }

  protected openSimilar(titulo: string, director: string, anioEstreno: number | null): void {
    this.dialog.open({ key: normalizeKey(titulo, anioEstreno), titulo, director, anioEstreno });
  }

  protected requestRemove(item: WatchlistItem): void {
    this.confirmService.ask(item.titulo, item.poster, 'Sacar', async () => {
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
