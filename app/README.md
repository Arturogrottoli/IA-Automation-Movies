# app/ — el sitio

App de Angular 20 (standalone, signals, zoneless) publicada en Vercel:
https://turimoviesdatabase.vercel.app. Qué hace y cómo encaja con el resto del
proyecto: ver el [README principal](../README.md) y
[docs/arquitectura.md](../docs/arquitectura.md).

## Correrla local

```bash
npm install
npx ng serve        # http://localhost:4200
npx ng build        # salida en dist/app/browser (lo que publica Vercel)
npx ng test --watch=false --browsers=ChromeHeadless
```

`ng serve` no levanta la función de CinefilIA (`api/chat.ts`): esa corre solo
en Vercel, con la clave `GEMINI_API_KEY`. El resto del sitio anda igual.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `src/app/pages/` | las dos secciones: Películas (`/`) y Datos (`/datos`) |
| `src/app/<placa>/` | una carpeta por placa (catalog, watchlist, person, recommender, nine, world, charts, dashboard, taste-profile, kpis…) |
| `src/app/core/` | servicios de datos (catálogo, watchlist, TMDB en vivo, enriquecimiento) y utilidades |
| `src/app/shared/` | componentes reusados: gráfico de barras, modales, CinefilIA, portada rotativa |
| `api/` | la función de Vercel de CinefilIA (`chat.ts`: el bucle del agente), con su propio `tsconfig` (commonjs) |
| `api/_lib/` | lo que usa la función: `datos.ts` (catálogo, "Quiero ver" y `data/*.json`, cacheados 10 min) y `tools.ts` (las herramientas del agente). Vercel no publica como endpoint lo que está en carpetas con `_` |
| `public/data/` | la instantánea del catálogo (por si la hoja no responde) y el mapa del mundo |

Los datos enriquecidos (pósters, reparto, recomendadores…) no están acá:
viven en `../data/` y el sitio los lee directo del repo de GitHub.
