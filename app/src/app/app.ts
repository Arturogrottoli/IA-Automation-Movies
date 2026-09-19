import { Component } from '@angular/core';
import { ThemeService } from './core/theme.service';
import { PlacaCatalog } from './catalog/placa-catalog';
import { PlacaWatchlist } from './watchlist/placa-watchlist';
import { MovieDetailDialog } from './movie-detail/movie-detail-dialog';
import { ConfirmDialog } from './shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-root',
  imports: [PlacaWatchlist, PlacaCatalog, MovieDetailDialog, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(protected readonly theme: ThemeService) {}
}
