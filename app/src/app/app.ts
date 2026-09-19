import { Component } from '@angular/core';
import { ThemeService } from './core/theme.service';
import { CatalogDataService } from './core/catalog-data.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(
    protected readonly theme: ThemeService,
    protected readonly catalog: CatalogDataService,
  ) {}
}
