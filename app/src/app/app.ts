import { Component } from '@angular/core';
import { ThemeService } from './core/theme.service';
import { PlacaCatalog } from './catalog/placa-catalog';
import { MovieDetailDialog } from './movie-detail/movie-detail-dialog';

@Component({
  selector: 'app-root',
  imports: [PlacaCatalog, MovieDetailDialog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(protected readonly theme: ThemeService) {}
}
