import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChartTooltipService } from '../../core/chart-tooltip.service';

@Component({
  selector: 'app-chart-tooltip',
  imports: [],
  templateUrl: './chart-tooltip.html',
  styleUrl: './chart-tooltip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartTooltip {
  constructor(protected readonly tooltip: ChartTooltipService) {}
}
