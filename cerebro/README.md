# cerebro/ — datos del catálogo

Todo lo que arma y mantiene el catálogo de películas.

## El pipeline

```
pelis_consolidado (histórico crudo, ya migrado)
        │
        ├── peliculas_import.csv     históricos 2018–2025 (una fila por visionado)
        └── pelis_2026.csv           las 203 de 2026, completadas y verificadas a mano
                    │
      build_catalogo.js  ──►  catalogo_completo.csv   (1.280 filas, 17 columnas)
                    │
             (import a Google Sheets, pestaña `catalogo_completo`)
                    │
        ┌───────────┴───────────┐
   bot de Telegram          index.html (el sitio)
   agrega filas nuevas      lee la hoja publicada en vivo;
   vía Make + Gemini        build_site.js refresca la instantánea de respaldo
```

## Archivos

| Archivo | Qué es |
|---|---|
| `peliculas_import.csv` | Históricos 2018–2025 migrados. Fuente, no se edita a mano. |
| `pelis_2026.csv` | Las 203 películas de 2026 con director/año/país verificados. Columnas extra: `visto_antes`, `revision_2026`. |
| `catalogo_completo.csv` | Unión de los dos + columnas que llena la IA (`genero`, `sinopsis`, …) vacías. Lo que se importa a Sheets. |
| `build_2026.js` | Genera `pelis_2026.csv` (incluye todas las decisiones de identificación de títulos). |
| `build_catalogo.js` | Une histórico + 2026 → `catalogo_completo.csv`. |
| `build_site.js` | Refresca la instantánea embebida en `../index.html`. |
| `CONFIG.md` | Dónde vive cada secreto (spoiler: todos en Make, ninguno en el repo). |
| `Pelis_backup_*.xlsx` | Backup de la planilla antes de tocarla. Ignorado por git. |

## Esquema de la tabla `catalogo_completo`

`id · numero · titulo · director · anio_estreno · pais_origen · fecha_vista · anio_visto · es_revisionado · estado_enriquecimiento · fuente · genero · animo · sinopsis · poster_url · rating_externo · notas_ia`

`estado_enriquecimiento`: `Migrada` / `Aprobada` (históricos) · `Enriquecida IA` (las que agrega el bot).
`fuente`: `CSV historico` · `Bot Telegram`.

Columnas `R` (`revisionado`) y `S` (`numero_orden`) en la hoja son fórmulas —
no están en el CSV porque Make solo escribe A–Q.
