# Configuración y secretos

**Ningún secreto va en el repo.** Cada uno vive donde corresponde:

| Secreto | Dónde vive | Para qué | Cómo se obtiene |
|---|---|---|---|
| Token del bot de Telegram | Conexión "Telegram Bot" en Make | el bot de registro | @BotFather → `/newbot` (o `/revoke` para rotar) |
| API key de Gemini (Make) | Conexión / HTTP en Make | clasificar y completar fichas en el bot | aistudio.google.com → Get API key (sin tarjeta) |
| API key de Gemini (sitio) | Vercel → Settings → Environment Variables → `GEMINI_API_KEY` | CinefilIA, el chat del sitio (`app/api/chat.ts`) | aistudio.google.com, en un **proyecto aparte** (cuota separada del bot) |
| Token de lectura de TMDB | GitHub → Settings → Secrets → Actions → `TMDB_TOKEN`, y local en `cerebro/tmdb.key` (ignorado por git) | la sincronización diaria y los scripts de `cerebro/` | themoviedb.org → Settings → API → "API Read Access Token" |
| Acceso a Google Sheets | Conexión "Google Sheets" en Make (OAuth) | escribir filas | se autoriza al crear la conexión |
| ID del Google Sheet | Se elige desde el selector de Make | — | está en la URL del Sheet |

El token de TMDB también está en el código del sitio
(`app/src/app/core/tmdb-live.service.ts`) **a propósito**: es de solo lectura,
TMDB es gratis y el límite es por IP, no por token. La clave de Gemini, en
cambio, nunca pasa por el navegador.

## Si un secreto se filtró

- **Telegram:** @BotFather → `/revoke` → elegir el bot → token nuevo → actualizar la conexión en Make. El viejo queda muerto al instante.
- **Gemini (sitio):** aistudio.google.com → borrar la clave → crear otra → actualizarla en Vercel y redeployar.
- **TMDB:** themoviedb.org → Settings → API → regenerar → actualizar el secreto de GitHub, `cerebro/tmdb.key` y `tmdb-live.service.ts`.

## Al entregar (PE3 pide blueprint público)

Antes de exportar el blueprint de Make (`.json`), Make **borra las credenciales** de las conexiones automáticamente — igual revisá el archivo antes de subirlo.
