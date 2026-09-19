# Mapa de arquitectura

Proyecto **Diario de proyección** — ecosistema autónomo de punta a punta para
registrar y consultar un catálogo personal de películas.

## Las tres capas

| Capa | Qué es | Herramienta |
|---|---|---|
| **Cerebro** — los datos | Dos tablas: `catalogo_completo` (~1.290 filas, una por visionado) y `por_ver` (watchlist, ~60 filas). Fuente de verdad única. | Google Sheets |
| **Corazón** — la lógica | Dos escenarios de Make. "Telegram Bot, Google Sheets": escucha el chat, clasifica la intención, llama a la IA, y según el caso escribe/lee una fila o responde. "Integration Webhooks": recibe pedidos del sitio (agregar/quitar de `por_ver`) por un webhook propio. | Make + Google Gemini |
| **Voz** — entrada y salida | El chat para registrar, agendar y preguntar; la web para explorar el catálogo, ver estadísticas y manejar la lista "Quiero ver". | Telegram + sitio estático (GitHub Pages) |

## Diagrama de flujo

```mermaid
flowchart TD
    U([Usuario en Telegram]) -->|mensaje| WU[Telegram · Watch Updates]
    WU -->|filtro: no empieza con /| G1

    subgraph CORAZON [Corazón · Make — escenario "Telegram Bot, Google Sheets"]
      G1[Gemini · Extract structured data<br/>clasifica intención + extrae ficha<br/>marca si el título es ambiguo]
      G1 --> R{Router}
      R -->|registrar, no ambiguo| HITL[Telegram · ficha + botones ✅/❌]
      R -->|registrar, ambiguo| AMB[Telegram · 2 botones a elegir]
      AMB -->|elige opción| G3[Gemini · arma la ficha final] --> HITL
      HITL -->|✅| ADD[Google Sheets · Add a Row]
      HITL -->|❌| DESC[Telegram · avisa descartada<br/>no escribe nada]
      R -->|agendar| ADDPV[Google Sheets · Add a Row en por_ver]
      R -->|consultar| HTTP[HTTP · GET catalogo + por_ver]
      HTTP --> G2[Gemini · Generate a response<br/>responde con ambas listas como contexto]
    end

    subgraph WEBHOOKS [Corazón · Make — escenario "Integration Webhooks"]
      WH[Custom Webhook] --> R2{Router por accion}
      R2 -->|agregar| G4[Gemini · Extract structured data<br/>completa director/año/país/género] --> ADD2[Google Sheets · Add a Row en por_ver]
      R2 -->|quitar| SR[Google Sheets · Search Rows] --> DEL[Google Sheets · Delete a Row]
    end

    ADD --> S[(Google Sheets<br/>catalogo_completo)]
    ADDPV --> PV[(Google Sheets<br/>por_ver)]
    ADD2 --> PV
    DEL --> PV
    ADD --> C1[Telegram · confirmación]
    G2 --> C2[Telegram · respuesta]

    S -->|CSV publicado| WEB[index.html · GitHub Pages]
    PV -->|CSV publicado| WEB
    TMDB[(TMDB API)] -.->|posters/actors/runtime/synopsis/similar.json, offline| WEB
    WEB -->|fetch al agregar/quitar de Quiero ver| WH

    C1 --> U
    C2 --> U
    DESC --> U
    WEB --> U2([Usuario / visitantes en la web])

    style CORAZON fill:#1a1a1a,stroke:#e6a94a,color:#ece6da
    style WEBHOOKS fill:#1a1a1a,stroke:#e6a94a,color:#ece6da
```

## Los caminos

### 1. Registrar una película (con HITL, con desambiguación)
```
"vi Whiplash"
  → Watch Updates capta el mensaje
  → filtro descarta comandos (/start…) · Router: solo mensajes de texto van a Gemini
  → Gemini clasifica: intent = registrar; extrae titulo_corregido, director,
    anio_estreno, pais_origen, genero; marca ambiguo = true/false

  → si ambiguo = true (ej. "vi cape fear"): Telegram manda 2 botones
    (la original de 1962 / el remake de 1991) → al elegir, un segundo
    llamado a Gemini arma la ficha completa sobre esa opción

  → Router → ficha lista → Telegram: manda la ficha con botones [✅ Sí] [❌ No]

  (el usuario toca ✅)
  → Watch Updates capta el callback_query · Router → rama "Aprobado"
  → Add a Row en catalogo_completo (fórmulas por-fila para id, numero,
    es_revisionado; fecha_vista = hoy; fuente = Bot Telegram;
    estado_enriquecimiento = Aprobada)
  → Telegram: "✅ Guardada: Whiplash"

  (el usuario toca ❌)
  → Router → rama "Rechazado": no escribe nada
  → Telegram: avisa que se descartó, invita a reintentar si fue sin querer
```

### 2. Agendar ("quiero ver")
```
"quiero ver Perfect Blue"
  → Gemini clasifica: intent = agendar; extrae titulo/director/anio/pais
  → Router → rama "agendar" → Add a Row en por_ver (sin paso de HITL)
```

### 3. Consultar / recomendar
```
"¿qué vi de Cronenberg?"  ·  "¿qué tengo pendiente por ver?"  ·  "recomendame un thriller"
  → Gemini clasifica: intent = consultar; consulta = pregunta reformulada
  → Router → rama "consultar"
  → HTTP GET al CSV publicado de catalogo_completo + HTTP GET a por_ver
  → Gemini responde con ambas listas como contexto, distinguiendo vistas
    de pendientes (para recomendaciones: sugiere títulos que NO están en
    ninguna de las dos)
  → Telegram: la respuesta
```

### 4. Agregar/quitar de "Quiero ver" desde el sitio
```
Click en "+ Agregar película" (sitio) → POST al Custom Webhook con el título
  → Router por accion = "agregar" → Gemini completa director/año/país/género
    a partir del título libre (mismo patrón que el bot) → Add a Row en por_ver

Click en la X de una card / "Quitar de la lista" en el modal → POST con accion = "quitar"
  → Search Rows (título + año) → Delete a Row en por_ver
```

## El sitio

`index.html` es un solo archivo, sin build ni dependencias. Al cargar:

1. `fetch` al CSV publicado de `catalogo_completo` y de `por_ver` → datos en
   vivo (cae a una instantánea embebida del catálogo si no hay conexión).
2. `fetch` a `posters.json` + `posters-manual.json` + `actors.json` +
   `runtime.json` + `synopsis.json` + `similar.json` → póster, rating,
   género, reparto, duración, sinopsis y películas parecidas por título
   (todo de TMDB, generado offline; los que TMDB no tiene o matchea mal se
   cargan a mano en `img/` + `posters-manual.json`).
3. Renderiza: tiles de stats, gráficos SVG (sin librería), placas temáticas
   (incluida una de data cleaning, "Detrás de los datos"), índice completo
   en vista lista o grilla, sección "Quiero ver" paginada (con alta/baja
   propia) y un modal de detalle por película (sinopsis, reparto, parecidas).

Cada `git push` a `main` redeploya GitHub Pages solo.

## Componentes y dónde vive cada cosa

| Componente | Ubicación | Notas |
|---|---|---|
| Bot | @ListadoPelisBot (Telegram) | creado con BotFather |
| Orquestación (bot) | Make · escenario "Telegram Bot, Google Sheets" | 1 trigger, router de intención, ramas registrar/agendar/consultar |
| Orquestación (sitio) | Make · escenario "Integration Webhooks" | 1 Custom Webhook, router por `accion` (agregar/quitar) |
| IA | Google Gemini (`gemini-3.1-flash-lite`) | varias llamadas: clasificar/extraer, desambiguar, responder, completar título libre del sitio |
| Base de datos | Google Sheet · pestañas `catalogo_completo` y `por_ver` | publicadas como CSV para lectura |
| Datos enriquecidos | `posters.json`, `actors.json`, `runtime.json`, `synopsis.json`, `similar.json` (TMDB) + `posters-manual.json` + `img/` | generados por scripts en `cerebro/`, ver [manual-de-datos.md](manual-de-datos.md) |
| Sitio | `index.html` en GitHub Pages | `arturogrottoli.github.io/IA-Automation-Movies` |
| Secretos | conexiones de Make (token de Telegram, key de Gemini) · `cerebro/tmdb.key` (local, ignorado) | nada de esto en el repo |

## Requisitos del proyecto integrador

| Requisito | Cómo se cumple |
|---|---|
| **Autónomo** | El circuito Telegram → IA → Sheets → web corre solo, sin intervención. |
| **Resiliente** | *Pendiente:* falta Error Handler en Make (si Gemini devuelve 503, hoy se pierde la fila). |
| **Con HITL** | ✅ "vi X" → el bot propone la ficha con botones ✅/❌; recién escribe (como `Aprobada`) al tocar ✅. La rama del ❌ no guarda nada y avisa que se descartó. |
| **Limpio** | Una sola fuente de verdad (la hoja); filtro anti-comando; secretos fuera del repo. |
