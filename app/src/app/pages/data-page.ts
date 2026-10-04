import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlacaCharts } from '../charts/placa-charts';
import { PlacaRewatches } from '../rewatches/placa-rewatches';
import { PlacaCaseStudy } from '../case-study/placa-case-study';
import { PlacaDashboard } from '../dashboard/placa-dashboard';
import { PlacaTasteProfile } from '../taste-profile/placa-taste-profile';
import { PlacaRecommender } from '../recommender/placa-recommender';
import { PlacaKpis } from '../kpis/placa-kpis';

/** Sección de datos: gráficos, la limpieza, el dashboard, lo de machine learning y los KPIs del sistema. */
@Component({
  selector: 'app-data-page',
  imports: [PlacaCharts, PlacaRewatches, PlacaCaseStudy, PlacaDashboard, PlacaTasteProfile, PlacaRecommender, PlacaKpis],
  template: `
    <app-placa-charts />
    <app-placa-rewatches />
    <app-placa-case-study />
    <app-placa-dashboard />
    <app-placa-taste-profile />
    <app-placa-recommender />
    <app-placa-kpis />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataPage {}
