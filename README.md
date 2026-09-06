# IA Automation — Guía del docente y cronograma

Curso **IA Automation** (Coderhouse · Comisión 2026). 8 módulos: 7 de contenido + 1 Proyecto Integrador.
Cada módulo tiene su presentación (`Clase X … V2.pptx`) y su Pre‑Entrega (la Final en el Módulo 8).

---

## ¿Cada presentación es una clase o dos?

**Con encuentros de ~1 h 45 → dos por presentación.** Cada deck está construido para ~3 h (intro →
Bloque 01 + práctica → Bloque 02 + práctica → **break** → Bloque 03/04 + práctica → brief de la
Pre‑Entrega → cierre). En 105 minutos entra, como mucho, la mitad. Conviene tener **más clases**:
partí cada módulo en dos usando el **break del deck como punto de corte** (Bloques 01‑02 + pasos 1‑2
en el encuentro A; Bloques 03‑04 + pasos 3‑4 + brief de la Pre‑Entrega en el B).

| Duración del encuentro | Plan |
|---|---|
| **3 h** | 1 deck por encuentro → 8 encuentros |
| **~1 h 45** (tu caso) | 2 encuentros por módulo → **16 encuentros** (plan de abajo) |
| Calendario ajustado | M1 y M5 son los más livianos: se pueden dar en 1 encuentro cada uno → **14 encuentros** |

No es "una filmina por clase" (son ~40 slides por deck): es *medio deck por clase*.

---

## Cronograma recomendado — 16 encuentros (formato ~1 h 45)

| # | Bloque | Contenido del encuentro | Práctica | Hito |
|---|---|---|---|---|
| 1 | M1.1 | BPA + Arquitectura de flujos (Bloques 01‑02) | Pasos 1‑2 | |
| 2 | M1.2 | Ética y seguridad (Bloque 03) | Paso 3 | **Brief PE1** |
| 3 | M2.1 | No‑Code vs Low‑Code + Costos y estructura de datos (01‑02) | Pasos 1‑2 | Entrega PE1 |
| 4 | M2.2 | Conexiones y Omni AI + Tu ecosistema completo (03‑04) | Pasos 3‑4 | **Brief PE2** |
| 5 | M3.1 | Interfaz de Make + Routers, Filtros y Transformación (01‑02) | Pasos 1‑2 | Entrega PE2 |
| 6 | M3.2 | JSON y Variables + Flujos profesionales: OpenAI y Error Handling (03‑04) | Pasos 3‑4 | **Brief PE3** |
| 7 | M4.1 | Instalación de n8n + Nodos de IA y Agentes (01‑02) | Pasos 1‑2 | |
| 8 | M4.2 | HTTP Request + Loops y Sub‑Workflows (03‑04) | Pasos 3‑4 | **Brief PE4** · Entrega PE3 |
| 9 | M5.1 | Gmail con API + de la App a la API de WhatsApp (Twilio/Wati) (01 + 02a) | Paso 1 | |
| 10 | M5.2 | WhatsApp: regla 24 h, plantillas, drips, chatbots + Orquestación multicanal (02b‑03) | Pasos 2‑3 | **Brief PE5** · Entrega PE4 |
| 11 | M6.1 | Ventajas de Claude + Message Batches API (01‑02) | Pasos 1‑2 | Entrega PE5 |
| 12 | M6.2 | Prompt Caching + Model Context Protocol (03‑04) | Pasos 3‑4 | **Brief PE6** |
| 13 | M7.1 | Agentes con memoria RAG + Generación de contenido (01‑02) | Pasos 1‑2 | Entrega PE6 |
| 14 | M7.2 | Human‑in‑the‑Loop + Cuadros de mando (03‑04) | Pasos 3‑4 | **Brief PE7** |
| 15 | M8.1 | Kickoff del Proyecto: visión, stack, 3 capas, hoja de ruta en 6 pasos | Definición del caso de uso | Entrega PE7 |
| 16 | M8.2 | Taller de calidad de arquitecto (seguridad + costos) + revisión de avance | Construcción acompañada | **Entrega Final** |

> Cada `M#.1` y `M#.2` sale del mismo `.pptx`: `M#.1` va del inicio hasta el slide "Break"; `M#.2` toma desde ahí hasta el cierre.
> El brief de cada Pre‑Entrega se da al final del segundo encuentro del módulo, cuando los 4 "ladrillos" de práctica ya están hechos.

---

## Plantilla de un encuentro (~1 h 45)

| Tramo | Min | Contenido |
|---|---|---|
| Apertura | 0–10 | Objetivos del día, aviso de grabación, repaso de lo anterior |
| Bloque A | 10–45 | Concepto + demo en vivo |
| Práctica | 45–58 | Los alumnos avanzan un "ladrillo" de la Pre‑Entrega |
| Micro‑pausa | 58–63 | Estiramiento / dudas rápidas |
| Bloque B | 63–93 | Concepto + demo |
| Práctica + cierre | 93–105 | Segundo "ladrillo" + tarea / brief de Pre‑Entrega (si es el 2º encuentro del módulo) |

Regla práctica: **1 bloque temático del deck ≈ 35 min con demo**. Dos bloques por encuentro es el techo cómodo en 105 min.

---

## Qué dar en cada clase

Cada módulo se reparte en dos encuentros. El marcador **[E-a]** / **[E-b]** indica en cuál va cada bloque.

### Módulo 1 · Encuentros 1‑2 — Fundamentos y mentalidad de arquitecto
- **[1a] 01 Automatización de procesos (BPA):** qué es, Disparador → Acción, 3 beneficios (eficiencia, cero error, escalabilidad), BPA vs RPA, errores del que empieza ("optimizá antes de automatizar").
- **[1a] 02 Arquitectura de flujos:** Trigger / Input / Output; los 3 símbolos (óvalo = inicio/fin, rectángulo = acción, rombo = decisión); ejemplo de flujo (consulta de WhatsApp inmobiliaria).
- **[1b] 03 Ética y seguridad:** 3 pilares (privacidad, equidad, transparencia); Human‑in‑the‑Loop y "botón de parada"; minimización y trazabilidad (History en Make, Executions en n8n); GDPR e IA Act 2026 por nivel de riesgo; mitos.
- **Práctica (3 pasos):** [1a] elegir un proceso real → [1a] diagramarlo con los 3 símbolos → [1b] sumar la capa de gobernanza.
- **PE1:** diagrama de arquitectura lógica de un proceso real (.drawio / Miro / Lucidchart o PDF). Evalúa: diseño técnico visual 40 %, lógica de integración 30 %, cumplimiento y privacidad 30 %. 60 pts.

### Módulo 2 · Encuentros 3‑4 — Ecosistema No‑Code y Low‑Code
- **[3] 01 No‑Code vs Low‑Code:** definiciones, cuándo aparece el Low‑Code, cómo elegir según rol y proceso ("¿qué es lo más complejo que hará mi proceso en 6 meses?"), vendor lock‑in.
- **[3] 02 Costos y estructura de datos:** pago por uso — Tasks (Zapier), Operations (Make), Tokens (OpenAI); analogía del Uber y los rate limits; introducción a variables.
- **[4] 03 Conexiones y Omni AI:** Sheets vs Airtable (no hay sync bidireccional nativa gratis); herramientas puente (Whalesync, Byteline, Data Fetcher); Omni AI como "constructor" de bases desde lenguaje natural (prompt específico).
- **[4] 04 Tu ecosistema completo:** Cerebro (Airtable) · Sistema Nervioso (Make/Zapier) · Cara (Softr/Glide) · Inteligencia (GPT/Claude); errores del arquitecto (efecto Frankenstein).
- **Práctica (4 pasos):** [3] elegir stack → [3] estimar costos + listar variables → [4] diseñar la base → [4] armar y validar el JSON en jsonlint.com.
- **PE2:** justificación de stack (≥100 palabras) + JSON válido con un Objeto que contenga un Array anidado. Evalúa: sintaxis JSON 40 %, modelado relacional 30 %, justificación estratégica 30 %. 60 pts.

### Módulo 3 · Encuentros 5‑6 — Orquestación No‑Code con Make
- **[5] 01 La interfaz de Make:** escenarios y módulos; Triggers / Acciones / Searches; polling vs instant/webhook; Operaciones, Mapping y Conexiones; el interruptor Scheduling.
- **[5] 02 Routers, Filtros y Transformación:** Bundles (las "cajas"); el Router duplica, el Filtro decide; condición / operador / valor; **filtros sin solapamiento** (`> 1000` vs `≤ 1000`); funciones (split, formatDate, upper/lower, parseNumber).
- **[6] 03 JSON y Variables:** pares clave:valor y tipos de dato; variables dinámicas `{{1.Nombre}}`; Objetos { } y Arrays [ ]; JSON anidado ("fichas dentro de carpetas"); mapeo de formulario a CRM.
- **[6] 04 Flujos profesionales:** `Create a Chat Completion` de OpenAI (System/User, Max Tokens 100‑200); Error Handlers (Rollback / Ignore / Break / Resume); Break con 3 reintentos + backoff exponencial.
- **Práctica (4 pasos):** [5] crear escenario con Trigger real → [5] Router VIP/Estándar con filtros → [6] mapear variables en las acciones → [6] OpenAI clasifica + Error Handler Break.
- **PE3:** escenario **activo** en Make que capta un lead, lo califica con OpenAI y bifurca a prueba de fallos. Entrega: link público al blueprint (JSON) + captura del History. Evalúa: orquestación y filtros 40 %, resiliencia 40 %, procesamiento IA 20 %. 60 pts.

### Módulo 4 · Encuentros 7‑8 — Automatización avanzada de agentes con n8n
- **[7] 01 Instalación de n8n:** filosofía Fair‑Code; nodos; Cloud ("depto amueblado", ~24 €/mes) vs Self‑Hosted ("casa propia", ~5‑10 €/mes, vos hacés backups); el canvas como tubería de agua; ejecución ≠ tarea.
- **[7] 02 Nodos de IA y agentes:** Basic LLM Chain vs AI Agent; Modelo · Memoria · Tools · ReAct; ciclo Pensamiento → Acción → Observación; sin Tool conectada el agente "inventa"; caso de triaje de soporte; System Prompt específico + límite de iteraciones (5‑10).
- **[8] 03 HTTP Request:** conectar apps sin nodo nativo (analogía del camarero); los 5 ingredientes (URL, Método GET/POST, Headers, Autenticación, Body); errores 401 / 404 / 400.
- **[8] 04 Loops y Sub‑Workflows:** SplitInBatches (la lavadora, batches de 5‑50); Sub‑Workflows con Execute Workflow (DRY); arquitectura maestra Loop + Sub‑Workflow; errores (loop infinito, batch 429, "Send all incoming items").
- **Práctica (4 pasos):** [7] elegir escenario + Trigger → [7] definir el cerebro (Modelo/Memoria/Tools) → [8] APIs externas + Switch con 2+ caminos → [8] Sub‑Workflow + rama de errores.
- **PE4:** **diagrama** de arquitectura de un agente autónomo (Trigger, APIs, IF/Switch con 2+ caminos, nodo de IA que decide, Sub‑Workflow, rama de error). Entrega en PDF. 60 pts.

### Módulo 5 · Encuentros 9‑10 — Comunicación multicanal
- **[9] 01 Gmail con API:** la "puerta trasera segura" vs filtros nativos; 3 superpoderes (análisis de sentimiento, memoria contextual, lógica multicapa); robot vs asistente (el contexto es el hilo + tono + datos de Airtable); flujo Watch Emails → IA → **borrador**; errores (loop infinito, prompt vago, Thread ID).
- **02 WhatsApp Business API:** [9] de la App a la API (necesitás un BSP), Twilio vs Wati, Sandbox y Webhook; [10] **regla de las 24 h** y plantillas pre‑aprobadas por Meta, Drips (Día 0/1/3, apertura ~90 %), chatbots de reglas (árbol de decisiones + salida a humano).
- **[10] 03 Orquestación multicanal:** multicanalidad ≠ orquestación; 3 pilares (centralización, automatización, contexto); flujo Gmail → OpenAI (JSON: resumen + prioridad 1‑5) → Router: rama Slack siempre / rama WhatsApp si prioridad = 5; matriz "¿qué canal uso?".
- **Práctica (3 pasos):** [9] trigger Gmail + OpenAI (resumen + prioridad) → [10] plantilla WhatsApp + filtro ventana 24 h → [10] Router multicanal.
- **PE5:** estrategia de comunicación de una clínica (5 escenarios, canal + justificación + por qué se descartan los otros, ≥3 conceptos técnicos) + blueprint de Make que interconecta Gmail, Slack y WhatsApp con filtros. Evalúa: orquestación integrada 40 %, distribución crítica 30 %, salida y alertas 30 %. 60 pts.

### Módulo 6 · Encuentros 11‑12 — Inteligencia de negocio con Anthropic Claude API
- **[11] 01 Ventajas de Claude:** lee, ve y razona; ventana de contexto de 200 000 tokens ("mesa gigante"); razonamiento paso a paso ("Pensá paso a paso antes de darme la conclusión"); visión de documentos (tablas, gráficos, diagramas dentro de un PDF); errores (copiar y pegar fragmentos, resúmenes genéricos).
- **[11] 02 Message Batches API:** lote de cientos de pedidos, asíncrono, hasta 24 h, **50 % de descuento**; normal vs batch; cuándo usar lotes ("si puede esperar a que tomes un café, es batch").
- **[12] 03 Prompt Caching:** los "ingredientes pre‑picados", ahorro hasta 90 %; Prefix / Cache Hit / Cache Miss; reglas (al inicio, idéntico, mínimo 1024 tokens, TTL 5 min que se reinicia con cada uso); combo ganador Caching + Batches.
- **[12] 04 Model Context Protocol (MCP):** el "USB‑C de la IA"; Resources / Tools / Prompts / Server; Host · Client · MCP Server · Data; MCP ≠ RAG y no reemplaza las APIs.
- **Práctica (4 pasos):** [11] plantilla de prompt (rol + "paso a paso") → [11] modelar flujo Batch con tiempos → [12] definir el prefix a cachear → [12] matriz de ahorro (50 % batch + lectura barata de caché).
- **PE6:** documento con prompts profesionales + flujo Batch + prefix + **matriz de ahorro** con la demostración matemática del 50 %. Evalúa: ingeniería de prompts 40 %, cálculo de eficiencia 30 %, modelado del flujo Batch 30 %. 60 pts.

### Módulo 7 · Encuentros 13‑14 — Diseño de agentes y automatización de la creatividad
- **[13] 01 Agentes con memoria RAG:** RAG = recuperar info de una fuente externa antes de responder (el bibliotecario, "examen a libro abierto"); Notion como cerebro; búsqueda semántica; Instrucciones · Acceso a datos · Memoria de chat · Fuente validada; prompt clave ("respondé solo con la base vinculada, citá la página"); errores (info desactualizada, instrucciones vagas, páginas gigantes).
- **[13] 02 Generación de contenido:** ciclo Captura → Procesamiento IA → Formateo → Distribución; la "idea semilla" como input mínimo (Airtable con Tono/Audiencia/Keywords); qué delegar (evergreen sí, actualidad híbrido, empatía no); voz de marca (muletillas, qué nunca diría, firma).
- **[14] 03 Human‑in‑the‑Loop:** modelo híbrido 90 % IA / 10 % humano en puntos críticos (el chef prueba la cucharada); flujo Trigger → IA redacta → **pausa** con botones Aprobar/Editar → acción humana → ejecución final; dónde insertar la pausa (Slack/Teams con botones, Airtable/Sheets por estado, Wait for Webhook).
- **[14] 04 Cuadros de mando:** reporte (foto del pasado) vs dashboard (tablero del coche); 3 componentes (fuente de la verdad, visualización, KPIs); KPIs clave (tasa de aprobación, volumen de salida, tasa de error — **máximo 4**); IA que analiza el dashboard sola y avisa por Slack.
- **Práctica (4 pasos):** [13] base de conocimiento RAG → [13] generador con IA desde idea semilla → [14] pausa HITL + filtro condicional → [14] dashboard con 3 KPIs.
- **PE7:** pipeline de contenido autónomo con RAG + punto de pausa HITL obligatorio antes de publicar + dashboard. Entrega en PDF (o link al flujo activo). Evalúa: mecanismo de pausa HITL 40 %, distribución condicional 30 %, estructura RAG 30 %. 60 pts.

### Módulo 8 · Encuentros 15‑16 — Proyecto Integrador
- **[15] 01 El proyecto integrador:** el camino recorrido (M1‑M2 fundamentos, M3‑M4 orquestación, M5 comunicación, M6‑M7 inteligencia); qué construir = ecosistema autónomo de punta a punta; el stack (orquestador, base de datos, procesamiento IA, canal de salida); las 3 capas — Cerebro (datos) · Corazón (lógica) · Voz (salida); requisitos (autónomo, resiliente, con HITL, limpio).
- **[15] 02 La hoja de ruta en 6 pasos:** (1) caso de uso acotado y real, (2) el Cerebro — base con campos de estado Pendiente/Procesado por IA/Aprobado por Humano, (3) el Corazón — trigger inteligente + motor de IA + Error Handling, (4) el HITL — semáforo humano antes de la acción crítica, (5) la Voz — salida multicanal con Thread ID / plantillas, (6) probá (test de estrés, "camino infeliz") y entregá (video demo 3 min sin API keys).
- **[16] 03 Calidad de arquitecto:** check de seguridad (anti‑bucle, tipos de datos, prompt dinámico); estrategia de costos (modelo económico para lo mecánico, Claude para razonamiento, Batches para volumen no urgente) justificada en un cuadro comparativo.
- **[16] 04 La entrega final:** repositorio en GitHub con diagrama de arquitectura (PDF), lógica del flujo (`.json` / `.blueprint`), link a la DB en modo lectura, evidencias (screenshots) y dashboard público.
- **Encuentro 15:** kickoff — cada alumno sale con el caso de uso definido y el diseño del Cerebro empezado.
- **Encuentro 16:** taller — revisión de avance 1 a 1, check de seguridad y costos, resolución de trabas.
- **Entrega Final:** **aprueba con 70 pts** (no 60). Criterios (20 % c/u): mapa de arquitectura, manual de datos, optimización de costos, seguridad y resiliencia, dashboard ejecutivo. Trabajo estimado ~8 h.

---

## Calendario de Pre‑Entregas

| Se presenta en | Entrega | Se recomienda cerrar antes de |
|---|---|---|
| Encuentro 2 | PE1 — Diagrama de arquitectura lógica | Encuentro 5 |
| Encuentro 4 | PE2 — Stack + JSON | Encuentro 7 |
| Encuentro 6 | PE3 — Escenario Make con IA y resiliencia | Encuentro 9 |
| Encuentro 8 | PE4 — Diagrama de arquitectura de agente | Encuentro 11 |
| Encuentro 10 | PE5 — Estrategia de canales + pipeline multicanal | Encuentro 13 |
| Encuentro 12 | PE6 — Estrategia de eficiencia + matriz de ahorro | Encuentro 15 |
| Encuentro 14 | PE7 — Pipeline RAG + HITL + dashboard | Encuentro 16 |
| Encuentro 15 | Entrega Final — Ecosistema autónomo (repo GitHub) | Cierre de comisión |

---

## Herramientas por módulo

| Módulo | Herramientas |
|---|---|
| M1 | Draw.io / Miro / Lucidchart / papel |
| M2 | Google Sheets, Airtable, Omni AI, jsonlint.com |
| M3 | Make (Integromat), OpenAI |
| M4 | n8n (Cloud o Self‑Hosted), LangChain, HTTP Request, OpenAI / Claude |
| M5 | Gmail API, Slack, WhatsApp Business API (Twilio / Wati) |
| M6 | Anthropic Claude API (Batches, Prompt Caching), MCP |
| M7 | Notion (RAG), Airtable, Claude / GPT, Slack |
| M8 | Todo el stack + GitHub |
