import { Component, computed } from '@angular/core';
import { ThemeService } from './core/theme.service';
import { CatalogDataService } from './core/catalog-data.service';
import { VitalsStrip } from './vitals/vitals-strip';
import { PlacaCharts } from './charts/placa-charts';
import { PlacaRewatches } from './rewatches/placa-rewatches';
import { PlacaWatchlist } from './watchlist/placa-watchlist';
import { PlacaCatalog } from './catalog/placa-catalog';
import { PlacaCaseStudy } from './case-study/placa-case-study';
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
    AppFooter,
    MovieDetailDialog,
    ConfirmDialog,
    ChartTooltip,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(
    protected readonly theme: ThemeService,
    protected readonly catalog: CatalogDataService,
  ) {}

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
