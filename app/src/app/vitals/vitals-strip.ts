import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { nf } from '../core/key.util';

interface Tile {
  n: string;
  l: string;
}

@Component({
  selector: 'app-vitals-strip',
  imports: [],
  templateUrl: './vitals-strip.html',
  styleUrl: './vitals-strip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsStrip {
  constructor(protected readonly catalog: CatalogDataService) {}

  protected readonly tiles = computed<Tile[]>(() => {
    const viewings = this.catalog.viewings();
    const movies = this.catalog.movies();
    if (!viewings.length) return [];

    const dirs = new Set(viewings.map((v) => v.director).filter(Boolean));
    const countries = new Set(viewings.map((v) => v.paisOrigen).filter((c) => c && c !== '—'));
    const years = viewings.map((v) => v.anioVisto).filter((y): y is number => !!y);
    const yMin = Math.min(...years);
    const yMax = Math.max(...years);
    const rw = movies.filter((m) => m.watchInstances.length > 1).length;
    const argCount = viewings.filter((v) => v.paisOrigen === 'Argentina').length;
    const runtimes = viewings.map((v) => v.movie.runtimeMin).filter((x): x is number => x != null);
    const avgRuntime = runtimes.length ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : null;

    const tiles: Tile[] = [
      { n: nf(viewings.length), l: 'películas vistas' },
      { n: nf(dirs.size), l: 'directores distintos' },
      { n: nf(countries.size), l: 'países de origen' },
      { n: `${yMin}–${yMax}`, l: 'años de registro' },
      { n: nf(rw), l: 'títulos revisitados' },
      { n: `${Math.round((argCount / viewings.length) * 100)}%`, l: 'cine argentino' },
    ];
    if (avgRuntime) tiles.push({ n: `${avgRuntime} min`, l: 'duración promedio' });
    return tiles;
  });
}
