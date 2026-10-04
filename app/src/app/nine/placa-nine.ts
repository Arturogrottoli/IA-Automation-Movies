import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, signal, untracked, viewChild } from '@angular/core';
import { CatalogDataService } from '../core/catalog-data.service';
import { WatchlistDataService } from '../core/watchlist-data.service';
import { EnrichmentService } from '../core/enrichment.service';
import { ToastService } from '../core/toast.service';
import { ConfirmService } from '../core/confirm.service';
import { NINE_SLOTS, NinePick, NinePicksService, pickToken, posterUrl } from '../core/nine-picks.service';
import { deburr } from '../core/key.util';

type Mode = 'owner' | 'mine';

interface SearchHit {
  pick: NinePick;
  /** "vista" / "en tu lista" / "TMDB" — de dónde salió. */
  origen: string;
  yaElegida: boolean;
}

const NAME_KEY = 'mis9-nombre';

/**
 * Películas, Placa V · "Mis 9 películas" (inspirado en My 9 Movies). Dos vistas: la
 * selección fija del dueño (`mis9.json` en el repo) y la del visitante,
 * editable, que vive en el link (`?nueve=`) y en localStorage. Busca primero
 * en el catálogo y la watchlist (ya tienen póster), después en TMDB en vivo.
 * "Generar mi selección" dibuja una imagen cuadrada para redes en un canvas.
 */
@Component({
  selector: 'app-placa-nine',
  imports: [],
  templateUrl: './placa-nine.html',
  styleUrl: './placa-nine.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacaNine {
  protected readonly slots = Array.from({ length: NINE_SLOTS }, (_, i) => i);
  protected readonly posterUrl = posterUrl;

  protected readonly mode = signal<Mode>('mine');
  protected readonly ownerName = signal('');
  protected readonly ownerPicks = signal<(NinePick | null)[]>([]);
  protected readonly fromLink = signal(false);
  protected readonly resolving = signal(true);

  protected readonly activeSlot = signal<number | null>(null);
  protected readonly query = signal('');
  protected readonly activeHit = signal(0);
  private readonly tmdbHits = signal<NinePick[]>([]);
  protected readonly searching = signal(false);

  protected readonly nombre = signal(readName());
  protected readonly imageUrl = signal<string | null>(null);
  private imageBlob: Blob | null = null;
  protected readonly generating = signal(false);
  protected readonly canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator;

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly picks = computed(() => (this.mode() === 'owner' ? this.ownerPicks() : this.nine.picks()));
  protected readonly filled = computed(() => this.picks().filter(Boolean).length);
  protected readonly full = computed(() => this.filled() === NINE_SLOTS);
  protected readonly hasOwner = computed(() => this.ownerPicks().some(Boolean));

  /** El casillero donde cae lo que se elija: el activo, o el primero libre. */
  protected readonly targetSlot = computed(() => {
    const a = this.activeSlot();
    if (a != null) return a;
    const i = this.nine.picks().findIndex((p) => !p);
    return i < 0 ? null : i;
  });

  protected readonly hits = computed<SearchHit[]>(() => {
    const q = deburr(this.query()).trim();
    if (q.length < 2) return [];
    const chosen = new Set(this.nine.picks().filter(Boolean).map((p) => this.identity(p!)));
    const seen = new Set<string>();
    const out: SearchHit[] = [];
    const push = (pick: NinePick, origen: string) => {
      const id = this.identity(pick);
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ pick, origen, yaElegida: chosen.has(id) });
    };
    // Locales primero, por calidad de coincidencia: exacta > empieza > palabra que empieza > contiene
    // (así "alien" trae Alien antes que "Tiempo de vALIENtes").
    const rank = (titulo: string): number => {
      const t = deburr(titulo);
      if (t === q) return 0;
      if (t.startsWith(q)) return 1;
      if (t.split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) return 2;
      return t.includes(q) ? 3 : -1;
    };
    const local = [
      ...this.catalog.movies().map((m) => ({ m, origen: 'vista' })),
      ...this.watchlist.items().map((m) => ({ m, origen: 'en tu lista' })),
    ]
      .map((x) => ({ ...x, r: rank(x.m.titulo) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.m.titulo.length - b.m.titulo.length);
    for (const { m, origen } of local) {
      if (out.length >= 5) break;
      push({ tmdbId: m.tmdbId, key: m.key, titulo: m.titulo, anioEstreno: m.anioEstreno, poster: m.poster }, origen);
    }
    for (const t of this.tmdbHits()) {
      if (out.length >= 8) break;
      push(t, 'TMDB');
    }
    return out;
  });

  constructor(
    protected readonly nine: NinePicksService,
    private readonly catalog: CatalogDataService,
    private readonly watchlist: WatchlistDataService,
    private readonly enrichment: EnrichmentService,
    private readonly toast: ToastService,
    private readonly confirm: ConfirmService,
  ) {
    void this.bootstrap();

    // Sugerencias de TMDB con debounce, solo mientras se escribe.
    effect((onCleanup) => {
      const q = this.query().trim();
      if (q.length < 2) {
        this.tmdbHits.set([]);
        return;
      }
      this.searching.set(true);
      const t = setTimeout(async () => {
        const res = await this.nine.searchTmdb(q);
        if (this.query().trim() === q) {
          this.tmdbHits.set(res);
          this.searching.set(false);
        }
      }, 300);
      onCleanup(() => clearTimeout(t));
    });

    // La imagen generada queda vieja apenas cambia la selección o el nombre.
    effect(() => {
      this.picks();
      this.nombre();
      this.mode();
      untracked(() => this.dropImage());
    });
  }

  private async bootstrap(): Promise<void> {
    const tokens = this.nine.urlTokens();
    const ownerP = this.nine.loadOwner();
    await this.whenDataReady();

    const owner = await ownerP;
    if (owner?.picks?.length) {
      this.ownerName.set(owner.nombre ?? '');
      this.ownerPicks.set(await this.resolve(owner.picks.map((t) => (t == null ? '' : String(t)))));
    }

    if (tokens) {
      const stored = this.nine.stored();
      this.nine.replaceAll(await this.resolve(tokens));
      // Solo es "ajena" si difiere de lo guardado: recargar la propia también trae ?nueve=.
      this.fromLink.set(!stored || stored.map(pickToken).join(',') !== tokens.join(','));
      this.mode.set('mine');
    } else {
      const stored = this.nine.stored();
      if (stored) this.nine.replaceAll(stored);
      this.mode.set(this.hasOwner() && !stored?.some(Boolean) ? 'owner' : 'mine');
    }
    this.resolving.set(false);
  }

  /** Espera a que catálogo/watchlist/TMDB local estén (o a un tope de 6s, y sigue con lo que haya). */
  private async whenDataReady(): Promise<void> {
    const enrichment = this.enrichment.load();
    const t0 = Date.now();
    while ((this.catalog.loading() || !this.watchlist.loaded()) && Date.now() - t0 < 6000) {
      await new Promise((r) => setTimeout(r, 100));
    }
    await enrichment;
  }

  private async resolve(tokens: string[]): Promise<(NinePick | null)[]> {
    const local = [
      ...this.catalog.movies().map((m) => ({ tmdbId: m.tmdbId, key: m.key, titulo: m.titulo, anioEstreno: m.anioEstreno, poster: m.poster })),
      ...this.watchlist.items().map((w) => ({ tmdbId: w.tmdbId, key: w.key, titulo: w.titulo, anioEstreno: w.anioEstreno, poster: w.poster })),
    ];
    return Promise.all(
      tokens.map(async (t): Promise<NinePick | null> => {
        t = t.trim();
        if (!t) return null;
        if (/^\d+$/.test(t)) {
          const id = +t;
          return local.find((p) => p.tmdbId === id) ?? (await this.nine.fetchById(id));
        }
        return local.find((p) => p.key === t) ?? null;
      }),
    );
  }

  private identity(p: NinePick): string {
    return p.tmdbId != null ? `t${p.tmdbId}` : `k${p.key}`;
  }

  protected setMode(m: Mode): void {
    this.mode.set(m);
    this.activeSlot.set(null);
  }

  protected pickSlot(i: number): void {
    if (this.mode() !== 'mine') return;
    this.activeSlot.set(this.activeSlot() === i ? null : i);
    this.searchInput()?.nativeElement.focus();
  }

  protected removeSlot(i: number, e: Event): void {
    e.stopPropagation();
    this.nine.set(i, null);
    if (this.activeSlot() === i) this.activeSlot.set(null);
  }

  protected choose(h: SearchHit): void {
    if (h.yaElegida) return;
    const slot = this.targetSlot();
    if (slot == null) return;
    this.nine.set(slot, h.pick);
    this.activeSlot.set(null);
    this.query.set('');
    this.activeHit.set(0);
    this.fromLink.set(false);
    if (!this.full()) this.searchInput()?.nativeElement.focus();
  }

  protected updateQuery(v: string): void {
    this.query.set(v);
    this.activeHit.set(0);
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.hits().length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.activeHit.set((this.activeHit() + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.activeHit.set((this.activeHit() - 1 + n) % n);
    } else if (e.key === 'Enter' && n) {
      e.preventDefault();
      this.choose(this.hits()[this.activeHit()]);
    } else if (e.key === 'Escape') {
      this.query.set('');
      this.activeSlot.set(null);
    }
  }

  protected updateName(v: string): void {
    this.nombre.set(v);
    try {
      localStorage.setItem(NAME_KEY, v);
    } catch {
      /* sin storage: el nombre vale solo para esta visita */
    }
  }

  protected clearAll(): void {
    this.confirm.ask(
      'Mis 9 películas',
      null,
      'Vaciar',
      async () => {
        this.nine.clearAll();
        this.activeSlot.set(null);
        this.fromLink.set(false);
        return true;
      },
      '¿Vaciar los 9 casilleros? Si querés conservarla, copiá el link antes.',
    );
  }

  protected async generate(): Promise<void> {
    this.generating.set(true);
    try {
      const nombre = this.mode() === 'owner' ? this.ownerName() : this.nombre();
      const blob = await this.nine.renderImage(this.picks(), nombre);
      this.dropImage();
      this.imageBlob = blob;
      this.imageUrl.set(URL.createObjectURL(blob));
    } catch {
      this.toast.show('No se pudo generar la imagen. Probá de nuevo.');
    } finally {
      this.generating.set(false);
    }
  }

  protected async share(): Promise<void> {
    if (!this.imageBlob) return;
    const file = new File([this.imageBlob], 'mis-9-peliculas.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Mis 9 películas' });
      else this.toast.show('Tu navegador no permite compartir imágenes directo: descargala y subila.');
    } catch {
      /* el usuario canceló el diálogo de compartir */
    }
  }

  protected async copyLink(): Promise<void> {
    const url = this.mode() === 'owner' ? this.nine.shareUrl(this.ownerPicks()) : this.nine.shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      this.toast.show('Link copiado: guardalo o compartilo y la selección vuelve tal cual.');
    } catch {
      this.toast.show(url, 8000);
    }
  }

  private dropImage(): void {
    const url = this.imageUrl();
    if (url) URL.revokeObjectURL(url);
    this.imageUrl.set(null);
    this.imageBlob = null;
  }
}

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}
