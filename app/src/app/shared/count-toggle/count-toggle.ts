import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CountModeService } from '../../core/count-mode.service';

/** Selector "Sin repetir / Contando repetidas", compartido por todos los gráficos (mismo estilo que Grilla/Lista). */
@Component({
  selector: 'app-count-toggle',
  template: `
    <div class="ct">
      <span class="ct-label" id="ct-label">Contar</span>
      <div class="ct-group" role="group" aria-labelledby="ct-label">
        <button
          [attr.aria-pressed]="modes.mode() === 'unicas'"
          title="Cada película una vez, aunque la hayas visto varias veces"
          (click)="modes.set('unicas')"
        >
          Sin repetir
        </button>
        <button
          [attr.aria-pressed]="modes.mode() === 'todas'"
          title="Cada vez que la viste: las revisiones suman"
          (click)="modes.set('todas')"
        >
          Contando repetidas
        </button>
      </div>
    </div>
  `,
  styles: `
    .ct {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin: -12px 0 28px;
    }
    .ct-label {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-3);
    }
    .ct-group {
      display: flex;
      border: 1px solid var(--line);
      border-radius: 6px;
      overflow: hidden;
    }
    .ct-group button {
      all: unset;
      cursor: pointer;
      padding: 8px 13px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-3);
    }
    .ct-group button + button {
      border-left: 1px solid var(--line);
    }
    .ct-group button[aria-pressed='true'] {
      background: var(--accent);
      color: #0d0d0f;
    }
    .ct-group button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountToggle {
  constructor(protected readonly modes: CountModeService) {}
}
