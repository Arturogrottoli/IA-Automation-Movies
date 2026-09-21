import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { RecommenderService } from '../core/recommender.service';
import { Movie } from '../core/models';

/**
 * Placa VIII · recomendador de 2 métodos, comparados lado a lado. Primera
 * placa interactiva del cluster de Data Science (las de arriba son todas
 * narradas/estáticas) — puramente de lectura, no dispara ninguna escritura.
 *
 * "Por contenido": Movie.similar, ya viene de similar.json (EnrichmentService,
 * mezclado con TF-IDF de sinopsis). "Ajustado por tu perfil": similar_ajustado.json
 * (RecommenderService) — mismo candidate pool, pero director/género reponderados
 * por tasa de revisión real y década/duración por el peso que les dio el
 * Random Forest del perfil de gusto, no por pesos fijos a mano.
 */
@Component({
  selector: 'app-placa-recommender',
  imports: [],
  templateUrl: './placa-recommender.html',
  styleUrl: './placa-recommender.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaRecommender {
  protected readonly query = signal('');
  private readonly selectedKey = signal<string | null>(null);

  protected readonly matches = computed<Movie[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q || this.selectedKey()) return [];
    return this.catalog
      .movies()
      .filter((m) => m.titulo.toLowerCase().includes(q))
      .slice(0, 8);
  });

  protected readonly selected = computed<Movie | null>(() => {
    const key = this.selectedKey();
    return key ? (this.catalog.movies().find((m) => m.key === key) ?? null) : null;
  });

  protected readonly porContenido = computed(() => this.selected()?.similar ?? []);
  protected readonly porPerfil = computed(() => {
    const key = this.selectedKey();
    return key ? (this.recommender.map().get(key) ?? []) : [];
  });

  constructor(
    private readonly catalog: CatalogDataService,
    private readonly recommender: RecommenderService,
  ) {
    void this.recommender.load();
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
    this.selectedKey.set(null);
  }

  protected select(m: Movie): void {
    this.query.set(m.titulo);
    this.selectedKey.set(m.key);
  }

  protected clear(): void {
    this.query.set('');
    this.selectedKey.set(null);
  }
}
