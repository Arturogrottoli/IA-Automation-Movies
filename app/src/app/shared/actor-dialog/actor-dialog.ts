import { ChangeDetectionStrategy, Component, computed, effect } from '@angular/core';
import { Dialog } from '../dialog/dialog';
import { ActorDialogService } from '../../core/actor-dialog.service';
import { ActorKnownFor, ActorLiveService } from '../../core/actor-live.service';
import { DialogService } from '../../core/dialog.service';
import { normalizeKey } from '../../core/key.util';

/**
 * Fichita de actor/actriz, en vivo desde TMDB (`/search/person`, un solo
 * llamado trae foto + "known for") — se abre clickeando cualquier chip de
 * reparto en el modal de detalle. Clickear una de sus películas abre el
 * modal de detalle normal para esa película (mismo mecanismo que "Parecidas").
 */
@Component({
  selector: 'app-actor-dialog',
  imports: [Dialog],
  templateUrl: './actor-dialog.html',
  styleUrl: './actor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorDialog {
  protected readonly nombre = computed(() => this.actorDialog.openName());

  /** undefined = todavía no llegó la respuesta; null = buscado, sin resultado en TMDB. */
  protected readonly info = computed(() => {
    const n = this.nombre();
    return n ? this.actorLive.cache().get(n.trim().toLowerCase()) : undefined;
  });

  constructor(
    protected readonly actorDialog: ActorDialogService,
    private readonly actorLive: ActorLiveService,
    private readonly movieDialog: DialogService,
  ) {
    effect(() => {
      const n = this.nombre();
      if (n) void this.actorLive.load(n);
    });
  }

  protected close(): void {
    this.actorDialog.close();
  }

  protected openMovie(m: ActorKnownFor): void {
    this.actorDialog.close();
    this.movieDialog.open({
      key: normalizeKey(m.titulo, m.anioEstreno),
      titulo: m.titulo,
      director: '',
      anioEstreno: m.anioEstreno,
      poster: m.poster?.replace('/w185/', '/w342/') ?? null,
      tmdbId: m.tmdbId,
    });
  }
}
