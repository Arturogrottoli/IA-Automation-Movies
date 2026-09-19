import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Dialog } from '../dialog/dialog';
import { ConfirmService } from '../../core/confirm.service';

/** Único diálogo de confirmación de todo el sitio — hoy solo lo dispara sacar algo de "Quiero ver". */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Dialog],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly pending = signal(false);

  constructor(protected readonly confirmService: ConfirmService) {}

  protected async confirm(): Promise<void> {
    const req = this.confirmService.request();
    if (!req) return;
    this.pending.set(true);
    const ok = await req.onConfirm();
    this.pending.set(false);
    if (ok) this.confirmService.close();
  }

  protected cancel(): void {
    this.confirmService.close();
  }
}
