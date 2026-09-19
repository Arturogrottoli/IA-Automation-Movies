# Migración del sitio a Angular

> Progreso: **Fases 0, 1 y 2 hechas** (scaffolding + tema; capa de datos
> end-to-end; Placa IV completa — catálogo con filtros/orden/paginado/vistas).
> El resto de las fases sigue este documento en orden.

## Contexto

"Diario de proyección" es hoy un único `index.html` (sin build, sin dependencias JS) que lee CSVs publicados de Google Sheets + 6 archivos JSON generados offline desde TMDB (`cerebro/*.js`/`*.py`), y escribe únicamente vía un webhook de Make (alta/baja de la watchlist). El usuario quiere reescribirlo en Angular para sumarlo como pieza de portfolio, con **paridad de funcionalidad 1 a 1** (no una versión reducida), construido **en paralelo** en una carpeta nueva sin tocar el `index.html` que sigue sirviendo el sitio en vivo, hasta un corte deliberado al final.

No hay backend ni se va a agregar uno: todo sigue siendo estático, consumiendo los mismos CSV/JSON/webhook públicos directo desde el browser, desplegado en GitHub Pages (confirmado: hoy Pages sirve directo desde la rama `main`, raíz del repo — sin Actions, sin rama `gh-pages`).

## Enfoque recomendado

**Angular 20 (la versión más nueva compatible con el Node instalado — la última de todas pide Node ≥22.22.3), standalone components, signals (sin NgRx), `@if`/`@for` nativo, zoneless, `OnPush` en todo.** Es una app read-mostly (catálogo + watchlist derivados/filtrados, un solo camino de escritura fire-and-forget) — signals + `computed()` alcanza y sobra; NgRx sería ceremonia sin beneficio acá. Es además la forma más idiomática/actual de mostrar Angular en un portfolio.

### Ubicación del proyecto

Workspace en `app/` (raíz del repo, hermano de `cerebro/`, `index.html` y los JSON) — no adentro de `cerebro/`, no en otro repo. Así puede referenciar los JSON/CSV existentes sin reestructurar nada, y conviven sin fricción durante todo el desarrollo.

Scaffoldeado con:
```
npx @angular/cli@20.3.37 new app --directory=app --routing=false --style=css --ssr=false --zoneless --strict --skip-git --package-manager=npm --defaults
```

(`--routing=false`: no hay Router por ahora, ver más abajo. `--ssr=false`: sitio estático sin SEO real, SSR no aporta. `--skip-git`: vive dentro del repo principal, no es su propio repo.)

### Capa de datos

Unificar lo que hoy son 6 mapas sueltos + filas posicionales de CSV en un modelo de dominio:

- **`Movie`** — una entrada por título+año distinto: identidad (`titulo`, `director` canonicalizado, `anioEstreno`, `paisOrigen` canonicalizado, `key`), `watchDates[]` (todas las veces vista, porque la hoja es una fila por visionado), y enriquecimiento **opcional/nullable** (`poster`, `rating`, `genres`, `tmdbId`, `cast`, `runtimeMin`, `synopsis`, `similar`) — nullable porque la cobertura es ~95-99%, no 100% (hay claves huérfanas cuando se corrige un `anio_estreno` en la hoja, gotcha ya documentado en `docs/manual-de-datos.md`).
- **`WatchlistItem`** — tipo separado (no una superclase compartida con campos de visionado en null), porque el modal de detalle genuinamente bifurca en dos variantes (`{kind:'watched', movie} | {kind:'watchlist', item}`), calcando el `openModalAny` actual.
- **`SimilarStub`** — `{titulo, anioEstreno, director}`, se resuelve contra el catálogo por la misma clave normalizada; tolera misses.

Servicios:
- **`normalizeKey()`** — función pura única (reemplaza las 3 copias idénticas `posterKey`/`movieKey`/`rwKey` del original), junto con `canonPais`/`canonDir`/`decadeOf`/`tally` en un `catalog.util.ts`.
- **`CsvParserService`** — puerto TS del parser RFC4180 actual (no traer Papa Parse — coincide con el espíritu "cero dependencias" y es simple).
- **`EnrichmentService`** — fetch de los 6 JSON (`posters.json`, `posters-manual.json`, `actors.json`, `runtime.json`, `synopsis.json`, `similar.json`) y merge, **replicando exactamente** la semántica actual: `posters-manual` pisa la entrada **completa** (no merge por campo) y solo cuando `m.poster` es truthy. Compartido por los dos servicios de abajo para no duplicar el fetch/merge.
- **`CatalogDataService`** — fetch+parse del CSV de `catalogo_completo`, join con `EnrichmentService`, expone `movies = signal<Movie[]>([])`, `loading`, `live`, y `rewatchCounts = computed(...)`.
- **`WatchlistDataService`** — fetch del CSV de `por_ver`, mismo enriquecimiento, expone `watchlist = signal<WatchlistItem[]>([])`, y el camino de escritura (ver abajo).

**Snapshot embebido (fallback offline):** mantener el patrón actual ("pintar instantáneo con datos cacheados, reemplazar si el fetch en vivo funciona") — es mejor UX que un simple skeleton, porque si falla el CSV en vivo hoy el sitio sigue mostrando gráficos/KPIs con datos levemente viejos, no vacío. Nuevo script `cerebro/build_ng_snapshot.js` (no toca el `build_site.js` actual) que escribe `app/public/data/catalog-snapshot.json` en vez de parchear un literal dentro del HTML — más simple que el mecanismo actual.

### Componentes

Componentes "smart" (dueños de signals + servicios inyectados) por cada placa, componentes "dumb" reutilizables para lo que hoy está duplicado:

```
AppComponent (masthead + footer + shell)
├── VitalsStripComponent
├── PlacaChartsComponent (I)      → BarChartComponent ×6 (reutilizable, @Input data/orientation)
├── PlacaRewatchesComponent (II)
├── PlacaWatchlistComponent (III) → MovieCardComponent, PagerComponent, AddToWatchlistDialogComponent
├── PlacaCatalogComponent (IV)    → FilterBarComponent, CatalogTableComponent, MovieCardComponent, PagerComponent
├── PlacaCaseStudyComponent (V)   (mayormente prosa estática)
└── FooterComponent

Overlay (vía DialogService + Angular CDK Overlay, no anidado en el árbol de arriba):
├── MovieDetailDialogComponent (dos variantes por unión discriminada)
├── ConfirmDialogComponent (reusado para dar de baja de la watchlist)
└── AddToWatchlistDialogComponent
```

Piezas compartidas que valen la pena por sí solas (consolidan lo que hoy está copy-pasteado):
- **`DialogComponent`** primitivo (backdrop, Escape, focus trap) vía `@angular/cdk` — hoy son 3 implementaciones de modal separadas a mano.
- **`PagerComponent`** — un componente, `@Input pageSize` (25 para catálogo, 24 para watchlist), reemplaza las dos implementaciones casi idénticas.
- **`BarChartComponent`** — SVG a mano (no librería de gráficos — coincide con el espíritu del original y es mejor demo de Angular puro), tooltip vía `(pointermove)`/`(pointerleave)` en vez de `onmousemove` inline con strings escapados a mano (el patrón más frágil del original).
- **`MovieCardComponent`** — reusado en grilla de catálogo y de watchlist.

### Filtros/orden/paginado

Signals + `computed()` en cascada (`filters → filtered → sorted → paged`), sin store library. Cambiar un filtro es un `.set()`; todo lo derivado se recalcula solo. Reemplaza el "re-render completo a mano en cada mutación" del original.

### Camino de escritura (watchlist)

`WatchlistDataService.add()`/`.remove()`: mutación optimista del signal + POST fire-and-forget al mismo webhook (`{accion, titulo, director, anio_estreno, pais_origen}`), igual que hoy — **no cambiar este comportamiento sin avisar explícitamente**, es lo que pide el alcance 1:1. El `ConfirmDialogComponent` sigue gateando la llamada a `.remove()`, no la lógica del servicio.

### Theming

Cascada CSS exacta en `app/src/styles.css` (global, no por componente): `:root` (claro) → `@media(prefers-color-scheme:dark)` bajo `:root:not([data-theme="light"])` → `:root[data-theme="dark"]` (override explícito). Un `ThemeService` con signal + `effect()` para escribir el atributo `data-theme` y persistir en `localStorage`, replicando la precedencia de 3 niveles exacta (no simplificar a un toggle de 2 estados). Fuentes de Google Fonts vía `<link>` en `app/src/index.html`, igual que hoy.

**Ya implementado en la Fase 0** — ver `app/src/styles.css` y `app/src/app/core/theme.service.ts`.

### Routing

**Sin Angular Router por ahora.** El original no tiene rutas — es una sola página con anchors. El modal de detalle se maneja con `DialogService`, no con rutas. (Mejora futura razonable pero fuera de este alcance: un `:key` opcional para poder linkear una película directo — anotarlo como posible siguiente paso, no construirlo ahora.)

### Build y deploy

- `angular-cli-ghpages` para deploys de preview a un subpath (ej. `/app-preview/`) mientras se construye — el `index.html` de la raíz no se toca en ningún momento de esta fase.
- **Corte final** (única vez, al final): cambiar la fuente de GitHub Pages de "Deploy from a branch" a "GitHub Actions" (build de `app/`, publica su `dist/` como artifact) — evita commitear JS compilado a la raíz del repo, más prolijo para portfolio. Recién ahí se borra/reemplaza el `index.html` viejo, en un commit dedicado y reversible.

## Plan de fases (cada una demostrable con `ng serve`)

0. **Scaffolding** ✅ — workspace, `styles.css` con la cascada de tema, `ThemeService` + botón, shell mínimo. Probado con CDP (headless Chrome): toggle cambia `data-theme` y el fondo, persiste en localStorage.
1. **Capa de datos end-to-end** ✅ (mayor riesgo arquitectónico, primero a propósito) — `normalizeKey`, parser, `EnrichmentService`, `CatalogDataService`, snapshot embebido. Sin UI real todavía, solo un dump de depuración. Probado con CDP contra datos en vivo: 1293 filas → 1154 películas agrupadas, póster/reparto/director OK. Gotcha resuelto: los JSON de TMDB viven en la raíz del repo, no en `app/` — se fetchean con URL absoluta al sitio en vivo (`DATA_BASE_URL` en `enrichment.service.ts`), no con ruta relativa.
2. **Placa IV (catálogo)** ✅ — filtros, tabla, grilla, pager, orden. La primera página real, ejercita pager/card/sort que se reusan después. Probado con CDP contra datos en vivo: búsqueda, orden, conteos y badges de revisión verificados.
3. **Modal de detalle** — `DialogComponent`, las dos variantes, chips de "parecidas".
4. **Placa III (watchlist) + escritura** — alta/baja real contra el webhook, confirm dialog.
5. **Placa I (gráficos) + vitals**.
6. **Placa II (revisiones) + Placa V (caso de estudio) + footer** — lo de menor riesgo, mayormente estático.
7. **Deploy + corte** — preview en subpath (conviene arrancarlo ya desde la fase 2, no esperar al final), regresión completa contra el sitio en vivo, y recién ahí el corte final descripto arriba.

## Verificación

- **Fixture fija de 6-8 películas reales** de la hoja en vivo (una revisión múltiple, una con póster manual, una sin sinopsis/duración, una recién agregada a "quiero ver", una de cine argentino) — chequear estos mismos datos puntuales al final de cada fase que toque renderizado, comparando contra `index.html` abierto en otra pestaña con el mismo tema.
- **Fase 4 (escritura):** confirmar en la pestaña de Network que el POST tiene exactamente el mismo body shape que hoy, y verificar en la hoja de Google real que la fila se agrega/borra.
- Sin suite de tests automatizados obligatoria, pero vale la pena agregar unit tests (Vitest/Jasmine) para las funciones puras de la fase 1 (`normalizeKey`, `canonPais`, `canonDir`, el parser, el merge de `posters-manual`) — son las piezas con mayor riesgo de bug silencioso y las más baratas de testear.

## Archivos clave de referencia

- `index.html` — la especificación completa a portar 1:1.
- `cerebro/build_site.js` — patrón a adaptar para el nuevo script de snapshot.
- `posters.json` + `posters-manual.json` — semántica exacta de merge a replicar.
- `cerebro/CONFIG.md`, `cerebro/README.md` — convenciones de claves y cadencia del pipeline.
- `docs/manual-de-datos.md` — gotcha de claves huérfanas al editar `anio_estreno`.
