import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { TasteProfileService } from '../core/taste-profile.service';

/**
 * Placa VII · perfil de gusto — snapshot de `taste_profile.json`
 * (`cerebro/taste_profile.py`, pandas + sklearn corrido offline). Prosa fija
 * escrita a mano sobre los signals reales, mismo formato no interactivo que
 * la Placa V. La narración en lenguaje natural por Gemini queda pendiente de
 * Make (ver README) — esto no depende de eso.
 */
@Component({
  selector: 'app-placa-taste-profile',
  imports: [],
  templateUrl: './placa-taste-profile.html',
  styleUrl: './placa-taste-profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaTasteProfile {
  protected readonly profile = computed(() => this.tasteProfile.profile());

  protected readonly topGenero = computed(() => this.profile()?.top_generos[0] ?? null);
  protected readonly topDecada = computed(() => this.profile()?.top_decadas[0] ?? null);
  protected readonly topDirector = computed(() => this.profile()?.top_directores[0] ?? null);
  protected readonly segundoDirector = computed(() => this.profile()?.top_directores[1] ?? null);

  protected readonly pesoDuracion = computed(() => this.profile()?.variables_mas_importantes[0] ?? null);
  protected readonly rango160 = computed(() => this.profile()?.tasa_por_duracion.at(-1) ?? null);

  constructor(private readonly tasteProfile: TasteProfileService) {
    void this.tasteProfile.load();
  }
}
