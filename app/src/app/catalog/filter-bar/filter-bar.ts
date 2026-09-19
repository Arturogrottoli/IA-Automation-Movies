import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { CatalogFilters } from '../../core/catalog-filters.util';

@Component({
  selector: 'app-filter-bar',
  imports: [],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBar {
  readonly filters = model.required<CatalogFilters>();
  readonly decadeOptions = input.required<number[]>();
  readonly countryOptions = input.required<string[]>();
  readonly genreOptions = input.required<string[]>();
  readonly yearOptions = input.required<number[]>();

  protected updateSearch(value: string): void {
    this.filters.update((f) => ({ ...f, search: value }));
  }
  protected updateDecade(value: string): void {
    this.filters.update((f) => ({ ...f, decade: value ? +value : null }));
  }
  protected updateCountry(value: string): void {
    this.filters.update((f) => ({ ...f, country: value }));
  }
  protected updateGenre(value: string): void {
    this.filters.update((f) => ({ ...f, genre: value }));
  }
  protected updateYear(value: string): void {
    this.filters.update((f) => ({ ...f, anioVisto: value ? +value : null }));
  }
  protected updateOnlyRewatches(checked: boolean): void {
    this.filters.update((f) => ({ ...f, onlyRewatches: checked }));
  }
}
