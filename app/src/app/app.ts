import { Component } from '@angular/core';
import { ThemeService } from './core/theme.service';
import { PlacaCatalog } from './catalog/placa-catalog';

@Component({
  selector: 'app-root',
  imports: [PlacaCatalog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(protected readonly theme: ThemeService) {}
}
