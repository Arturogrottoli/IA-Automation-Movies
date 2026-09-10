# cerebro/ — datos del catálogo

La fuente de verdad del catálogo es la **hoja de Google** (pestaña
`catalogo_completo`), que se mantiene sola vía el bot de Telegram + Make.
Acá solo quedan una copia portable y los scripts de mantenimiento.

## Archivos

| Archivo | Qué es |
|---|---|
| `catalogo_completo.csv` | Copia portable de la hoja. La refresca `build_site.js`. |
| `build_site.js` | Baja la hoja publicada y refresca la instantánea embebida en `../index.html` y este CSV. |
| `build_posters.js` | Backfill de póster/rating/género desde TMDB → `../posters.json` (lee también la pestaña `por_ver`). |
| `fix_posters.js` | Reintento de los que TMDB no matchea bien por typos (mapa de correcciones). |
| `check_datos.js` | Cruza el catálogo contra TMDB y marca año/director sospechosos. Solo reporta. |
| `CONFIG.md` | Dónde vive cada secreto (todos en Make, ninguno en el repo). |
| `tmdb.key` | Token de lectura de TMDB. Ignorado por git. |

Los scripts y fuentes que armaron el catálogo inicial
(`build_2026.js`, `build_catalogo.js`, `peliculas_import.csv`, `pelis_2026.csv`)
ya cumplieron y se sacaron; siguen en el historial de git si hicieran falta.

## Esquema de la tabla `catalogo_completo`

`id · numero · titulo · director · anio_estreno · pais_origen · fecha_vista · anio_visto · es_revisionado · estado_enriquecimiento · fuente · genero · animo · sinopsis · poster_url · rating_externo · notas_ia`

`estado_enriquecimiento`: `Migrada` / `Aprobada` (históricos) · `Enriquecida IA` (bot) · `Aprobada` (HITL).
`fuente`: `CSV historico` · `Bot Telegram`.

Columnas `R` (`revisionado`) y `S` (`numero_orden`) en la hoja son fórmulas —
no están en el CSV porque Make solo escribe A–Q.
