# cerebro/ — datos del catálogo

La fuente de verdad del catálogo es la **hoja de Google** (pestaña
`catalogo_completo`), que se mantiene sola vía el bot de Telegram + Make.
Acá solo queda una copia portable y el script del fallback.

## Archivos

| Archivo | Qué es |
|---|---|
| `catalogo_completo.csv` | Copia portable de la hoja. La refresca `build_site.js`. |
| `build_site.js` | `node cerebro/build_site.js` → baja la hoja publicada y refresca la instantánea embebida en `../index.html` y este CSV. |
| `CONFIG.md` | Dónde vive cada secreto (todos en Make, ninguno en el repo). |
| `Pelis_backup_*.xlsx` | Backup de la planilla con las pestañas por año. Ignorado por git. |

Los scripts y fuentes que armaron el catálogo inicial
(`build_2026.js`, `build_catalogo.js`, `peliculas_import.csv`, `pelis_2026.csv`)
ya cumplieron su función y se sacaron; siguen en el historial de git si hicieran falta.

## Esquema de la tabla `catalogo_completo`

`id · numero · titulo · director · anio_estreno · pais_origen · fecha_vista · anio_visto · es_revisionado · estado_enriquecimiento · fuente · genero · animo · sinopsis · poster_url · rating_externo · notas_ia`

`estado_enriquecimiento`: `Migrada` / `Aprobada` (históricos) · `Enriquecida IA` (las que agrega el bot).
`fuente`: `CSV historico` · `Bot Telegram`.

Columnas `R` (`revisionado`) y `S` (`numero_orden`) en la hoja son fórmulas —
no están en el CSV porque Make solo escribe A–Q.
