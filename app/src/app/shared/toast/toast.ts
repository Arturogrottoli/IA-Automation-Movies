import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ToastService } from '../../core/toast.service';

/** Toast único, siempre montado — opacidad maneja la visibilidad (mismo patrón que ChartTooltip). */
@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  constructor(protected readonly toast: ToastService) {}
}
