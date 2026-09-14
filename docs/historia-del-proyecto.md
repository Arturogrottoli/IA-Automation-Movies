# Diario de proyección — la historia del proyecto

Este documento cuenta cómo se construyó el proyecto de punta a punta: por qué,
en qué orden, qué decisiones se tomaron y por qué, qué se rompió en el camino,
y qué queda. Es el complemento narrativo de los otros docs (`arquitectura.md`,
`manual-de-datos.md`, `costos.md`), que describen el sistema *terminado*; este
describe cómo se llegó ahí.

## El origen

El proyecto nace como trabajo integrador del curso **IA Automation** de
Coderhouse, con una restricción de diseño desde el día uno: usar las
herramientas que enseña el curso (Make, Google Sheets, Google Gemini,
Telegram) sobre un problema real, no un caso de ejemplo. El problema real
elegido fue un registro personal de películas vistas — un historial en Excel
armado a mano desde enero de 2018, con más de 1.280 filas para cuando arrancó
el proyecto.

La pregunta que arrancó todo: *¿le puedo mandar el nombre de una película a un
bot y que la agregue sola a un listado, y después poder consultarlo o verlo en
una web?*

## Fase 1 — Los datos, antes que nada

Antes de tocar Make o Telegram, había que resolver el "Cerebro": dónde vive el
catálogo. Se evaluó **Airtable** primero y se descartó rápido — su plan
gratuito tiene un techo de 1.000 filas, y el catálogo ya superaba esa cifra.
**Google Sheets** ganó por eliminación: sin techo de filas, integración nativa
con Make, y ya lo usa medio curso.

En paralelo, se completó a mano (con ayuda de IA para buscar director/año/país
de cada título) una lista de 203 películas vistas en 2026 que todavía no
estaba en el historial, y se migró todo — ~1.280 filas — a una única hoja,
`catalogo_completo`, con una fila por *visionado* (si una película se vio 3
veces, son 3 filas, a propósito, para no perder las revisiones).

## Fase 2 — El bot mínimo: registrar por chat

Primer circuito funcional: Telegram → Make → Gemini → Sheets.

1. Un trigger de Telegram ("Watch Updates") capta cada mensaje.
2. Un filtro descarta comandos (`/start`, etc.) para que solo lleguen mensajes
   de texto reales a la IA.
3. Gemini (acción "Extract structured data") clasifica la intención y, si es
   un registro, extrae título corregido, director, año, país y género en un
   solo llamado.
4. Un router separa por intención y, si es "registrar", escribe la fila en la
   hoja con **Add a Row**.

Encontrar esta primera versión funcionando fue el primer hito real: escribir
"vi Whiplash" por Telegram y verla aparecer en la hoja sin tocar nada más.

## Fase 3 — Consultas y recomendaciones

Segunda rama del mismo router: si la intención es "consultar" (`¿qué vi de
Cronenberg?`) o pedir una recomendación, un módulo HTTP baja el CSV publicado
de la hoja completa y se lo pasa a Gemini como contexto, con instrucciones
claras de no inventar títulos que no estén en el catálogo, y de sugerir *fuera*
del catálogo cuando se pide recomendación.

## Fase 4 — Human-in-the-loop (HITL)

El registro directo (sin confirmación) tenía un problema: si Gemini se
equivocaba de película, quedaba mal guardada sin que nadie lo notara. Se
agregó un paso de aprobación: en vez de guardar directo, el bot manda la ficha
propuesta con dos botones, **✅ Sí** / **❌ No**, y solo escribe en la hoja
cuando se toca ✅.

Esto trajo el primer bug de plataforma serio: los botones no respondían nada
al tocarlos. La causa, después de bastante investigación, fue que el webhook
de Telegram no estaba configurado para recibir eventos `callback_query` (el
tipo de update que genera tocar un botón inline) — solo mensajes de texto. Se
resolvió con un llamado manual a la API de Telegram (`setWebhook` con
`allowed_updates` incluyendo `callback_query`), ejecutado una sola vez desde
un módulo temporal de Make (borrado más adelante, una vez que cumplió).

La rama del ❌ quedó pendiente varias sesiones — hoy también está cerrada:
edita el mensaje a "❌ Descartada" con una línea de recuperación ("si fue sin
querer, mandala de nuevo") y no escribe nada en la hoja.

## Fase 5 — El sitio

En paralelo al bot, se construyó `index.html`: un sitio estático, un solo
archivo, sin build ni dependencias — decisión deliberada para que cualquiera
pueda abrirlo y entenderlo sin instalar nada. Lee el CSV publicado de la hoja
en vivo; si no hay conexión, cae a una instantánea de datos embebida en el
propio archivo.

Sobre esa base se fueron sumando, en este orden:
- Estadísticas: gráficos SVG hechos a mano (sin librería de charts) — por año,
  por década, por país, por género, directores más vistos y, más tarde,
  actores/actrices más vistos.
- Pósters, rating y género por película, backfillados desde **TMDB** (no
  vienen de la hoja) y cacheados en `posters.json`, generado por un script
  (`cerebro/build_posters.js`) que se corre a demanda, nunca desde Make (1.000+
  llamadas agotarían el plan gratuito de Make en una sola corrida).
- Índice completo, en vista lista o grilla de pósters, con filtros y
  paginado.
- Tema claro/oscuro con `prefers-color-scheme` y toggle manual.

## Fase 6 — "Quiero ver"

Se agregó una segunda pestaña en la hoja, `por_ver`, y la intención `agendar`
en el bot ("quiero ver X" → anota en esa lista en vez del catálogo de vistas).
El sitio lee ambas hojas y, en la sección "Quiero ver", esconde automáticamente
cualquier título que ya esté en el catálogo de vistas (aunque la fila en sí
sigue en `por_ver` hasta que alguien la borre a mano — ver "Qué falta").

## Fase 7 — La limpieza de datos, a fondo

Con el catálogo completo y el sitio andando, empezaron a aparecer errores
invisibles a simple vista en 1.280 filas cargadas a mano durante años. En vez
de revisar todo manualmente, se armó una metodología de verificación
automática contra TMDB (`cerebro/check_datos.js`): para cada película, cruzar
el director guardado contra el director real según TMDB (usando el id ya
resuelto en `posters.json`, no una búsqueda nueva), y marcar año o director
sospechoso.

La primera versión de este chequeo, comparando por título con una búsqueda
nueva cada vez, tiró ~159 falsos positivos (TMDB devuelve el resultado más
*popular*, no el más parecido — "Candyman" 1992 contra "Candyman" 2021, por
ejemplo). La segunda versión, cruzando por director en vez de por popularidad,
bajó el ruido a un puñado de casos reales por corrida.

De ahí salieron, en varias tandas:
- **604 fechas corregidas.** El hallazgo más grande: bloques enteros del
  historial (todo lo cargado bajo "2018", bajo "2021", bajo "2025") tenían el
  año de *visionado* (`anio_visto`) bien, pero la *fecha exacta*
  (`fecha_vista`) corrida un año — un típico error de tipeo por inercia al
  cambiar de año calendario. Se corrigió con una fórmula auxiliar en una
  columna temporal de la hoja y un pegado especial de valores sobre la
  columna real. En el camino, un pegado normal (no especial) rompió la
  columna entera con `#REF!` por una referencia circular — se deshizo con
  Ctrl+Z sin pérdida de datos.
- **39+ pósters recorregidos**, eligiendo por director en vez de por
  popularidad (`cerebro/rematch_posters.js`, dos tandas).
- **13 títulos duplicados por typos**, unificados (la misma película contada
  dos veces por una coma, una letra o un espacio de más — "Dragon Ball Z, la
  batalla de los dioses" vs "Dragon Ball Z la batalla de los dioses", "Battle
  Royal" vs "Battle royale", etc.).
- **65 directoras identificadas**, cruzando cada director del catálogo contra
  el campo de género de su ficha de persona en TMDB.

## Fase 8 — Funcionalidades avanzadas del bot

Con los datos ya confiables, se volvió al bot para dos casos que las primeras
versiones no contemplaban:

- **Título ambiguo** ("vi cape fear" — ¿la original de 1962 o el remake de
  Scorsese de 1991?). Gemini ahora marca cuándo un título tiene más de una
  película conocida y distinta, y en ese caso el bot pregunta con dos
  botones antes de proponer nada — recién arma la ficha completa (con un
  segundo llamado a Gemini) sobre la opción elegida, y de ahí sigue el mismo
  circuito de ✅/❌ de siempre.
- **Consultas que ven "quiero ver".** Al principio, "¿qué tengo pendiente?"
  respondía mal — el bot solo leía el catálogo de vistas. Se sumó un segundo
  HTTP que baja `por_ver` y se lo agrega al contexto de Gemini, con reglas
  explícitas para distinguir cuándo la pregunta es sobre lo visto y cuándo es
  sobre lo pendiente.

Construir el título ambiguo destapó un bug de la propia plataforma de Make: el
buscador de campos para mapear datos entre módulos no muestra los campos
*nuevos* de un schema de IA hasta que ese módulo corrió, al menos una vez, con
datos reales — ni reabrir el escenario ni guardar de nuevo lo resuelve. La
solución fue forzar una ejecución con "Run this module only", escribiendo un
mensaje de prueba a mano.

## Fase 9 — El ángulo de datos

Con el proyecto funcionando de punta a punta, surgió una pregunta de encuadre:
¿esto sirve solo para un portfolio de automatización, o también para uno de
datos? La respuesta honesta fue que, tal como estaba, solo para automatización
— los gráficos del sitio son conteos simples, sin análisis ni modelo. Pero el
trabajo de limpieza de la Fase 7 sí era trabajo de datos real, solo que
invisible (vivía en mensajes de commit, no en ningún lado que alguien fuera a
leer).

De ahí salió la **Placa V — "Detrás de los datos"**: una sección nueva en el
sitio que cuenta el caso de limpieza con números reales (los mismos 604 / 39 /
13 / 65 de la Fase 7) y explica la metodología. Es el primer paso de una
segunda mitad del proyecto pensada específicamente para el ángulo de datos —
ver "Qué falta" para lo que sigue ahí.

## Cómo funciona hoy, resumido

```
Telegram → Make (clasifica intención con Gemini) → Router
  → registrar (ambiguo)  → 2 botones → Gemini arma la ficha → ✅/❌ → Sheets
  → registrar (no ambiguo) → Gemini arma la ficha → ✅/❌ → Sheets
  → agendar   → Sheets (por_ver)
  → consultar → HTTP (catalogo + por_ver) → Gemini responde → Telegram

Sheets (catalogo_completo + por_ver, publicadas como CSV)
  → index.html (GitHub Pages): estadísticas, pósters (TMDB), índice, watchlist
```

Ver `docs/arquitectura.md` para el detalle módulo por módulo y
`docs/manual-de-datos.md` para el esquema completo de columnas.

## Qué falta

**Bot (Make)**
- Aviso de título homónimo — cuando el título ya existe en el catálogo con
  otro director/año (ej. registrar "Carrie" y ya tener la de 1976 y la de
  2013), que el bot avise antes de guardar. Distinto del título ambiguo: acá
  la película ya está identificada sin dudas, el aviso es sobre el catálogo,
  no sobre la IA.
- Sacar películas de `por_ver` por chat, y que se borren solas de ahí cuando
  se registran como vistas (hoy solo se "esconden" en el sitio; la fila sigue
  en la hoja).
- Pósters automáticos al agendar/registrar (hoy hace falta re-correr un
  script a mano).
- Error Handler en Make (si Gemini falla, hoy se pierde la fila sin aviso).

**Sitio**
- Agregar/quitar de "quiero ver" directo desde el sitio (sin pasar por
  Telegram) — con un webhook de Make o un Google Apps Script.
- Panel de KPIs operativos (tasa de aprobación, volumen, errores) — necesita
  que el bot empiece a loguear cada interacción en algún lado, hoy no queda
  rastro de los ❌.

**Datos (segunda mitad del proyecto)**
- **Perfil de gusto**: qué combinación de género/década/director predice que
  una película se vuelva a ver, usando las revisiones como señal (nadie
  vuelve a ver algo que no le gustó). Se calcularía offline en Python y se
  serviría como JSON, mismo patrón que `posters.json`.
- **Recomendador por similitud** ("películas parecidas a X"), ajustado con
  ese perfil de gusto, también calculado offline.
- Seguir cazando pósters sueltos mal matcheados — no es un trabajo que
  termine de una vez, aparecen de a poco.

**Mantenimiento**
- `gemini-3.1-flash-lite` (el modelo usado en todos los módulos de IA de
  Make) se discontinúa el 7 de mayo de 2027 — hay que migrar antes de esa
  fecha.
- Los tres docs técnicos (`arquitectura.md`, `manual-de-datos.md`,
  `costos.md`) describen el sistema como estaba hace un tiempo — les falta
  todo lo de las Fases 6 a 9. Están pendientes de actualizar.

## Lecciones que costó aprender

- **TMDB devuelve el resultado más popular, no el más parecido.** Buscar por
  título solo, sin cruzar por director, produce falsos positivos sistemáticos
  con remakes y homónimos.
- **Un chequeo automático contra una fuente externa también tiene falsos
  positivos propios** (nombres de directores en otro alfabeto leídos como
  "no coinciden" cuando en realidad son la misma persona transliterada
  distinto) — hay que triar antes de confiar en la lista cruda.
- **Make no siempre refresca la interfaz de un módulo de IA** cuando cambia
  su schema — hay que forzar una ejecución real con datos de verdad para que
  los campos nuevos aparezcan en los mapeos de otros módulos.
- **Pegado especial, siempre, para valores calculados con fórmula.** Un
  pegado normal sobre la misma columna que usa la fórmula como referencia
  produce una referencia circular silenciosa.
- **Encontrar el error de fechas fue más valioso que cualquier gráfico.**
  Ningún gráfico "por año" iba a significar nada mientras 604 de 1.280 filas
  tuvieran la fecha corrida un año — la limpieza de datos no es un paso
  previo al análisis, es el análisis.
