import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Viewing } from '../../core/models';
import { SortKey, SortState } from '../../core/catalog-filters.util';

interface Column {
  key: SortKey;
  label: string;
  width?: string;
}

@Component({
  selector: 'app-catalog-table',
  imports: [],
  templateUrl: './catalog-table.html',
  styleUrl: './catalog-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogTable {
  readonly viewings = input.required<Viewing[]>();
  readonly sort = input.required<SortState>();
  readonly sortChange = output<SortKey>();
  readonly open = output<string>();

  protected readonly columns: Column[] = [
    { key: 'y', label: 'Año', width: '52px' },
    { key: 't', label: 'Título' },
    { key: 'd', label: 'Director' },
    { key: 'p', label: 'País', width: '104px' },
    { key: 'r', label: '★', width: '46px' },
    { key: 's', label: 'Vista', width: '92px' },
  ];

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | null {
    if (this.sort().key !== key) return null;
    return this.sort().dir > 0 ? 'ascending' : 'descending';
  }

  protected arrow(key: SortKey): string {
    if (this.sort().key !== key) return '';
    return this.sort().dir > 0 ? '↑' : '↓';
  }
}
