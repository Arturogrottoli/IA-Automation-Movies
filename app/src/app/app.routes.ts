import { Routes } from '@angular/router';
import { MoviesPage } from './pages/movies-page';
import { DataPage } from './pages/data-page';

/**
 * Dos secciones: Películas (catálogo, listas, búsquedas — lo de "usar") y
 * Datos (gráficos, limpieza, machine learning, KPIs — lo de "analizar").
 * Rutas reales (no #), así cada sección se comparte con su link; Vercel
 * reescribe todo a index.html (ver vercel.json).
 */
export const routes: Routes = [
  { path: '', component: MoviesPage, title: 'Diario de proyección' },
  { path: 'datos', component: DataPage, title: 'Datos · Diario de proyección' },
  { path: '**', redirectTo: '' },
];
