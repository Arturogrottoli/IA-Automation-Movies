import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './app-footer.html',
  styleUrl: './app-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooter {
  constructor(protected readonly catalog: CatalogDataService) {}

  // Última fecha vista que ya pasó (descarta entradas con fecha futura, ej. datos de prueba).
  protected readonly lastEntry = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dates = this.catalog
      .viewings()
      .map((v) => v.fecha)
      .filter((d) => d && d <= today)
      .sort();
    return dates[dates.length - 1] || '';
  });
}
