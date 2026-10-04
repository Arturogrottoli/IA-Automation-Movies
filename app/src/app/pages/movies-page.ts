import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlacaWatchlist } from '../watchlist/placa-watchlist';
import { PlacaCatalog } from '../catalog/placa-catalog';
import { PlacaPerson } from '../person/placa-person';
import { PlacaRecommender } from '../recommender/placa-recommender';
import { PlacaNine } from '../nine/placa-nine';
import { PlacaWorld } from '../world/placa-world';

/** Sección principal: las películas en sí — el índice completo, lo que viene, buscar por persona, recomendador, Mis 9, el mapa del mundo. */
@Component({
  selector: 'app-movies-page',
  imports: [PlacaWatchlist, PlacaCatalog, PlacaPerson, PlacaRecommender, PlacaNine, PlacaWorld],
  template: `
    <app-placa-catalog />
    <app-placa-watchlist />
    <app-placa-person />
    <app-placa-recommender />
    <app-placa-nine />
    <app-placa-world />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoviesPage {}
