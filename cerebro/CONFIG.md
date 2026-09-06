# Configuración y secretos

Este proyecto corre en Make (cloud), no hay código local que lea claves.
**Ningún secreto va en el repo.** Cada uno vive donde corresponde:

| Secreto | Dónde vive | Cómo se obtiene |
|---|---|---|
| Token del bot de Telegram | Conexión "Telegram Bot" en Make | @BotFather → `/newbot` (o `/revoke` para rotar) |
| API key de Gemini | Conexión / HTTP en Make | aistudio.google.com → Get API key (sin tarjeta) |
| Acceso a Google Sheets | Conexión "Google Sheets" en Make (OAuth) | se autoriza al crear la conexión |
| ID del Google Sheet | Se elige desde el selector de Make | está en la URL del Sheet |

## Si el token de Telegram se filtró

Pasó por el chat y el repo es público → **rotarlo**: @BotFather → `/revoke` → elegir el bot → token nuevo → actualizar la conexión en Make. El viejo queda muerto al instante.

## Al entregar (PE3 pide blueprint público)

Antes de exportar el blueprint de Make (`.json`), Make **borra las credenciales** de las conexiones automáticamente — igual revisá el archivo antes de subirlo.
