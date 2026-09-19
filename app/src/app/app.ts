import { Component } from '@angular/core';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(protected readonly theme: ThemeService) {}
}
