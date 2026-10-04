import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlacaWatchlist } from '../watchlist/placa-watchlist';
import { PlacaCatalog } from '../catalog/placa-catalog';
import { PlacaPerson } from '../person/placa-person';
import { PlacaRecommender } from '../recommender/placa-recommender';
import { PlacaNine } from '../nine/placa-nine';

/** Sección principal: las películas en sí — el índice completo, lo que viene, buscar por persona, recomendador, Mis 9. */
@Component({
  selector: 'app-movies-page',
  imports: [PlacaWatchlist, PlacaCatalog, PlacaPerson, PlacaRecommender, PlacaNine],
  template: `
    <app-placa-catalog />
    <app-placa-watchlist />
    <app-placa-person />
    <app-placa-recommender />
    <app-placa-nine />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoviesPage {}
