import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { Dialog } from '../shared/dialog/dialog';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { EnrichmentService } from '../core/enrichment.service';
import { ConfirmService } from '../core/confirm.service';
import { DialogService } from '../core/dialog.service';
import { TmdbLiveService } from '../core/tmdb-live.service';
import { ToastService } from '../core/toast.service';
import { ActorDialogService } from '../core/actor-dialog.service';
import { EMPTY_ENRICHMENT, WatchlistItem } from '../core/models';
import { normalizeKey, splitDirectores } from '../core/key.util';

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

  /**
   * El mejor tmdbId que tengamos para lo que está abierto, resuelto ANTES de
   * armar `fallbackItem` (así no depende circularmente de él): del
   * catálogo/watchlist si ya está vista/anotada, del enriquecimiento local,
   * de la pista que haya pasado quien abrió (ej. la fichita de actor/director,
   * que ya trae el id de TMDB de esa película puntual), o de lo que ya esté
   * cacheado en `tmdbLive` por haber aparecido como recomendación de otra.
   */
  private readonly candidateTmdbId = computed(() => {
    const target = this.dialog.openTarget();
    if (!target) return null;
    return (
      this.watchedMovie()?.tmdbId ??
      this.watchlistItem()?.tmdbId ??
      this.enrichment.map().get(target.key)?.tmdbId ??
      target.tmdbId ??
      this.tmdbLive.findByKey(target.key)?.tmdbId ??
      null
    );
  });

  /** Solo cuando no está ni vista ni en la lista: una ficha mínima armada con el stub + TMDB (local o, si no hay, en vivo). */
  private readonly fallbackItem = computed<WatchlistItem | null>(() => {
    const target = this.dialog.openTarget();
    if (!target || this.watchedMovie() || this.watchlistItem()) return null;
    const enrichmentEntry = this.enrichment.map().get(target.key);
    const id = this.candidateTmdbId();
    // ficha completa (duración/género/reparto/sinopsis/rating) — la única fuente
    // real para algo que nunca estuvo en el catálogo ni en "Quiero ver".
    const details = id ? this.tmdbLive.detailsCache().get(id) : null;
    // encadenado explícito para el póster: no queremos que un `details.poster`
    // null (todavía sin cargar, o TMDB sin póster) pise una pista o dato local válido.
    const poster = details?.poster ?? enrichmentEntry?.poster ?? target.poster ?? null;
    return {
      key: target.key,
      titulo: target.titulo,
      director: target.director,
      anioEstreno: target.anioEstreno,
      paisOrigen: '—',
      genero: '',
      agregadaEl: '',
      ...(enrichmentEntry ?? EMPTY_ENRICHMENT),
      ...(details ?? {}),
      poster,
      tmdbId: id,
    };
  });

  protected readonly watchlistVariant = computed(() => this.watchlistItem() ?? this.fallbackItem());
  protected readonly tracked = computed(() => !!this.watchlistItem());
  protected readonly dates = computed(() => this.watchedMovie()?.watchInstances.map((w) => w.fecha) ?? []);
  protected readonly isOpen = computed(() => !!this.watchedMovie() || !!this.watchlistVariant());

  /**
   * "Parecidas" + "Recomendadas (que no viste)" fusionadas en una sola grilla:
   * primero lo precomputado (similar.json, ya conocido), después lo nuevo de
   * TMDB en vivo que no se repite — cada entrada marcada si ya está en el
   * catálogo de vistas, para pintarla distinto en el template.
   */
  protected readonly recomendadas = computed<RecomendadaEntry[]>(() => {
    const base = this.watchedMovie()?.similar ?? this.watchlistVariant()?.similar ?? [];
    const id = this.candidateTmdbId();
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
    private readonly toast: ToastService,
    private readonly actorDialog: ActorDialogService,
  ) {
    effect(() => {
      const id = this.candidateTmdbId();
      if (!id) return;
      void this.tmdbLive.load(id); // recomendaciones
      // ficha completa: solo hace falta cuando no está vista/anotada -- si está,
      // ya tenemos todo del catálogo/watchlist, no vale la pena el llamado extra.
      if (!this.watchedMovie() && !this.watchlistItem()) void this.tmdbLive.loadDetails(id);
    });
  }

  protected close(): void {
    this.dialog.close();
  }

  protected openSimilar(titulo: string, director: string, anioEstreno: number | null): void {
    this.dialog.open({ key: normalizeKey(titulo, anioEstreno), titulo, director, anioEstreno });
  }

  protected openActor(nombre: string): void {
    this.actorDialog.open(nombre);
  }

  protected splitDir(raw: string): string[] {
    return splitDirectores(raw);
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
    const ok = await this.watchlist.add(item.titulo);
    this.addPending.set(false);
    if (ok) this.toast.show(`"${item.titulo}" agregada a "Quiero ver"`);
  }
}
