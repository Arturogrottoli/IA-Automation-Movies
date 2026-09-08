# Optimización de costos

## Costo actual: **USD 0 / mes**

| Servicio | Plan | Límite | Uso real del proyecto |
|---|---|---|---|
| Telegram Bot API | gratis | sin límite práctico | unos mensajes por día |
| Make | Free | 1.000 operaciones/mes | ~3-4 ops por registro, ~4 por consulta → margen enorme |
| Google Gemini API | Free tier | ~15 req/min, cuota diaria amplia | 1-2 llamadas por mensaje |
| Google Sheets | gratis | 10M celdas | ~22.000 celdas |
| TMDB API | gratis | límite altísimo | solo en backfills manuales |
| GitHub Pages | gratis | 100 GB/mes de tráfico | trivial |
| **Total** | | | **USD 0** |

## Estrategia por tarea

El principio: **modelo económico para lo mecánico, modelo capaz para el
razonamiento, procesamiento por lotes para el volumen no urgente.**

| Tarea | Naturaleza | Elección | Por qué |
|---|---|---|---|
| Clasificar intención + extraer ficha | Mecánico, repetitivo, alto volumen potencial | **Gemini Flash** (gratis) | Tarea acotada con esquema fijo; un modelo chico la resuelve igual de bien. |
| Responder consultas / recomendar | Razonamiento sobre ~1.280 filas de contexto | **Gemini Flash** con ventana larga | Alcanza para listar y recomendar. Si se quisiera más matiz: Gemini Pro o Claude, pagando por uso. |
| Backfill de 1.156 pósters | Volumen alto, **no urgente**, una sola vez | **Script local + TMDB**, NO Make | 1.156 llamadas por Make = más que el límite mensual entero. Un script en la máquina lo hace en 2 min, gratis. |
| Backfill de embeddings (si se hace) | Volumen alto, no urgente | **Lote** (Batch API) o script local | Nunca en el flujo en tiempo real. |

## Qué NO hacer

- **No** mandar los backfills por Make. Un backfill de 1.000+ ítems agota el plan
  Free en una sola corrida. Los backfills van por script local.
- **No** llamar a la IA para lo que resuelve una fórmula. `id`, `numero` y
  `es_revisionado` se calculan con `COUNTIF` en la hoja, no con Gemini.
- **No** leer el catálogo entero desde la IA en cada consulta si el volumen
  creciera mucho. Hoy ~1.280 filas entran holgadas en contexto; si llegara a
  decenas de miles, convendría filtrar antes (por director, género) y pasar solo
  el subconjunto.

## Si el proyecto escalara

| Disparador | Qué cambiar |
|---|---|
| > 1.000 ops/mes en Make | Plan Core de Make (~USD 9/mes, 10.000 ops) o migrar la orquestación a n8n self-hosted (~USD 5-10/mes de VPS). |
| Se supera la cuota gratis de Gemini | Pago por uso de Gemini Flash: fracciones de centavo por mensaje. |
| Consultas con mucho más volumen de catálogo | Embeddings + búsqueda por similitud en el navegador → se le pasa a la IA solo el top-k, no todo. |
| Se quiere calidad de razonamiento superior | Solo la rama de consultas a un modelo mayor (Gemini Pro / Claude); la de registro sigue en Flash. |
