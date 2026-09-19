import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import {
  CatalogFilters,
  DEFAULT_SORT_DIR,
  EMPTY_FILTERS,
  GridEntry,
  SortKey,
  SortState,
  dedupeToMovies,
  filterViewings,
  sortViewings,
} from '../core/catalog-filters.util';
import { decadeOf, nf, tally } from '../core/key.util';
import { DialogService } from '../core/dialog.service';
import { FilterBar } from './filter-bar/filter-bar';
import { CatalogTable } from './catalog-table/catalog-table';
import { MovieCard } from '../shared/movie-card/movie-card';
import { Pager } from '../shared/pager/pager';

const PAGE_SIZE = 25;

type ViewMode = 'list' | 'grid';

@Component({
  selector: 'app-placa-catalog',
  imports: [FilterBar, CatalogTable, MovieCard, Pager],
  templateUrl: './placa-catalog.html',
  styleUrl: './placa-catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaCatalog {
  protected readonly PAGE_SIZE = PAGE_SIZE;

  protected readonly filters = signal<CatalogFilters>(EMPTY_FILTERS);
  protected readonly sort = signal<SortState>({ key: 's', dir: -1 });
  protected readonly view = signal<ViewMode>('list');
  protected readonly page = signal(1);

  // Las opciones de los selects se calculan sobre TODOS los visionados (no
  // deduplicados por película), igual que el original: una peli revisitada
  // pesa varias veces en el orden por frecuencia de país/género.
  protected readonly decadeOptions = computed(() =>
    [...new Set(this.catalog.movies().map((m) => decadeOf(m.anioEstreno)).filter((d): d is number => !!d))].sort(
      (a, b) => b - a,
    ),
  );
  protected readonly countryOptions = computed(() =>
    [...tally(this.catalog.viewings(), (v) => v.movie.paisOrigen).entries()]
      .filter(([country]) => country !== '—')
      .sort((a, b) => b[1] - a[1])
      .map(([country]) => country),
  );
  protected readonly genreOptions = computed(() =>
    [...tally(this.catalog.viewings(), (v) => v.movie.genres).entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g),
  );
  protected readonly yearOptions = computed(() =>
    [...new Set(this.catalog.viewings().map((v) => v.anioVisto).filter((y): y is number => !!y))].sort(
      (a, b) => b - a,
    ),
  );

  private readonly filteredSortedViewings = computed(() =>
    sortViewings(filterViewings(this.catalog.viewings(), this.filters()), this.sort()),
  );

  protected readonly gridEntries = computed<GridEntry[]>(() => dedupeToMovies(this.filteredSortedViewings()));

  protected readonly totalForView = computed(() =>
    this.view() === 'grid' ? this.gridEntries().length : this.filteredSortedViewings().length,
  );

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalForView() / PAGE_SIZE)));
  protected readonly effectivePage = computed(() => Math.min(this.page(), this.totalPages()));

  protected readonly pagedViewings = computed(() => {
    const p = this.effectivePage();
    return this.filteredSortedViewings().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });

  protected readonly pagedGridEntries = computed(() => {
    const p = this.effectivePage();
    return this.gridEntries().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });

  protected readonly countText = computed(() => {
    if (this.view() === 'grid') {
      return `${nf(this.gridEntries().length)} películas · ${nf(this.filteredSortedViewings().length)} visionados`;
    }
    return `Mostrando ${nf(this.filteredSortedViewings().length)} de ${nf(this.catalog.viewings().length)} películas`;
  });

  constructor(
    protected readonly catalog: CatalogDataService,
    private readonly dialog: DialogService,
  ) {}

  protected onFiltersChange(filters: CatalogFilters): void {
    this.filters.set(filters);
    this.page.set(1);
  }

  protected onSortChange(key: SortKey): void {
    this.sort.update((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: DEFAULT_SORT_DIR[key] }));
    this.page.set(1);
  }

  protected setView(view: ViewMode): void {
    this.view.set(view);
    this.page.set(1);
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }

  protected onOpenMovie(key: string): void {
    const movie = this.catalog.movies().find((m) => m.key === key);
    if (movie) {
      this.dialog.open({ key: movie.key, titulo: movie.titulo, director: movie.director, anioEstreno: movie.anioEstreno });
    }
  }
}
