# cerebro/ — datos del catálogo

La fuente de verdad del catálogo es la **hoja de Google** (pestaña
`catalogo_completo`), que se mantiene sola vía el bot de Telegram + Make.
Acá están los scripts que enriquecen esos datos y un respaldo de la hoja.

## Sincronización diaria (automática)

[`../.github/workflows/sync-datos.yml`](../.github/workflows/sync-datos.yml)
corre todos los días a las 07:00 (AR) en GitHub Actions, en este orden, y
commitea solo si algo cambió. No hace falta correrlos a mano.

| Archivo | Qué hace |
|---|---|
| `catalogo_completo.csv` | Respaldo diario de la hoja (lo baja la sincronización). |
| `build_posters.js` | Póster, rating y género desde TMDB → `../data/posters.json` (también lee la pestaña `por_ver`). Solo busca lo nuevo. |
| `build_actors.js` | Reparto principal → `../data/actors.json`, con los ids ya resueltos en `posters.json`. |
| `build_runtime.js` | Duración en minutos → `../data/runtime.json`. |
| `build_synopsis.js` | Sinopsis en castellano → `../data/synopsis.json`. |
| `taste_profile.py` | Perfil de gusto (pandas + scikit-learn, `random_state` fijo) → `../data/taste_profile.json`. |
| `build_similar.py` | Recomendador por contenido → `../data/similar.json`. |
| `build_similar_ajustado.py` | Recomendador ajustado por el perfil de gusto → `../data/similar_ajustado.json`. |
| `requirements.txt` | Versiones exactas de Python para la sincronización (las mismas que local). |

Para correrlos a mano (ej. para ver algo nuevo ya, sin esperar): los cuatro
`.js` con `node`, después los tres `.py` con `py` (en Windows `python` abre la
Microsoft Store). O en GitHub: Actions → "Sincronizar datos de películas" →
Run workflow.

## Herramientas (a mano, cuando hagan falta)

| Archivo | Para qué |
|---|---|
| `check_datos.js` | Cruza el catálogo contra TMDB y marca año/director sospechosos (pósters mal matcheados). Solo reporta, en `check_datos.txt`. |
| `export_docs_pdf.js` | Exporta los docs del curso (`../docs/*.md`) a PDF con Chrome headless. |
| `set_mis9.js` | Fija "Mis 9 películas" del dueño en `../data/mis9.json` desde el link de la placa. |
| `kpis_operacion.js` | Volumen de registros vía bot, para `../docs/kpis-operacion.md`. Solo imprime. |
| `build_ng_snapshot.js` | Refresca la instantánea offline del catálogo que usa el sitio si la hoja no responde (`../app/public/data/catalog-snapshot.json`). |

## Configuración

| Archivo | Qué es |
|---|---|
| `CONFIG.md` | Dónde vive cada secreto. |
| `tmdb.key` | Token de lectura de TMDB para correr los scripts local. Ignorado por git. |

Los scripts de arreglos puntuales (`fix_posters.js`, `rematch_posters.js`,
`rematch_posters2.js`) y el del sitio viejo (`build_site.js`) ya cumplieron:
sus correcciones quedaron guardadas en `posters.json` (la sincronización no
las pisa, solo agrega lo nuevo). También los que armaron el catálogo inicial
(`build_2026.js`, `build_catalogo.js`, `peliculas_import.csv`,
`pelis_2026.csv`). Todos siguen en el historial de git.

## Esquema de la tabla `catalogo_completo`

`id · numero · titulo · director · anio_estreno · pais_origen · fecha_vista · anio_visto · es_revisionado · estado_enriquecimiento · fuente · genero · animo · sinopsis · poster_url · rating_externo · notas_ia`

`estado_enriquecimiento`: `Migrada` / `Aprobada` (históricos) · `Enriquecida IA` (bot) · `Aprobada` (HITL).
`fuente`: `CSV historico` · `Bot Telegram`.

Columnas `R` (`revisionado`) y `S` (`numero_orden`) en la hoja son fórmulas —
no están en el CSV porque Make solo escribe A–Q.
