import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Contenido estático (no depende de datos en vivo) — caso de estudio de limpieza de datos. */
@Component({
  selector: 'app-placa-case-study',
  imports: [],
  templateUrl: './placa-case-study.html',
  styleUrl: './placa-case-study.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaCaseStudy {}
