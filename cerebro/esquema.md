# Cerebro — Base de datos del Bot de Películas

Base en **Airtable**. Una sola tabla principal (`Peliculas`) + dos tablas de apoyo.
El campo de estado es el que permite el flujo autónomo con HITL (Módulo 7 y 8).

---

## Tabla `Peliculas`

| Campo | Tipo Airtable | Origen | Notas |
|---|---|---|---|
| `id` | Single line text (primary) | CSV | `P0001-1`; el sufijo distingue revisionados |
| `numero` | Number | CSV | Orden histórico de visionado |
| `titulo` | Single line text | CSV | |
| `director` | Single line text | CSV / IA | vacío en 26 filas → IA lo completa |
| `anio_estreno` | Number | CSV / IA | vacío en 25 filas |
| `pais_origen` | Single line text | CSV / IA | vacío en 181 filas |
| `fecha_vista` | Date | CSV | |
| `anio_visto` | Number (o Formula sobre `fecha_vista`) | CSV | para el dashboard |
| `es_revisionado` | Checkbox | derivado | `Si` si el título aparece más de una vez |
| `genero` | Multiple select | IA | acción, terror, drama… |
| `animo` | Multiple select | IA | "tensa", "feel-good", "lenta"… → para recomendar |
| `sinopsis` | Long text | IA / TMDB | |
| `poster_url` | URL | TMDB | para la web |
| `rating_externo` | Number | TMDB | 0–10 |
| `estado_enriquecimiento` | Single select | flujo | `Pendiente` · `Enriquecida IA` · `Aprobada` · `Rechazada` |
| `notas_ia` | Long text | flujo | lo que la IA propuso, para revisar en el HITL |
| `fuente` | Single select | flujo | `CSV historico` · `Bot WhatsApp` · `Bot Telegram` |
| `creado_en` | Created time | Airtable | |

### Ciclo de estado (semáforo HITL)

```
Bot recibe "vi X"  ->  estado = Pendiente
   IA completa director/anio/pais/genero/animo/sinopsis
                   ->  estado = Enriquecida IA   (+ notas_ia)
   Vos confirmás en Slack/Airtable (Aprobar / Editar / Rechazar)
                   ->  estado = Aprobada   (entra al catálogo y al dashboard)
```

Las 1.094 filas ya completas entran como `Aprobada` (fuente `CSV historico`).
Las 181 incompletas entran como `Pendiente` y las procesa el flujo Batch (PE6).

---

## Tabla `Directores` (apoyo, opcional)

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | Single line text (primary) | |
| `peliculas` | Link to `Peliculas` | cuántas viste de cada uno |
| `seguir` | Checkbox | si está tildado, el bot te avisa de estrenos suyos (PE5) |

## Tabla `Recomendaciones` (apoyo)

| Campo | Tipo | Notas |
|---|---|---|
| `fecha` | Date | |
| `pedido` | Single line text | "thriller argentino que no haya visto" |
| `sugeridas` | Link to `Peliculas` | qué recomendó el bot |
| `resultado` | Single select | `Vista` · `Descartada` · `Pendiente` |

---

## Modelo JSON de una película (para PE2)

Objeto con un **array anidado** (`generos`) — cumple el requisito de la Pre-Entrega 2.

```json
{
  "id": "P0198-1",
  "titulo": "MaXXXine",
  "director": "Ti West",
  "anio_estreno": 2024,
  "pais_origen": "USA",
  "visionado": {
    "fecha_vista": "2026-09-01",
    "anio_visto": 2026,
    "es_revisionado": false
  },
  "enriquecimiento_ia": {
    "generos": ["terror", "slasher", "thriller"],
    "animo": ["tensa", "estilizada"],
    "sinopsis": "En 1985, una actriz de Hollywood con un pasado oscuro...",
    "rating_externo": 6.6,
    "poster_url": "https://image.tmdb.org/t/p/w500/xxxx.jpg"
  },
  "estado_enriquecimiento": "Enriquecida IA",
  "fuente": "CSV historico"
}
```

---

## Archivos

- `peliculas_import.csv` — 1.275 filas listas para importar a Airtable (CSV → Create table).
- Tras importar: cambiar `estado_enriquecimiento` de tipo texto a **Single select** y `genero`/`animo` a **Multiple select**.
