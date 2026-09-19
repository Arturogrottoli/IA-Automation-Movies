import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Movie, WatchlistItem } from '../../core/models';

/** Card de póster, reusada en la grilla del catálogo y en la de "Quiero ver". */
@Component({
  selector: 'app-movie-card',
  imports: [],
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieCard {
  readonly movie = input.required<Movie | WatchlistItem>();
  /** ×N mostrado sobre el póster — cuenta que decide el que arma la grilla, no siempre movie.watchInstances.length. */
  readonly badgeCount = input<number>(1);
  /** Solo en "Quiero ver": la ✕ que aparece al hover sobre el póster. */
  readonly showRemove = input(false);
  readonly open = output<void>();
  readonly remove = output<void>();

  protected onRemoveClick(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
