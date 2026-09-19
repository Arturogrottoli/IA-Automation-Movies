import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

/**
 * Modal genérico (backdrop + botón cerrar + Escape + click afuera), portado
 * del original. Reusado por el detalle de película, y en la Fase 4 por los
 * diálogos de confirmar/agregar de "Quiero ver" — hoy son 3 implementaciones
 * separadas a mano.
 */
@Component({
  selector: 'app-dialog',
  imports: [],
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
