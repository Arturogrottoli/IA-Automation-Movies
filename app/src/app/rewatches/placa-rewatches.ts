import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { nf } from '../core/key.util';

interface RewatchRow {
  titulo: string;
  director: string;
  anioEstreno: number | null;
  count: number;
}

@Component({
  selector: 'app-placa-rewatches',
  imports: [],
  templateUrl: './placa-rewatches.html',
  styleUrl: './placa-rewatches.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaRewatches {
  constructor(protected readonly catalog: CatalogDataService) {}

  private readonly repeated = computed(() => this.catalog.movies().filter((m) => m.watchInstances.length > 1));

  protected readonly intro = computed(() => {
    const rep = this.repeated();
    const events = rep.reduce((s, m) => s + m.watchInstances.length - 1, 0);
    return { count: rep.length, events };
  });

  protected readonly list = computed<RewatchRow[]>(() => {
    const all = this.repeated()
      .map((m) => ({ titulo: m.titulo, director: m.director, anioEstreno: m.anioEstreno, count: m.watchInstances.length }))
      .sort((a, b) => b.count - a.count || a.titulo.localeCompare(b.titulo));
    const strong = all.filter((o) => o.count >= 3);
    return strong.length >= 10 ? strong : all.slice(0, 20);
  });

  protected readonly nf = nf;
}
