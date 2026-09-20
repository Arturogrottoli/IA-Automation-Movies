import { Component, computed, effect } from '@angular/core';
import { ThemeService } from './core/theme.service';
import { CatalogDataService } from './core/catalog-data.service';
import { WatchlistDataService } from './core/watchlist-data.service';
import { DialogService } from './core/dialog.service';
import { VitalsStrip } from './vitals/vitals-strip';
import { PlacaCharts } from './charts/placa-charts';
import { PlacaRewatches } from './rewatches/placa-rewatches';
import { PlacaWatchlist } from './watchlist/placa-watchlist';
import { PlacaCatalog } from './catalog/placa-catalog';
import { PlacaCaseStudy } from './case-study/placa-case-study';
import { PlacaKpis } from './kpis/placa-kpis';
import { AppFooter } from './footer/app-footer';
import { MovieDetailDialog } from './movie-detail/movie-detail-dialog';
import { ConfirmDialog } from './shared/confirm-dialog/confirm-dialog';
import { ChartTooltip } from './shared/chart-tooltip/chart-tooltip';

@Component({
  selector: 'app-root',
  imports: [
    VitalsStrip,
    PlacaCharts,
    PlacaRewatches,
    PlacaWatchlist,
    PlacaCatalog,
    PlacaCaseStudy,
    PlacaKpis,
    AppFooter,
    MovieDetailDialog,
    ConfirmDialog,
    ChartTooltip,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private linkedFromUrl = false;

  constructor(
    protected readonly theme: ThemeService,
    protected readonly catalog: CatalogDataService,
    private readonly watchlist: WatchlistDataService,
    private readonly dialog: DialogService,
  ) {
    // Si la URL trae ?p=<key> (compartida desde el modal), la abre apenas
    // catálogo y watchlist terminan de cargar. Una sola vez — no debe
    // reabrirse si el usuario ya cerró el modal a mano.
    effect(() => {
      if (this.linkedFromUrl || this.catalog.loading() || !this.watchlist.loaded()) return;
      this.linkedFromUrl = true;
      const key = new URLSearchParams(location.search).get('p');
      if (!key) return;
      const found = this.catalog.movies().find((m) => m.key === key) ?? this.watchlist.items().find((i) => i.key === key);
      if (found) {
        this.dialog.open({ key: found.key, titulo: found.titulo, director: found.director, anioEstreno: found.anioEstreno });
      } else {
        const url = new URL(location.href);
        url.searchParams.delete('p');
        history.replaceState(null, '', url);
      }
    });
  }

  protected readonly eyebrowRange = computed(() => {
    const years = this.catalog
      .viewings()
      .map((v) => v.anioVisto)
      .filter((y): y is number => !!y);
    if (!years.length) return '2018 — 2026';
    return `${Math.min(...years)} — ${Math.max(...years)}`;
  });

  protected readonly eyebrowFeed = computed(() => (this.catalog.live() ? 'datos en vivo' : 'alimentado por un bot'));
}
