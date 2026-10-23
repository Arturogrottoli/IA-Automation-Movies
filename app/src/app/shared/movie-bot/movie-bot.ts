import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, signal, viewChild } from '@angular/core';

interface BotMessage {
  role: 'user' | 'model';
  text: string;
  /** Qué consultó el bot para responder ("lo visto (Scorsese) · TMDB (Kubrick)"). */
  fuentes?: string;
}

interface UsoHerramienta {
  nombre: string;
  args: Record<string, unknown>;
}

const STORAGE_KEY = 'bot-peliculero';
const ENDPOINT = '/api/chat';
const SUGERENCIAS = ['¿Qué vi de Hitchcock?', '¿Qué actriz vi más?', 'Recomendame algo parecido a Zodiac'];

const ETIQUETAS: Record<string, string> = {
  resumen_catalogo: 'totales del diario',
  buscar_vistas: 'lo visto',
  ranking: 'ranking',
  quiero_ver: 'Quiero ver',
  tmdb_persona: 'TMDB',
  tmdb_pelicula: 'TMDB',
};

function fuentes(hs: UsoHerramienta[]): string {
  const partes = hs.map((h) => {
    const det = Object.entries(h.args)
      .filter(([k]) => k !== 'limite' && k !== 'orden' && k !== 'rol')
      .map(([k, v]) => (typeof v === 'boolean' ? k.replace(/_/g, ' ') : String(v)))
      .join(', ');
    const nombre = ETIQUETAS[h.nombre] ?? h.nombre;
    return det ? `${nombre} (${det})` : nombre;
  });
  return [...new Set(partes)].join(' · ');
}

/**
 * Bot peliculero: botón flotante abajo a la derecha que abre un chat. Habla
 * con `/api/chat` (función de Vercel → agente de Gemini con herramientas sobre
 * el catálogo real y TMDB); la clave de la IA nunca pasa por el navegador. La
 * charla vive en sessionStorage: sobrevive a recargar la pestaña, no a cerrarla.
 */
@Component({
  selector: 'app-movie-bot',
  imports: [],
  templateUrl: './movie-bot.html',
  styleUrl: './movie-bot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieBot {
  protected readonly sugerencias = SUGERENCIAS;
  protected readonly open = signal(false);
  protected readonly messages = signal<BotMessage[]>(readHistory());
  protected readonly draft = signal('');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('input');

  constructor() {
    // Siempre mostrar lo último: después de cada mensaje nuevo o al abrir.
    afterRenderEffect(() => {
      this.messages();
      this.pending();
      const el = this.log()?.nativeElement;
      if (this.open() && el) el.scrollTop = el.scrollHeight;
    });
  }

  protected toggle(): void {
    this.open.update((o) => !o);
    if (this.open()) setTimeout(() => this.input()?.nativeElement.focus(), 0);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void this.send();
    } else if (e.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected async send(text = this.draft()): Promise<void> {
    const q = text.trim();
    if (!q || this.pending()) return;
    this.error.set(null);
    this.draft.set('');
    this.push({ role: 'user', text: q });
    this.pending.set(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: this.messages().map(({ role, text }) => ({ role, text })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; herramientas?: UsoHerramienta[] };
      if (res.ok && data.reply) {
        const f = data.herramientas?.length ? fuentes(data.herramientas) : '';
        this.push({ role: 'model', text: data.reply, ...(f ? { fuentes: f } : {}) });
      }
      else this.error.set(data.error ?? 'No pude responder ahora. Probá de nuevo en un rato.');
    } catch {
      this.error.set('Sin conexión con el bot. Probá de nuevo en un rato.');
    } finally {
      this.pending.set(false);
      this.input()?.nativeElement.focus();
    }
  }

  protected reset(): void {
    this.messages.set([]);
    this.error.set(null);
    saveHistory([]);
  }

  private push(m: BotMessage): void {
    this.messages.update((ms) => [...ms, m]);
    saveHistory(this.messages());
  }
}

function readHistory(): BotMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(ms: BotMessage[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ms.slice(-30)));
  } catch {
    /* sin storage: la charla dura lo que la página */
  }
}
