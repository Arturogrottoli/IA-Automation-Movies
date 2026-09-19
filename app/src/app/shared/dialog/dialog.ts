import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

/**
 * Modal genérico (backdrop + Escape + click afuera), portado del original.
 * Reusado por el detalle de película y por los diálogos de confirmar/agregar
 * de "Quiero ver" — antes eran 3 implementaciones separadas a mano.
 *
 * `compact`: aplica el tamaño chico (`.modal-confirm`) que usan confirmar/agregar.
 * `showCloseButton`: el modal de detalle tiene el botón ✕; confirmar/agregar
 * no lo tenían en el original (solo Cancelar + click afuera/Escape).
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
  readonly compact = input(false);
  readonly showCloseButton = input(true);
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
