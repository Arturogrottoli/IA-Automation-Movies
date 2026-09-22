import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { DialogService } from '../core/dialog.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { WatchlistItem } from '../core/models';
import { deburr } from '../core/key.util';
import { MovieCard } from '../shared/movie-card/movie-card';
import { Pager } from '../shared/pager/pager';
import { Dialog } from '../shared/dialog/dialog';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-placa-watchlist',
  imports: [MovieCard, Pager, Dialog],
  templateUrl: './placa-watchlist.html',
  styleUrl: './placa-watchlist.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaWatchlist {
  protected readonly PAGE_SIZE = PAGE_SIZE;

  protected readonly page = signal(1);

  protected readonly addOpen = signal(false);
  protected readonly addTitulo = signal('');
  protected readonly addError = signal<string | null>(null);
  protected readonly addPending = signal(false);

  // Una vez que registrás que la viste, sale sola de "Quiero ver" — match por
  // título (igual que el original) O por tmdbId (agregado: el mismo título
  // puede quedar escrito en idiomas distintos entre "por_ver" y
  // "catalogo_completo" -- ej. "Asesinato en el Orient Express" vs. "Murder
  // on the Orient Express" -- y el match de texto nunca los va a reconocer
  // como la misma película). tmdbId es el identificador real de TMDB, ya
  // verificado en el backfill -- más confiable que director+año, que da
  // falsos positivos cuando un director estrena más de una película el
  // mismo año (ej. Coppola 1974: "The Conversation" y "The Godfather 2" son
  // películas distintas, probado con un intento anterior de este fix).
  protected readonly pendingItems = computed(() => {
    const movies = this.catalog.movies();
    const seenTitles = new Set(movies.map((m) => deburr(m.titulo).trim()));
    const seenTmdbIds = new Set(movies.filter((m) => m.tmdbId != null).map((m) => m.tmdbId));
    return this.watchlist
      .items()
      .filter((i) => {
        if (seenTitles.has(deburr(i.titulo).trim())) return false;
        if (i.tmdbId != null && seenTmdbIds.has(i.tmdbId)) return false;
        return true;
      })
      .sort((a, b) => (b.agregadaEl || '').localeCompare(a.agregadaEl || ''));
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.pendingItems().length / PAGE_SIZE)));
  protected readonly effectivePage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly pagedItems = computed(() => {
    const p = this.effectivePage();
    return this.pendingItems().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });

  constructor(
    protected readonly catalog: CatalogDataService,
    protected readonly watchlist: WatchlistDataService,
    private readonly dialog: DialogService,
    private readonly confirmService: ConfirmService,
    private readonly toast: ToastService,
  ) {}

  protected onPageChange(page: number): void {
    this.page.set(page);
  }

  protected openMovie(item: WatchlistItem): void {
    this.dialog.open({ key: item.key, titulo: item.titulo, director: item.director, anioEstreno: item.anioEstreno });
  }

  protected requestRemove(item: WatchlistItem): void {
    this.confirmService.ask(item.titulo, item.poster, 'Sacar', () =>
      this.watchlist.remove(item.titulo, item.anioEstreno),
    );
  }

  protected openAdd(): void {
    this.addTitulo.set('');
    this.addError.set(null);
    this.addOpen.set(true);
  }

  protected closeAdd(): void {
    this.addOpen.set(false);
  }

  protected async submitAdd(): Promise<void> {
    const t = this.addTitulo().trim();
    if (!t) {
      this.addError.set('Poné al menos el título.');
      return;
    }
    this.addError.set(null);
    this.addPending.set(true);
    const ok = await this.watchlist.add(t);
    this.addPending.set(false);
    if (ok) {
      this.closeAdd();
      this.toast.show(`"${t}" agregada a "Quiero ver"`);
    } else {
      this.addError.set('Error, probá de nuevo.');
    }
  }
}
