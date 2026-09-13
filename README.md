# Diario de proyección

Un registro personal de películas — ~1.280 vistas desde enero de 2018 — que se
mantiene solo: le mandás el nombre de una película a un bot de Telegram, una IA
le completa director, año, país y género, y la fila se agrega a una hoja de
Google. Un sitio web lee esa hoja en vivo y muestra el catálogo y sus
estadísticas.

**Sitio:** https://arturogrottoli.github.io/IA-Automation-Movies/

Proyecto integrador del curso **IA Automation** (Coderhouse). Toca las tres capas
del stack: datos, orquestación e inteligencia.

## Estado

**Funcional de punta a punta.** El circuito Telegram → IA → Google Sheets → web
anda solo: agregás una película por chat y aparece en el sitio sin tocar nada más.

### Hecho
- [x] **Registro por chat.** "vi Whiplash" → IA completa la ficha → fila en la hoja.
- [x] **Sitio + estadísticas** en vivo (5 gráficos + índice paginado).
- [x] **Consultas al bot.** "¿qué vi de Cronenberg?" → responde leyendo la hoja.
- [x] **Recomendaciones.** "recomendame un thriller" → sugiere pelis no vistas.
- [x] **Pósters, ratings y géneros (TMDB).** Grilla de tarjetas + gráfico y
      filtro por género + columna de rating.
- [x] **Lista "quiero ver".** "quiero ver X" → pestaña `por_ver` + sección en el
      sitio; al registrarla como vista sale sola de la lista.
- [x] **Human-in-the-loop.** "vi X" → el bot muestra la ficha con botones
      **✅ Sí / ❌ No**; recién guarda (como `Aprobada`) cuando tocás ✅.
- [x] Limpieza de `cerebro/` y del repo.

### Pendiente — funcionalidad
- [x] **HITL: el botón ❌.** Router → `editMessageText` ("❌ Descartada") →
      `answerCallbackQuery`. Ya no guarda nada en la hoja e incluye el mensaje
      de recuperación ("si fue sin querer, mandala de nuevo").
- [ ] **Aviso de título homónimo.** Al registrar "X" que ya existe en el catálogo
      con otro director/año, que el bot avise: "ya tenés *X* (De Palma, 1976); esta
      es de Kimberly Peirce, 2013 — ¿la agrego igual?". Evita falsos duplicados y
      marca cuándo es una revisión de verdad.
- [x] **Título ambiguo (ej. "cape fear"), con botones.** Cuando el título tiene
      más de una película conocida (remake, versión vieja), el bot pregunta
      cuál es con 2 botones antes de proponer la ficha. Probado en vivo,
      punta a punta (elegís opción → ficha final → ✅ → guardada).
      Cómo quedó armado, por si hay que tocarlo:
      - Módulo 6 (Gemini): schema `ambiguo`/`opcion1`/`opcion2`.
      - Router 7, ruta "1st Registrar": `intent = registrar` AND `ambiguo`
        not equal `true` (para no disparar el mensaje normal si es ambigua).
      - Router 7, ruta "Ambiguo" (`intent = registrar` AND `ambiguo = true`):
        Telegram Bot (Make an API Call, sendMessage) con 2 botones (1️⃣/2️⃣),
        `callback_data` = `"amb:" + opción completa` (título/año/director en
        el mismo string, no un código corto — así no hace falta guardar
        estado entre mensajes).
      - Router 18, ruta "Ambiguo elegido" (`Callback Query: Data` starts with
        `amb`) → Text parser (sin uso real, quedó de un diseño anterior) →
        Gemini nuevo (módulo 31, schema de 5 campos) que arma la ficha
        completa recibiendo directo `{{2.callbackQuery.data}}` como mensaje
        (a Gemini no le cuesta nada ignorar el prefijo "amb:") → Telegram Bot
        con el mensaje final ✅/❌, con el mismo formato y `callback_data`
        ("ok"/"no") que el registro normal — así cae solo en las rutas
        "Aprobado"/"Rechazado" que ya existían, sin duplicar esa parte.
      - Bug de plataforma encontrado en el camino: el buscador de campos de un
        módulo de IA no muestra los campos nuevos del schema hasta que el
        módulo corre al menos una vez con datos reales — se resuelve con
        "Run this module only" escribiendo un mensaje a mano en el input.
- [ ] **Sacar el módulo temporal** `Make an API Call` (#21, el del `setWebhook`)
      del escenario de Make — ya cumplió.
- [x] **Que las consultas vean la lista "quiero ver".** HTTP nuevo (33) baja
      `por_ver`, y el Gemini de consultas ahora recibe las dos listas (vistas
      + pendientes) y sabe distinguirlas. Probado con "qué tengo pendiente
      por ver".
- [ ] **Sacar pelis de la lista por bot.** Hoy: borrar la fila en la pestaña
      `por_ver` a mano. Automático = intent `descartar` + Search/Delete Row en Make.
- [ ] **Pósters de la watchlist automáticos.** Hoy `build_posters.js` los trae al
      re-correrlo; sumar un paso de TMDB a la rama `agendar` de Make.
- [ ] **Similitud por embeddings.** "pelis parecidas a X", "director parecido a otro".
- [x] Los 9 títulos que TMDB no tiene — todos con imagen a mano en `img/`.

### Pendiente — para cerrar el curso
- [x] **Mapa de arquitectura** → [docs/arquitectura.md](docs/arquitectura.md) (falta exportar a PDF).
- [x] **Manual de datos** → [docs/manual-de-datos.md](docs/manual-de-datos.md).
- [x] **Optimización de costos** → [docs/costos.md](docs/costos.md).
- [ ] **Error Handler en Make** (si Gemini falla, hoy se pierde la fila).
- [ ] **Panel de KPIs de operación** (tasa de aprobación, volumen, errores — máx 4).
- [ ] **Video demo de 3 min.**

### Deuda técnica menor
- [ ] **Fechas de visionado (`fecha_vista`) con el año corrido — a mitad de camino.**
      Mapeados los 8 bloques exactos (todos con el mismo patrón: le sobra un
      año) + 4 typos sueltos que no siguen el patrón:
      `G2:G119`→2018 · `G243:G266`→2019 · `G346:G413`→2020 · `G420:G561`→2021 ·
      `G639:G674`→2022 · `G753:G781`→2023 · `G892:G907`→2024 · `G908:G1078`→2025.
      Sueltos: `G267`→`2020-01-01` · `G675`→`2022-12-08` · `G676`→`2022-12-09` ·
      `G677`→`2022-12-10`.
      Buscar y reemplazar NO sirve (la columna es de tipo Fecha, no texto).
      En su lugar: **la columna R de la hoja ya tiene la fórmula armada y
      confirmada** (R2:R1287, calcula la fecha corregida de cada fila). Falta
      el último paso: copiar R2:R1287 → pegado especial (solo valores) sobre
      G2:G1287 → borrar el contenido de R. La fórmula (para si hay que
      rehacerla, ojo que la hoja usa `;` como separador, no `,`):
      ```
      =IF(ROW()=267;DATE(2020;1;1);IF(ROW()=675;DATE(2022;12;8);IF(ROW()=676;DATE(2022;12;9);IF(ROW()=677;DATE(2022;12;10);IF(OR(AND(ROW()>=2;ROW()<=119);AND(ROW()>=243;ROW()<=266);AND(ROW()>=346;ROW()<=413);AND(ROW()>=420;ROW()<=561);AND(ROW()>=639;ROW()<=674);AND(ROW()>=753;ROW()<=781);AND(ROW()>=892;ROW()<=907);AND(ROW()>=908;ROW()<=1078));DATE(YEAR(G2)-1;MONTH(G2);DAY(G2));G2)))))
      ```
      Una vez pegado sobre G, `anio_visto` ya va a coincidir solo — no hace
      falta recalcularlo aparte.
- [x] **Celdas con año/director mal** (de `cerebro/check_datos.js`, verificadas).
      `D713` `E733` `E509` `E551` `E342` `E1000` `D942`/`E942` `E659` `E674` `E1064`.
- [x] **`por_ver`:** Amarga Navidad y Charly días de sangre, ya completas.
- [ ] **`por_ver` tiene 3 pelis ya vistas** (se detectaron preguntándole al bot,
      con la consulta que ahora lee las 2 listas): filas 4 (Rear Window), 5
      (The Other) y 6 (Bob & Carol & Ted & Alice) — borrar esas filas.
- [ ] **2 typos de país** en `catalogo_completo`: `F794` (Parasite)
      `Corea del Suer` → `Corea del Sur` · `F716` (Enter the Dragon)
      `Honk Kong` → `Hong Kong`.
- [ ] `posters.json` matcheó mal más pelis (remakes/homónimos) — 20 se corrigieron
      solas (`cerebro/rematch_posters.js`, elige por director en vez de por
      popularidad). Quedan más sueltas; se van encontrando con `check_datos.js`.
- [ ] Recalcular `anio_visto` = año de `fecha_vista` una vez arregladas las fechas.
- [ ] **`gemini-3.1-flash-lite` se discontinúa el 7/5/2027.** Migrar todos los
      módulos "Google Gemini AI" de Make a un modelo vigente antes de esa fecha.
- [ ] Evaluar migrar el sitio a un framework (React / Next / Astro). Hoy es HTML
      plano sin dependencias — funciona bien; tendría sentido si crece mucho o
      como pieza de portfolio que demuestre ese stack.

## Cómo funciona

```mermaid
flowchart LR
    T[Telegram] --> G1[Gemini<br/>¿registrar o consultar?]
    G1 --> R{Router}
    R -->|registrar| G2[Gemini completa la ficha] --> S[(Google Sheets)]
    R -->|consultar| H[lee el catálogo] --> G3[Gemini responde] --> T
    S --> W[index.html<br/>catálogo + stats]
    S -.->|confirmación| T
```

| Capa | Herramienta | Rol |
|---|---|---|
| **Cerebro** | Google Sheets | El catálogo. Una tabla, 17 columnas. |
| **Corazón** | Make | Clasifica el mensaje, bifurca, llama a la IA, escribe o responde. |
| **Inteligencia** | Google Gemini | Clasifica intención · del título saca la ficha · responde consultas con el catálogo como contexto. |
| **Voz** | Telegram + `index.html` | Entrada y consultas por chat; catálogo y stats por web. |

El sitio es un solo archivo, sin dependencias ni build. Lee el CSV publicado de la
hoja; si no hay conexión, cae a una instantánea embebida.

El bot distingue tres cosas por el texto del mensaje:
- **"vi X"** → registra la película.
- **"¿qué vi de X?"** → responde con lo que hay en el catálogo.
- **"recomendame algo de X"** → sugiere películas fuera del catálogo.

## Estructura

```
index.html            el sitio (5 gráficos + índice: lista o grilla de pósters)
posters.json          póster, rating y género por película (de TMDB)
posters-manual.json   los ~8 que TMDB no tiene (imágenes en img/)
docs/                 entregables del curso — arquitectura, datos, costos
cerebro/
  catalogo_completo.csv   copia portable de las ~1.280 películas
  build_site.js           refresca la instantánea embebida de index.html
  build_posters.js        regenera posters.json desde TMDB (token en tmdb.key)
  CONFIG.md               dónde vive cada secreto (todos en Make, ninguno acá)
  README.md               notas sobre los datos
```

## Datos en vivo

1. En la hoja: *Archivo → Compartir → Publicar en la Web → pestaña
   `catalogo_completo` → CSV*.
2. Pegar esa URL en `SHEET_CSV_URL`, arriba del `<script>` de `index.html`.

Sin eso, el sitio funciona igual con la instantánea (`node cerebro/build_site.js`
la actualiza).
