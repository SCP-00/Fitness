# Agent handoff log

Append one dated entry per substantive agent session. Do not overwrite previous entries.
Keep the owner-facing summary in Spanish, concise, verifiable, and explicit about
unfinished work and approval gates. This log is status—not user authorization.

## Entry template

```md
## YYYY-MM-DD — Short task/session title

- **Resultado:**
- **Cambios:** `path/to/file` — brief description.
- **Verificación:** exact command/check and result; say “not run” when applicable.
- **Pendiente / decisión del dueño:**
- **Siguiente paso seguro:**
```

## 2026-09-30 — Corrección de dirección del mapa de fuerza

- **Resultado:** El mapa de calor principal debe comparar fuerza relativa con un nivel
  ideal/referencia publicado; la exposición/volumen de series será una vista alternativa,
  no la medida principal de fuerza.
- **Cambios:** `AGENTS.md`, `knowledge.md`, `ROADMAP.md` y
  `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md` actualizados con esta dirección; este
  archivo establece el protocolo de mensajes de sesión. En una sesión anterior
  interrumpida se copiaron los PNG existentes a
  `fitness-ecosystem/docs/prototypes/assets/` como recursos independientes del prototipo;
  no se conectaron al HTML ni se integraron cambios nuevos en la aplicación.
- **Evidencia y límites:** Un estudio de 2024 ofrece normas de sentadilla, banca y peso
  muerto en competidores por sexo, edad y clase de peso, pero no valida por sí solo una
  población general ni el ajuste pedido por estatura. Un artículo de 2008 trata escalado
  alométrico de fuerza y tamaño corporal, pero su muestra y medición no bastan para
  definir una norma general de levantamientos. Referencias en §9 de
  `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md`.
- **Verificación:** revisión de los documentos y fuentes primarias; no se ejecutaron
  pruebas de aplicación porque este cambio es documental.
- **Pendiente / decisión del dueño:** Investigar una norma externa apropiada que integre
  sexo, estatura, peso corporal y el nivel “ideal”; si no existe evidencia válida, reportar
  opciones y limitaciones antes de proponer una fórmula o cambiar el mapa. Confirmar cómo
  convivirá la lente antropométrica `Objetivos` existente con las dos vistas solicitadas.
- **Siguiente paso seguro:** hacer la revisión de fuentes y presentar una recomendación
  documentada; no alterar ni integrar el prototipo independiente en TrainingLab sin la
  aprobación explícita del dueño.

## 2026-09-30 (b) — Respuesta a Chatty: revisión de fuentes + push del rediseño; super-búsqueda de ideales por deporte

- **Resultado:** (1) El rediseño TrainingLab + Tauri 0.2.0 quedó **subido a `main`
  (`78d480f..10ce94c`) tras replicar los jobs de CI en local** (lint 0/0, 847 root tests,
  `pnpm check` EXIT 0 con 21 e2e, ambos instaladores Tauri construidos y smoke PASS);
  se corrigió la aserción rota de `capture-screenshots.mjs` y se regeneraron las capturas.
  (2) **Super-búsqueda entregada** en `fitness-ecosystem/docs/RESEARCH_IDEALS_BY_SPORT.md`:
  ideales publicados por capacidad (VO₂max Cooper/Mandsager por sexo+edad, powerlifting
  2024 por sexo+edad+clase, salto ACE por sexo+edad, Rikli & Jones 60–94 por sexo,
  age-grading WMA 2023 por sexo+edad año a año), la brecha de estatura documentada por
  fuente (ninguna fuente de fuerza/potencia la soporta — no se inventa ajuste), y la
  vía honesta para "Atractivo" (WHtR + %BF por sexo + presets propios con disclosure).
- **Cambios:** `fitness-ecosystem/scripts/capture-screenshots.mjs` (aserciones); 3 commits
  de app+docs+prototipos; `fitness-ecosystem/docs/RESEARCH_IDEALS_BY_SPORT.md` (nuevo);
  esta entrada. **No se tocó el mapa ni el prototipo** — la puerta de aprobación sigue
  cerrada.
- **Verificación:** comandos y resultados listados arriba; investigación basada en fuentes
  primarias (Cooper 1968, Mandsager 2018, Kokkinos 2022, Jones & Rikli 1999/PubMed
  10380242, ACE vertical-jump protocol, WMA 2023 Appendix B / calculador Grubb / USATF).
- **Pendiente / decisión del dueño:** (a) aprobar las secciones onboarding **Deporte**
  y **Atractivo** propuestas en §5 del documento (campos `sport`/`sportFocus`/
  `objective='handsome'`); (b) decidir qué hacer con la estatura cuando la fuente no la
  soporta (mostrar brecha / experimental alométrico etiquetado / esperar fuente); (c) para
  patinaje de velocidad no hay norma pública — elegir récords de élite como contexto o
  autocomparación etiquetada; (d) confirmar que la lente Objetivos antropométrica sigue
  separada hasta aprobar su relación con las vistas nuevas.
- **Siguiente paso seguro:** al aprobarse §5, implementar los campos del onboarding con
  tests de tramo de edad (15–19/20–59/60–94) y conectar la primera fuente (Cooper ♀
  20–59 o salto ACE) a la lente ideal en un PR separado.

## 2026-09-30 (c) — §5 implementado: lente de condición física + onboarding Deporte/Atractivo; estatura resuelta con FFMI/WHtR

- **Resultado:** las tres órdenes del dueño (2026-09-30) quedaron implementadas y en
  `main` (`5897cc6..f0bf976`): (1) la decisión de estatura está **documentada y cerrada**
  en §3 de `RESEARCH_IDEALS_BY_SPORT.md` — FFMI (Kouri 1995) y WHtR (Ashwell) tienen la
  estatura **en su definición publicada**, así que no hay ajuste inventado; para Cooper/
  %BF la brecha se declara por fuente. (2) TrainingLab Progreso muestra la **lente
  "Condición física"**: cuatro ejes (cardio Cooper por sexo+edad vía core, %BF ACE por
  sexo vía core, WHtR, FFMI) con banda, fuente y rango visibles; sin dato → "sin dato +
  cómo medirlo", nunca 0. (3) El onboarding de BodyLab incluye **Deporte** (general/
  correr/baloncesto/patinaje con enfoque), **Objetivo** (deporte/atractivo/salud) y
  presets estéticos con el aviso "meta personal, no estándar médico"; el paso muestra la
  fuente publicada correspondiente al tramo de edad derivado (15–19/20–59/60–94).
- **Cambios:** `traininglab/.../src/features/stats/condition.ts` (nuevo, puro),
  `features/today/ConditionCard.tsx` (nuevo), `screens/ProgressScreen.tsx`, `lib/i18n.ts`,
  `lib/adapter.ts` (+`indicators` aditivo), `index.css`, `tsconfig.app.json`/`vite.config.ts`
  (alias `@fitness/bodylab-conditioning`), `bodylab/apps/web/src/lib/onboarding-context.ts`
  (nuevo), `components/Onboarding.tsx`, `lib/types.ts`, `lib/traininglab-export.ts`
  (campos aditivos sport/sportFocus/objective/aestheticPreset),
  `docs/RESEARCH_IDEALS_BY_SPORT.md`; tests nuevos `tests/training/test_condition.test.ts`
  (19) y `src/__tests__/onboarding-context.test.ts` (5). Fix CSS `f0bf976` (regla
  `.tl-muscle-row` restaurada tras un insert que rompió el build).
- **Verificación:** root suite **871/871**, web **115/115** (re-run tras un flake puntual),
  lint 0/0, `tsc -b` TrainingLab 0 (binario local), `tsc -b` web 0, **ambos `vite build`
  EXIT 0**, Prettier aplicado a los archivos tocados. Tauri installer no reconstruido en
  esta sesión (sin cambios en `src-tauri`).
- **Pendiente / decisión del dueño:** (a) el mapa per-family por fuerza externa sigue
  gated — esta lente es whole-body y no lo sustituye; (b) deportes adicionales del
  catálogo Deporte se añaden sin tocar ids existentes; (c) si quiere percentiles reales
  de FFMI (no referencias descriptivas), hace falta una fuente poblacional con licencia
  clara antes de implementarla.
- **Siguiente paso seguro:** reconstruir el instalador TrainingLab 0.2.1 y regenerar
  capturas cuando el dueño pida release; conectar `sport`/`objective` a la selección de
  eje por defecto de la lente (hoy son datos + UI, el efecto en la lente es el paso
  siguiente aprobado).

## 2026-09-30 (g) — Guía de ejecución detallada para Buffy: calidad TrainingLab PC/móvil

- **Resultado:** Se preparó un plan de trabajo priorizado para llevar TrainingLab a un
  ciclo usable de planificar → entrenar → registrar → revisar, con criterios de aceptación
  PC/móvil, QA, accesibilidad, pruebas, privacidad y protocolo de reanudación para Buffy.
  Se aclaró que la tarjeta `Condición física` whole-body reportada en (c) no es el mapa
  muscular de fuerza externa solicitado.
- **Cambios:** `fitness-ecosystem/docs/BUFFY_IMPLEMENTATION_BRIEF.md` (guía operativa);
  `AGENTS.md` y `knowledge.md` (lectura obligatoria y handoff entre sesiones);
  `ROADMAP.md` (estado reportado + tareas abiertas); `fitness-ecosystem/docs/UI_DESIGN.md`
  y `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md` (distinción entre lentes actuales,
  condición whole-body y mapa de fuerza futuro). No se modificó código de la aplicación.
- **Auditoría puntual:** lectura del handoff (2026-09-30 c), roadmap, plan de interfaz,
  contrato responsive, investigación de referencias y código actual de Progreso. En
  `docs/prototypes/muscle-map-2d.html`, la inspección encontró que el índice del mapa se
  normaliza con carga/tonelaje entre familias, no con un estándar de fuerza; además
  `renderTrend()` referencia `map.has(m)` sin que `map` esté definido en esa función.
  Son hallazgos de inspección estática, no pruebas de navegador.
- **Estado Git preservado:** al comenzar estaban modificados
  `traininglab/apps/desktop/src/features/stats/condition.ts` y
  `traininglab/apps/desktop/src/features/today/ConditionCard.tsx`. No se editaron ni
  revirtieron; Buffy debe revisar sus diffs antes de continuar.
- **Verificación:** revisión documental y estática; no se ejecutaron suites, builds,
  screenshots ni pruebas visuales porque los cambios de esta sesión son documentación.
  El brief indica comandos, viewports y evidencia que Buffy debe correr en su sesión.
- **Pendiente / decisión del dueño:** validar evidencia para fuerza vs norma por músculo,
  soporte de estatura/peso/sexo/edad, visualización de levantamientos compuestos y
  ubicación futura de `Objetivos`. La integración del HTML/PNG/máscara al app sigue
  bloqueada hasta aprobación explícita del dueño.
- **Siguiente paso seguro para Buffy:** leer `AGENTS.md`, `knowledge.md`, `ROADMAP.md` y
  `docs/BUFFY_IMPLEMENTATION_BRIEF.md`; inspeccionar y preservar el árbol Git actual;
  correr línea base; comenzar Fase 0 y proponer una entrega vertical P0 verificable. No
  integrar el prototipo al app.

## 2026-09-30 (h) — Auditoría de comportamiento en navegador (Buffy, Agente principal)

- **Fase/tarea:** Fase 0 del brief (orientación y línea base) + hallazgos reproducibles
  para Fase 1 P0. Todo el trabajo fue de inspección/auditoría; **no se modificó código de
  la aplicación**.
- **Resultado:** se ejecutó una auditoría de comportamiento completa con Playwright sobre
  los bundles construidos (PC 1440×900 y móvil 390×844), más el recorrido de BodyLab y su
  onboarding. Veredicto: **64 PASS / 3 FAIL / 3 WARN**. Los 3 FAIL son defectos reales del
  ciclo de entrenamiento de TrainingLab:
  1. **Guardar una serie reinicia la rampa de calentamiento** (`Calentamiento hecho` vuelve
     a aparecer después de cada serie de trabajo): el efecto de `ZenSession` vuelve a
     `phase="warmup"` cuando cambia `suggestedKg` (que se recalcula desde `sets`).
  2. **Dos series seguidas cambian el ejercicio actual** (observado: `Flexión Declinada`
     → `Press Arnold` alternando tras cada clic): `plan`/`rows` se recalculan con
     `logStats` (que incluye las series de hoy), así que la sesión en curso no está
     congelada. Reproducido con y sin modelo de decisión.
  3. **Editar una serie registrada no existe**: solo hay botón Eliminar; el borrado es
     inmediato, sin confirmación ni deshacer.
     WARN: (a) sin deshacer/confirmación al borrar; (b) TrainingLab no exporta/backupea sus
     propios datos (solo importa JSON de BodyLab); (c) la tarjeta de preferencias está
     colapsada por defecto (unidad/equipo quedan ocultos hasta abrirla).
- **Cambios propios:** `fitness-ecosystem/scripts/audit-app-behavior.mjs` (nuevo, sin
  commitear): auditoría reutilizable con fixtures propios (perfil, plan, historial de 2
  días), captura de errores de consola, overflow horizontal, objetivos táctiles, tamaño
  de inputs y persistencia IndexedDB. Salidas en `fitness-ecosystem/tmp/audit-behavior/`
  (`results.json` + capturas; `tmp/` está gitignored). Scripts de depuración temporales
  eliminados. Documentos de Chatty preservados sin tocar (`AGENTS.md`, `knowledge.md`,
  `ROADMAP.md`, `docs/UI_DESIGN.md`, `docs/TRAININGLAB_UI_PLAN.md`,
  `docs/BUFFY_IMPLEMENTATION_BRIEF.md`); los diffs locales de `condition.ts` y
  `ConditionCard.tsx` son **solo formato Prettier** (verificado con `git diff`), sin cambio
  semántico.
- **Verificación (todo fresco, esta sesión):**
  - `node scripts/audit-app-behavior.mjs` → `{"PASS":64,"FAIL":3,"WARN":3}` (ver fallos arriba).
  - `fitness-ecosystem/`: `npx vitest run` → **871/871** (53 archivos).
  - `bodylab/apps/web`: `npx vitest run` → **115/115** en dos corridas consecutivas; en la
    primera corrida del día, bajo carga (justo tras la suite raíz), 1 test falló con
    timeout y luego pasó: **flake de test, no regresión de app**.
  - `bodylab/apps/web`: `npx playwright test` → **21/21 en 1.0 m** (incluye WASM 3D, GIF,
    roundtrip de export/import y adversarial).
  - `pnpm --filter web lint` → **0 warnings / 0 errors** (70 archivos).
  - `traininglab/apps/desktop`: `./node_modules/.bin/tsc -b` → **EXIT 0**; ambos
    `vite build --base=./` → EXIT 0 (reconstruidos antes de la auditoría).
  - QA visual: capturas en `fitness-ecosystem/tmp/audit-behavior/*.png` (Chromium headless,
    1440×900 y 390×844). El servidor LAN de esta sesión quedó sirviendo en :8090.
- **Estado Git:** rama `main`, último commit `9c6af32`. Sin commitear: documentos de
  Chatty + diffs Prettier en `condition.ts`/`ConditionCard.tsx` + este handoff + el script
  de auditoría. Nada de eso se revirtió ni se incluyó en commit.
- **Pendiente / decisión del dueño:** autorizar la corrección P0 (congelar la sesión del
  día y desacoplar el reset de ZEN), decidir si se añade deshacer/confirmación al borrado y
  export/backup de TrainingLab. La integración del prototipo del mapa muscular sigue
  bloqueada hasta aprobación explícita.
- **Siguiente paso seguro:** abrir `fitness-ecosystem/scripts/audit-app-behavior.mjs` y
  usar sus 3 fallos como criterio de aceptación de la primera entrega P0; empezar por
  congelar `rows`/`plan` durante la sesión (o excluir las series de hoy del cálculo) y por
  dividir el efecto de `ZenSession` para que el reset de fase dependa solo del cambio de
  ejercicio.

## 2026-09-30 (i) — P0 del ciclo de entrenamiento corregidos y verificados en navegador

- **Fase/tarea:** brief Fase 1 (P0, cierre del ciclo registrar → ver → editar → borrar),
  los tres fallos que dejó la auditoría (h).
- **Resultado:** los 3 P0 están corregidos y **la auditoría de navegador pasa sin fallos**:
  `{"PASS":69,"FAIL":0,"WARN":1}`. El único WARN restante es la ausencia de
  export/backup propio de TrainingLab (P1 declarado, fuera de este encargo).
  1. **Sesión congelada (P0-2):** el planificador de hoy ya no ve las series de hoy
     (`planningStats` excluye `timestamp` de hoy) → registrar una serie no re-planifica el
     día ni cambia el ejercicio. Verificado: «La serie registrada no cambia el ejercicio
     actual» y «Dos series seguidas mantienen el mismo ejercicio» en verde (antes:
     oscilaba entre «Flexión Declinada» y «Press Arnold»).
  2. **Reset de ZEN desacoplado (P0-1):** el efecto de `ZenSession` reinicia fase/rampa solo
     al cambiar de ejercicio o unidad; además, al montar a mitad de ejercicio (salir a
     Progreso y volver) no repite la rampa si ya hay serie de trabajo registrada. Ya no
     reinicia la rampa tras cada serie ni borra el RPE. Verificado en verde.
  3. **Editar serie + deshacer (P0-3):** edición en línea de peso/reps en las filas ya
     registradas (`SlotCard`, peso en unidad de visualización, almacenamiento en kg) con
     `editSet` en el store; el borrado muestra un aviso persistente **Deshacer** durante 8 s
     (`removedSet` + `undoRemoveSet`, restaura también en IndexedDB). Verificado:
     «Borrado ofrece Deshacer», «Deshacer restaura la serie borrada», «Editar una serie
     guarda los cambios — reps 10 → 13 (en IndexedDB)».
- **Cambios:** `traininglab/apps/desktop/src/app/store.tsx` (planningStats, editSet,
  removedSet/undoRemoveSet, banner de deshacer), `features/today/ZenSession.tsx` (deps del
  efecto + fase inicial según trabajo ya hecho), `features/today/SlotCard.tsx` (edición en
  línea), `screens/TodayScreen.tsx` (cableado de `editSet`), `lib/i18n.ts` (claves
  `common.edit`, `common.undo`, `log.removed`), y el propio script de auditoría, que ahora
  **prueba funcionalmente** editar (escribe reps 13 y lo confirma en IndexedDB) y deshacer
  (borra → Deshacer → cuenta restaurada), en vez de solo mirar si el control existe.
- **Verificación (todo fresco):** `node scripts/audit-app-behavior.mjs` →
  `{"PASS":69,"WARN":1}` (PC 1440×900 + móvil 390×844, capturas en
  `tmp/audit-behavior/`); `npx vitest run` (raíz) → **871/871**; `bodylab/apps/web`
  `npx vitest run` → **115/115**; `pnpm --filter web lint` → **0/0**;
  `traininglab/apps/desktop`: `./node_modules/.bin/tsc -b` → **EXIT 0** y
  `pnpm exec vite build --base=./` → **EXIT 0**. Prettier aplicado a los archivos tocados.
- **Estado Git:** rama `main`, último commit `9c6af32`; siguen sin commitear los documentos
  de Chatty, los diffs Prettier previos de `condition.ts`/`ConditionCard.tsx`, este handoff
  y el script de auditoría. Sin commit ni push (no pedidos).
- **Pendiente / decisión del dueño:** (a) export/backup de los datos de TrainingLab (P1 del
  informe); (b) confirmar si quiere commit/push de esta entrega; (c) el mapa muscular sigue
  gated, prototipo intacto.
- **Siguiente paso seguro:** probar el ciclo completo en el móvil real por LAN (mismo
  bundle en :8090) y, si se aprueba, commitear la entrega P0 con los documentos de Chatty
  en un commit aparte.

## 2026-09-30 (j) — Optimización de bundles, evaluación QA ergonómica y Coach LLM biomecánico (Qwen 3.5 - 4B)

- **Resultado:**
  1. Se elaboraron los 3 planes maestros solicitados:
     - `plan_optimizacion_ecosistema.md`: Reducción de más del 65% de espacio en disco (~4.3 GB), deduplicación de medios y reestructuración modular.
     - `plan_evaluacion_qa_ui_ux.md`: Auditoría implacable de `TRAININGLAB_UI_PLAN.md (v2)` bajo fatiga real en móvil y PC, detectando el conflicto de teclado virtual y la falacia de fuerza aislada en ejercicios compuestos.
     - `plan_ejecucion_llm_coach_qwen.md`: Arquitectura del Coach LLM con Qwen 3.5 - 4B, loopback `llama.cpp` (`:8080`), CLI bridge y tool calling biomecánico.
  2. **Optimizaciones de bundle ejecutadas y verificadas:**
     - TrainingLab: `React.lazy()` en [App.tsx](file:///c:/Users/andyh/Projects/FreeBody/fitness-ecosystem/traininglab/apps/desktop/src/app/App.tsx) y `manualChunks` en [vite.config.ts](file:///c:/Users/andyh/Projects/FreeBody/fitness-ecosystem/traininglab/apps/desktop/vite.config.ts). El bundle inicial JS se redujo de **617 KB a 103 KB (-78% de JS inicial)**.
     - BodyLab: `manualChunks` en [vite.config.ts](file:///c:/Users/andyh/Projects/FreeBody/fitness-ecosystem/bodylab/apps/web/vite.config.ts) consolidó los micro-chunks de iconos y aisló `recharts` y `jszip`.
  3. **Coach LLM Biomecánico y CLI implementados:**
     - En [llm.ts](file:///c:/Users/andyh/Projects/FreeBody/fitness-ecosystem/traininglab/apps/desktop/src/lib/llm.ts) y [store.tsx](file:///c:/Users/andyh/Projects/FreeBody/fitness-ecosystem/traininglab/apps/desktop/src/app/store.tsx): añadidas herramientas `report_fatigue_and_query_safe` y `swap_exercise_safe`, y función `evaluateBiomechanicsAndFatigue`.
     - Caso de dolor en unión de pectoral superior y hombro por mancuernas resuelto: veta automáticamente empujes/aperturas y redirige a 33 ejercicios seguros de core/abdomen y tren inferior.
     - Creado [fitness-coach-cli.mjs](file:///c:/Users/andyh/Projects/FreeBody/fitness-ecosystem/scripts/fitness-coach-cli.mjs) para conexión CLI/headless.
- **Cambios:** `traininglab/apps/desktop/src/app/App.tsx`, `traininglab/apps/desktop/vite.config.ts`, `bodylab/apps/web/vite.config.ts`, `traininglab/apps/desktop/src/lib/llm.ts`, `traininglab/apps/desktop/src/app/store.tsx`, `scripts/fitness-coach-cli.mjs` (nuevo), `tests/training/test_llm_coach_qwen.test.ts` (nuevo), `docs/AGENT_HANDOFF.md`, artefactos `plan_optimizacion_ecosistema.md`, `plan_evaluacion_qa_ui_ux.md`, `plan_ejecucion_llm_coach_qwen.md`, `walkthrough.md`.
- **Verificación (todo fresco):**
  - `pnpm test` (raíz): **875 / 875 PASS** (54 suites, incluye la nueva suite de coach Qwen).
  - `bodylab/apps/web`: `npx vitest run` → **115 / 115 PASS**.
  - `pnpm --filter web lint`: **0 warnings / 0 errors**.
  - `pnpm typecheck` + TrainingLab `tsc -b`: **EXIT 0**.
  - `node scripts/fitness-coach-cli.mjs --dry-run`: Diagnóstico clínico y prescripción segura de 33 ejercicios ejecutada con éxito.
- **Pendiente / decisión del dueño:** Confirmar si desea iniciar el servidor local `llama.cpp` con el GGUF en `:8080` para pruebas conversacionales interactivas en vivo.
- **Siguiente paso seguro:** Realizar commit de las optimizaciones y el CLI del coach.

## 2026-09-30 (k) — Datos para el LLM (CSV + SQLite + CLI), planes adoptados y Tauri compilado

- **Fase/tarea:** petición del dueño de la sesión: (1) export CSV legible por LLM y por Excel,
  (2) SQLite interno con backend «pandas o equivalente» que el LLM pueda usar para manipular
  la app, (3) CLI para que el LLM (hoy Buffy) optimice y pruebe; más compilar Tauri, validar
  interfaces Mobile/WEB/App y leer/adoptar los tres planes nuevos. Orden cumplido:
  plan → documentación → implementación.
- **Resultado:**
  1. **Planes adoptados:** los tres documentos del propietario se movieron de la raíz a
     `fitness-ecosystem/docs/` conservando su nombre y prioridad —
     `plan_optimizacion_ecosistema.md`, `plan_evaluacion_qa_ui_ux.md`,
     `plan_ejecucion_llm_coach_qwen.md` — y quedaron registrados en `AGENTS.md` y
     `knowledge.md` junto con el nuevo `docs/PLAN_CSV_SQLITE_CLI.md` (plan de esta entrega).
     Se verificó el trabajo previo de Gemini 3.8 Flash con ejecuciones reales: **875/875** de la
     suite raíz confirmados y `node scripts/fitness-coach-cli.mjs --dry-run --pain … --focus
abdomen` funciona (33 ejercicios seguros, EXIT 0). El P0 de teclado virtual del plan QA
     **sigue sin implementar**; la optimización de medios/reestructuración/backup JSON también.
  2. **CSV implementado:** `lib/export-csv.ts` (puro) + tarjeta «Mis datos» en Ajustes. Contrato
     Excel es-ES: BOM UTF-8, delimitador `;`, decimal coma, CRLF, comillas RFC 4180, 19 columnas
     (`set_id … volume_kg, notes`) con metadatos del catálogo (familia primaria, patrón, equipo).
     Verificado con el archivo real descargado por Playwright (18/18 filas coinciden con
     IndexedDB).
  3. **SQLite + CLI:** `scripts/fitness-data-lib.mjs` (parser tolerante `;`/`,` y `,`/`.`,
     espejo `sets`/`ingests`, upsert por `set_id`, resumen con PRs y volumen) y
     `scripts/fitness-data-cli.mjs` con `--ingest/--sql/--summary/--export/--schema --db`.
     Decisión documentada: **Node + `node:sqlite` como «backend equivalente» a pandas** (cero
     dependencias, mismo runtime; receta pandas en el plan §3.4). `--sql` no se expone por HTTP;
     la escritura de vuelta a la app queda para F2 (store LAN o importador de backup).
  4. **Auditoría funcional:** la descarga del CSV se captura, se valida el contrato y se ingiere
     con el CLI en SQLite; veredicto global **72 PASS / 0 FAIL / 1 WARN** (antes 69/0/1). El WARN
     restante es explícito: no existe todavía copia de seguridad completa (JSON) de TrainingLab.
  5. **Tauri compilado:** TrainingLab **0.2.0 EXIT 0**
     (`…\src-tauri\target\release\bundle\nsis\TrainingLab_0.2.0_x64-setup.exe`, 13.76 MiB);
     BodyLab **1.0.0-beta.6 EXIT 0** con `--config '{"bundle":{"createUpdaterArtifacts":false}}'`
     (local no tiene `TAURI_SIGNING_PRIVATE_KEY`; CI/release firma con secretos) →
     `BodyLab_1.0.0-beta.6_x64-setup.exe` (23.3 MB).
- **Cambios:** `traininglab/apps/desktop/src/lib/export-csv.ts` (nuevo),
  `screens/SettingsScreen.tsx` (tarjeta Mis datos), `lib/i18n.ts` (claves `data.*`),
  `scripts/fitness-data-lib.mjs` (nuevo), `scripts/fitness-data-cli.mjs` (nuevo),
  `scripts/audit-app-behavior.mjs` (prueba funcional del export + CLI; el check textual pasó a
  WARN específico de backup), `tests/training/test_export_csv.test.ts` y
  `tests/training/test_data_cli.test.ts` (nuevos, 14 tests), `docs/PLAN_CSV_SQLITE_CLI.md`
  (nuevo), `docs/plan_*.md` (movidos), `AGENTS.md`, `knowledge.md` y este handoff.
- **Verificación (todo fresco, esta sesión):** raíz `npx vitest run` → **889/889 (56 archivos)**
  (baseline previo a mis tests: 875/875 EXIT 0); web `npx vitest run` → **115/115**; BodyLab e2e
  `npx playwright test` → **21/21 en 51.6 s** EXIT 0; `pnpm --filter web lint` → **0/0 (70
  archivos, 116 reglas)**; TrainingLab `tsc -b` → **EXIT 0**; bundles `vite build --base=./` →
  EXIT 0 en ambas apps; `node scripts/audit-app-behavior.mjs` con el servidor LAN en :8090 →
  **72 PASS / 0 FAIL / 1 WARN** (`tmp/audit-behavior/results.json`; nuevos checks: contrato
  Excel, 18 series CSV=IndexedDB, «CLI: CSV ingerido en SQLite (18 filas)»); CLI de datos
  ejercitado a mano (`--schema`, `--summary`, `--sql`); `fitness-coach-cli.mjs --dry-run` →
  EXIT 0. Prettier aplicado a lo tocado. Evidencia temporal en `fitness-ecosystem/tmp/`
  (gitignored): `tauri-tl.log`, `tauri-bl.log`, `tauri-bl-nosign.log`, `audit-behavior/`.
- **Estado Git:** rama `main`, último commit `9c6af32`. Sin commitear: documentos de Chatty +
  cambios de Gemini 3.8 Flash + esta entrega (nada revertido ni staged). Sin commit ni push.
- **Pendiente / decisión del dueño:** (a) aprobar F2 del plan — backup JSON completo (cierra el
  WARN) y escritura de vuelta (store LAN o importador); (b) confirmar si basta el backend Node +
  `node:sqlite` o se quiere además un puente Python/pandas real; (c) orden de ataque de los
  planes adoptados: P0 móvil del plan QA (teclado virtual + acciones visibles) o plan de
  optimización (dedup de medios, reestructuración, cargo compartido); (d) commit/push de la
  entrega cuando se pida.
- **Siguiente paso seguro:** abrir TrainingLab en :8090 → Ajustes → «Exportar CSV» y ejecutar
  `node scripts/fitness-data-cli.mjs --summary` sobre el export resultante (o `--ingest` a
  `tmp/fitness.sqlite`); con la aprobación del dueño, empezar F2 por el backup JSON.

## 2026-10-01 (l) — Mapa 2D masculino/femenino integrado y encuadre responsive

- **Fase/tarea:** el dueño autorizó explícitamente trabajar en la aplicación principal (esta
  autorización aplica a este trabajo; no elimina la regla de pedir autorización para futuras
  integraciones no solicitadas). Se revisó el arte femenino, la máscara existente y los cambios
  locales de Buffy antes de modificar archivos; no se limpiaron ni revirtieron cambios ajenos.
- **Resultado:**
  1. Se conservó la ilustración original y se ajustó la geometría del visor femenino: la fuente
     de 1536×1024 conserva proporción y se centra en una ventana de 1044×1024, igualando la escala
     visual del modelo masculino sin deformar la anatomía. La selección por toque/clic compensa el
     recorte horizontal para consultar el píxel anatómico correcto.
  2. Se regeneraron las máscaras masculina y femenina mediante `scripts/build-body-map-mask.mjs`.
     El generador ahora refina las regiones dentro de compartimentos delimitados por el line-art,
     deja las zonas ambiguas neutrales en lugar de asignarles una familia por adivinanza, y evita
     que el trapecio posterior se extienda al cabello por la diferencia entre figuras. Los
     overlays revisados muestran las 13 familias representadas; las zonas no mapeables permanecen
     sin pintar. La asignación sigue siendo una transferencia geométrica desde la máscara
     masculina, no un trazado anatómico validado clínicamente.
  3. No se cambió el significado de las lentes ni la fuente de puntaje. La lente de fuerza basada
     en una norma externa publicada permanece pendiente de evidencia y diseño; este mapa conserva
     los modos actuales de TrainingLab.
- **Archivos de esta intervención:** `traininglab/apps/desktop/src/features/stats/BodyMap.tsx`,
  `traininglab/apps/desktop/src/index.css`, `scripts/build-body-map-mask.mjs`,
  `traininglab/apps/desktop/public/traininglab-body-map-regions.png`,
  `traininglab/apps/desktop/public/traininglab-body-map-woman-regions.png`. Los PNG de origen no
  se modificaron. Overlays temporales revisados: `tmp/review/male-app-refined-overlay.png` y
  `tmp/review/woman-app-refined-overlay.png` (directorio gitignored).
- **Verificación:** TrainingLab `./node_modules/.bin/tsc -b` → EXIT 0; `pnpm exec vite build
--base=./` → EXIT 0; desde `fitness-ecosystem/`, `pnpm exec vitest run
tests/training/test_body_map.test.ts` → 22/22 PASS; generador ejecutado para ambos cuerpos,
  con las 13 IDs presentes en el censo.
- **Estado Git:** rama `main`, HEAD `9c6af32`; el repositorio ya contenía numerosos cambios
  locales sin commit de Buffy y del dueño. Esta entrega no está staged ni committeada; conservar
  el resto del árbol tal como está.
- **Pendiente / límite:** validar el mapa visualmente en TrainingLab en viewport real de teléfono
  y escritorio, comprobar selección táctil en figura femenina y revisar de forma anatómica las
  áreas neutrales/mapeadas. Antes de presentar el mapa como fuerza relativa, implementar una fuente
  externa publicada que respalde variables y metodología; no reutilizar estímulo o volumen para
  simularla.
- **Siguiente paso seguro:** abrir Progreso en PC y móvil, cambiar entre figuras y seleccionar
  varios músculos; reportar los hallazgos visuales sin alterar la fuente de datos del mapa.

## 2026-10-01 (m) — Compartimentos anatómicos y ejercicios objetivo

- **Fase/tarea:** completar zonas sin color nombradas por el dueño (serrato sobre costillas,
  pared/oblicuos abdominales y porciones visibles del cuádriceps) y ofrecer ejercicios correctos
  al explorar esos grupos; alcance limitado al mapa y su detalle, no al rediseño general.
- **Base anatómica/catalográfica:** OpenStax distingue el recto, oblicuos superficial/intermedio
  y transverso profundo; por eso la ilustración superficial no pretende delinear el transverso como
  músculo visible. La zona costal se identifica como serrato anterior. Las sugerencias consultan
  el catálogo compartido y muestran solo ejercicios con intensidad primaria (3); son etiquetas de
  catálogo, no lecturas EMG ni prueba de activación individual.
  Referencias consultadas: [OpenStax, abdominal wall](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax),
  [push-up plus y serrato](https://pmc.ncbi.nlm.nih.gov/articles/PMC6863690/),
  [EMG de recto abdominal y oblicuo externo](https://pmc.ncbi.nlm.nih.gov/articles/PMC9505236/).
- **Resultado:**
  1. El generador de máscara refina los píxeles dentro de compartimentos del line-art y ahora
     permite unos pocos centroides anatómicos revisados por figura, con tolerancia de 12 px; la
     silueta y sus líneas siguen siendo la barrera. Se rellenan los compartimentos frontales
     pertinentes de serrato, oblicuos/recto y cuádriceps; las áreas aún no identificables continúan
     neutrales. Máscaras de ambos modelos regeneradas. La vista calórica de estos subsectores
     conserva la señal agregada de familia (pecho/core/cuádriceps); no se ha creado un score local
     que los registros actuales no sustentan.
  2. Al seleccionar pecho, core o cuádriceps, Progreso ofrece foco en serrato anterior, recto
     abdominal, oblicuos o cuádriceps como grupo y una selección breve de ejercicios cuyo
     catálogo registra esa estructura como primaria. Se conserva la etiqueta de intensidad 3;
     el transverso profundo no se pinta como visible y los vastos/recto femoral no se puntúan por
     separado, pues catálogo y máscara actuales no dan esa resolución.
  3. Se añadió nota localizada: sugerencias de catálogo ≠ EMG de una serie; heatmap agregado ≠
     estímulo medido independientemente por cabeza muscular.
- **Archivos:** `scripts/build-body-map-mask.mjs`, `traininglab/apps/desktop/public/*body-map*-regions.png`,
  `traininglab/apps/desktop/src/features/stats/anatomy.ts` (nuevo), `BodyMap.tsx`, `lib/i18n.ts`,
  `src/index.css`, `tests/training/test_anatomy_focus.test.ts` (nuevo), y este handoff. Overlays
  revisados: `tmp/review/male-focused-final.png` y `tmp/review/woman-focused-final.png`.
- **Verificación:** generador produjo ambas máscaras y reportó las 13 familias; overlays
  revisados a 1044×1024 (hombre) y 1536×1024 (mujer). `pnpm exec vitest run
tests/training/test_anatomy_focus.test.ts tests/training/test_body_map.test.ts` → 26/26 PASS;
  TrainingLab `./node_modules/.bin/tsc -b` → EXIT 0; `pnpm exec vite build --base=./` → EXIT 0.
- **Estado Git:** rama `main`, HEAD `9c6af32`; árbol ya tenía trabajo local amplio de Buffy y del
  dueño. No staged/commit/push. Preservar todos los cambios fuera de los archivos listados.
- **Límite pendiente:** referencia de fuerza publicada por músculo sigue fuera de esta entrega;
  el score continúa en familias actuales. Verificar la interacción de focos y las máscaras en
  Safari/iPhone al tocar el mapa. No describir sugerencias del catálogo como resultados EMG ni
  colorear transverso profundo o cabezas del cuádriceps por separado.
- **Siguiente paso seguro:** revisar en Progreso el serrato, ambos oblicuos y cuádriceps en ambos
  modelos; si una asignación del compartimento cae fuera de su contorno en el dispositivo real,
  ajustar solo la semilla de ese compartimento y repetir overlay + pruebas focales.

## 2026-10-01 (n) — Ajustes frontend de calidad de vida PC/móvil

- **Fase/tarea:** revisión de UX responsive del TrainingLab conforme a
  `docs/plan_evaluacion_qa_ui_ux.md`, `docs/UI_DESIGN.md` y `docs/TRAININGLAB_UI_PLAN.md`;
  centrada en el registro ZEN, consistencia ES/EN y verificación de escritorio/teléfono.
- **Resultado:** se corrigió texto literal de claves internas que aparecía en la guía y la
  tabla ZEN. En móvil, el selector de esfuerzo ahora es opcional y plegado por defecto; la
  acción `Registrar serie` queda en el flujo normal y no tapa su resumen. Al enfocar carga o
  repeticiones, la acción vuelve a sticky para quedar disponible mientras se escribe. El
  auditor de navegador ya sigue Semana como destino propio, cubre la navegación actual de seis
  destinos y los breakpoints responsive.
- **Cambios:** `traininglab/apps/desktop/src/features/today/ZenSession.tsx` y
  `src/index.css` (selector de esfuerzo + acción mobile sin solape); `src/lib/i18n.ts`
  (cadenas ES/EN de guía, tabla y esfuerzo); `tests/training/test_traininglab_i18n.test.ts`
  (regresión); `scripts/audit-app-behavior.mjs` (navegación semana, chequeo de claves, estados
  del selector/CTA, responsivo 320–1440 y timeout finito de navegación); `docs/UI_DESIGN.md`,
  `docs/TRAININGLAB_UI_PLAN.md`, `docs/plan_evaluacion_qa_ui_ux.md`, `ROADMAP.md` y este
  handoff.
- **Verificación:** desde `fitness-ecosystem/`, `pnpm test` → **907/907, 59 archivos, EXIT 0**;
  en `traininglab/apps/desktop/`, `./node_modules/.bin/tsc -b` → EXIT 0 y
  `pnpm exec vite build --base=./` → EXIT 0; `node --check scripts/audit-app-behavior.mjs`
  → EXIT 0; auditor `node scripts/audit-app-behavior.mjs --base http://localhost:8090` →
  **97 PASS / 0 FAIL**, consola limpia. Viewports Chromium: desktop 1440×900 y móvil
  390×844, más shell a 320, 360, 390, 414, 768, 1024, 1280 y 1440 px; seis rutas sin
  overflow a 390 px. Evidencia en `tmp/audit-behavior/13-tl-movil-zen.png`,
  `03-tl-desktop-tras-serie.png`, resultados en `tmp/audit-behavior/results.json` (gitignored).
  La auditoría usó el servidor ya activo en `:8090` y contextos Playwright temporales; no se
  tocó su proceso ni datos privados. Un barrido estático adicional confirmó que todas las
  claves de traducción usadas como literales están definidas.
- **Estado Git:** el árbol ya tenía numerosas modificaciones sin commit de Buffy/dueño antes
  de esta intervención. Solo se editaron las secciones/rutas aquí listadas; se preservó el
  resto. Rama `main`, HEAD informado previamente `9c6af32`; sin stage, commit ni push.
- **Pendiente / decisión del dueño:** no se probó en dispositivo físico ni Safari iOS; la
  apertura/cierre del teclado real y su geometría `visualViewport` requiere una comprobación
  del dueño por LAN. Sin build Tauri en esta sesión. No hubo prueba con personas; esto es
  verificación automática + revisión heurística de capturas.
- **Siguiente paso seguro:** abrir `#/sesion` por LAN en el iPhone, enfocar peso/reps y confirmar
  que el teclado no cubra `Registrar serie` ni el descanso; capturar el resultado y añadirlo
  al handoff. Después, tratar los medios ausentes de las fichas como seguimiento separado P2.

## 2026-10-01 (o) — Backend: contrato del modelo de decisión tipado (clase LAYA) + tubería de entrenamiento

- **Fase/tarea:** Fase C (IA local). Investigación profunda de la familia LAYA y puesta en
  marcha del **modelo de decisión propio**, para que la app deje de depender de un LLM salvo
  para *narrar* la decisión (opcional). No se tocó interfaz.
- **Resultado:**
  1. **Contrato tipado implementado** en `bodylab/core/training/src/laya.ts` (nuevo, exportado
     desde `core/training/index.ts`, 25 pruebas). Renderiza el estado como documento acotado
     (1800 caracteres, truncado por líneas completas, bandera `truncated`), construye el
     conjunto de preguntas `choice`/`score` **sin superar nunca 20 opciones** (techo medido de
     la familia), y traduce las respuestas a `BuildSessionInput.modelScores` — la costura que
     ya existía. El suelo determinista sigue mandando: el modelo solo produce puntuaciones.
  2. **`noul` no se usa**: su cabeza puede seguir sus propias etiquetas `false:`/`true:`
     (incidencia #156). Se sustituye por un `choice` A/B con claves neutras.
  3. **Tubería de entrenamiento** en `ml/laya/` (nuevo, 38 pruebas pytest): espejo en Python
     del contrato, constructor de conjuntos desde el CSV real de la app, etiquetador débil,
     métricas publicadas, suelo determinista y bucle **RLCD** con calibración de temperatura.
  4. **Fixture dorado** `ml/laya/tests/golden_state.json` generado desde la implementación
     TypeScript real y bloqueado desde **los dos idiomas**: es lo que impide que el
     entrenamiento derive en silencio respecto a lo que la app envía en inferencia.
- **Cambios:** `bodylab/core/training/src/laya.ts`, `bodylab/core/training/src/index.ts`,
  `tests/training/test_laya_contract.test.ts`, `ml/laya/**` (paquete, CLI, pruebas, README),
  `.gitignore` (ignorados de Python; `ml/laya/data` y `ml/laya/runs` fuera de git),
  `docs/LAYAS_MODELO_DECISION.md` (nuevo informe), `ROADMAP.md` y este handoff.
- **Verificación (real, ejecutada):**
  - `pnpm test` → **932/932, 60 archivos, EXIT 0** (eran 907/59: +25 del contrato nuevo).
  - `pnpm typecheck` → EXIT 0 · `pnpm lint` → **0 avisos / 0 errores**.
  - TrainingLab `./node_modules/.bin/tsc -b` → EXIT 0 (es más estricto que el del repo:
    detectó un parámetro sin usar que `pnpm typecheck` no vio).
  - `prettier --write` aplicado a los dos archivos nuevos de TypeScript.
  - `ml/laya`: `pytest tests -q` → **38/38, EXIT 0**, con **Torch 2.14.1+cpu** instalado
    (rueda CPU: `cuda False`). Incluye el **bucle RLCD real**: la regla de puntuación es
    estrictamente propia (reportar la verdad gana a cualquier perturbación) y el ruido de
    exploración **pierde recompensa en media**.
  - Línea base **antes** de entrenar: `cli.py evaluate --model none` sobre el corpus
    sintético (400 casos, 1 759 decisiones) → accuracy 0,7419, ECE 0,2581.
    **El ECE es `1 − accuracy` por construcción** (el suelo responde con probabilidad 1,0):
    está para mostrar por qué hace falta un modelo calibrado, no para compararse. Y el
    0,7419 es sobre datos **sintéticos**: verifica la tubería, no dice nada del producto.
- **Estado Git:** rama `main`, HEAD `9c6af32`; el árbol ya tenía trabajo local amplio de Buffy,
  del dueño y de Chatty. Solo se tocaron las rutas listadas. **Sin stage, commit ni push.**
- **Dos decisiones que el dueño debe conocer:**
  1. **Python para entrenar, TypeScript para ejecutar. Rust no entra** (la receta depende de
     `laya.common` + PyTorch; portar RLCD a Rust quedaría por detrás de la receta publicada).
  2. **Unsloth Studio no puede entrenar esto**: está orientado a LLM autorregresivos con
     LoRA/QLoRA, y LAYA es un encoder bidireccional entrenado con RLCD. Unsloth se reserva
     para el LLM local opcional del nivel 3 (el que narra).
- **Límite duro encontrado:** **Vulkan no es una vía viable y no se puede prometer.** PyTorch no
  tiene backend Vulkan y ONNX Runtime nunca publicó el suyo (petición abierta, #21917). Las vías
  reales son CUDA (NVIDIA — la de esta máquina), XPU (Intel), MPS (Apple), CPU y **DirectML**
  para inferencia en Windows sobre cualquier GPU DirectX 12.
- **Bloqueadores / pendiente:** **no hay datos reales en el repo** (el registro es privado), así
  que no hay entrenamiento real ni medición «después». Además, 6 GB de VRAM (RTX 3050) **no
  aguantan un ajuste fino completo de 421 M** con AdamW (≈5,1 GB solo en pesos, gradientes y
  estados, antes de activaciones): la ruta recomendada es **Kaggle 2×T4**, que es gratis y es
  la que el notebook de referencia soporta. **LoRA/QLoRA y la exportación ONNX no están
  implementados** (la bandera existe; la función no).
- **Puertas que siguen CERRADAS:** el heatmap de fuerza frente a referencia externa publicada
  y la integración del prototipo independiente del mapa. Este trabajo decide **qué ejercicio**,
  nunca **cuánta fuerza**.
- **Siguiente paso seguro:** exportar el registro real (`Ajustes → Exportar CSV`) más el mapa de
  debilidad de BodyLab, construir `dataset.jsonl` con `python cli.py build --csv … --weakness …`,
  y volver a medir el suelo sobre **esos** datos antes de lanzar ningún entrenamiento. El
  protocolo completo y los números están en `docs/LAYAS_MODELO_DECISION.md` §§9–10.

## 2026-10-01 (p) — Decisión sobre LAYA (NO se integra) y publicación de v1.0.0-beta.7

- **Decisión del dueño:** «si crees que LAYA aportará algo positivo y significativo, impleméntalo;
  si no, sigue con el plan de interfaz». **Veredicto: no se integra en tiempo de ejecución.** Las
  mejoras de UI quedan **pendientes para la próxima sesión** por indicación explícita del dueño.
- **Por qué NO se integra (no repetir esta discusión sin datos nuevos):**
  1. **Zero-shot es peor de lo que ya hay**: 0.362 frente a 0.461 de la línea base de clase
     mayoritaria. Sin ajustar, elegiría peor ejercicio que la bandida actual. El 0.766 que circula
     es de un checkpoint ajustado con el propio conjunto del benchmark.
  2. **La evidencia independiente no es uniforme**: en la réplica pareada de Anthus (140 etiquetas
     idénticas) LAYA **pierde** contra JEV, 0.722 frente a 0.768.
  3. **Congelar el encoder pierde contra no entrenar** (0.659 frente a 0.722), y 6 GB de VRAM no
     aguantan el ajuste completo.
  4. **No hay datos reales para ajustar** y el despliegue cuesta 647–808 MB de pesos más sidecar
     Python o ONNX INT8 — en una app cuyo argumento es ser offline y sin backend.
  5. **La necesidad real que LAYA resolvería es una sola y pequeña**: leer *«qué me duele hoy»*.
     Se cubre con **un campo estructurado** que encaje en `jointStress`/`spineLoad`, rasgos que
     `session.ts` **ya usa**, a coste cero y cero bytes. Esa es la recomendación accionable.
- **Qué se conserva** (coste cero en ejecución, valor real como suelo con nombre y pruebas): el
  contrato `bodylab/core/training/src/laya.ts` y la tubería `ml/laya/`.
- **Puerta para revisar la decisión:** un checkpoint ajustado que gane en acierto **al suelo
  determinista** y no empeore el ECE sobre una partición temporal del registro real. Antes, no.
- **Publicación v1.0.0-beta.7 (hecha):** BodyLab sube de `1.0.0-beta.6` a `1.0.0-beta.7`
  (`tauri.conf.json`, `Cargo.toml`, `Cargo.lock`); TrainingLab se mantiene en `0.2.0`.
- **Verificación local previa al push (exigida por el dueño):**
  - `pnpm install --frozen-lockfile` → **EXIT 0** (el paso que más rompe CI; lockfile en sync con
    los manifiestos modificados, 16 proyectos).
  - `pnpm check` → **EXIT 0**: 932 root (60 archivos) + 115 web (8 archivos) + **21 e2e**.
  - Un primer `pnpm check` falló por **carga local** (timeout de 5 s en `page-smoke` de BodyLab);
    aislada tarda **390 ms**. No es un fallo real: no lo persigas.
  - Tauri local: `bodylab.exe` 1.0.0-beta.7 y **`BodyLab_1.0.0-beta.7_x64-setup.exe`** generados.
    El código de salida 1 es **solo** la firma del actualizador (la clave privada vive en CI).
- **Estado Git:** commit **`a419754`** (90 archivos, 14 838 inserciones) empujado a `main`;
  tag anotado **`v1.0.0-beta.7`** empujado → dispara `release.yml` (compila ambos instaladores).
  Excluido a propósito: `Modelo2D_Woman.png` en la raíz del repo (fichero suelto, no es fuente).
  **La identidad de git no está configurada**: se usó `git -c user.name=… -c user.email=…` con el
  autor del historial (`SCP-00`), sin tocar la configuración.
- **Pendiente / ojo:** `gh` **no está autenticado** (`gh auth login` o `GH_TOKEN`), así que no se
  pudo vigilar el CI ni la release desde aquí. Y si el secreto `TAURI_SIGNING_PRIVATE_KEY` no está
  en el repositorio, la release publica instaladores **sin firmar y sin `latest.json`**, de modo que
  los usuarios de beta.6 **no recibirán la actualización** por el canal automático.
- **Siguiente paso seguro:** confirmar en la pestaña Actions que CI y la release de
  `v1.0.0-beta.7` terminan en verde y que los dos instaladores aparecen como assets; después,
  retomar el plan de interfaz (contraste medido en `tmp/audit-contrast/contrast.json`).

## 2026-10-02 — CI y release de v1.0.0-beta.7 vigilados hasta el final, y arreglar lo que salió rojo

- **Resultado:** `release.yml` y `CI` están **verdes** y la release **`v1.0.0-beta.7` está
  publicada con los DOS instaladores descargables**. Se encontraron y corrigieron **dos**
  causas rojas distintas, ambas ocultas por gestos anteriores del propio CI.
- **Cambios:**
  - `.github/workflows/release.yml` — el override sin firma de Tauri se pasa como **fichero**
    (`tauri-ci-unsigned.json`), nunca como JSON en línea; firmar exige clave **y** contraseña;
    se imprime node/pnpm/versión de tauri y se hace `exit $LASTEXITCODE` explícito.
  - `.github/workflows/ci.yml` — `check` pasa de `timeout-minutes: 20` a `45`.
  - `fitness-ecosystem/bodylab/apps/web/e2e/anatomy-xray.spec.ts` — espera a que el atlas
    esté vivo antes de volver a desactivar el modo X; presupuesto de 10 min por `describe`.
- **Causa roja 1 — la release moría en 1 segundo (run 36939904641):** `pnpm tauri` ejecuta el
  script `tauri` de `package.json`, así que pnpm entrega los argumentos extra a `cmd.exe`, que
  **elimina las comillas internas** del JSON de `--config` y la CLI recibe
  `{bundle:{createUpdaterArtifacts:false}}`, que clap rechaza antes de compilar nada. Un
  argumento en línea no sobrevive a un shell; **una ruta de fichero sí**. Comprobado en local:
  el mismo comando con fichero genera el instalador (EXIT 0).
- **Causa roja 2 — el job `check` no fallaba, expiraba (y eso tapaba un fallo real):** GitHub
  reporta como **`cancelled`** cualquier job que supera su `timeout-minutes`, y por eso
  *todos* los CI rojos recientes de este repo eran «cancelled» a los 20 min. Al subir el
  límite, `pnpm check` corrió 20,8 min y **falló de verdad**: dos tests e2e de
  `anatomy-xray.spec.ts` (en + es). El toggle de Rayos X está `disabled={xrayLoading}` mientras
  decodifican los ~8 MB del atlas, pero el panel de capas monta en cuanto el modo se activa,
  **antes**: el test esperaba a los sliders, daba por cargado el atlas y pulsaba un botón
  **deshabilitado**, así que Playwright se quedaba bloqueado en su comprobación de
  «enabled» hasta agotar el test. Con GPU la ventana es ~1 s; con WebGL por software son
  **5,8 min (en) y 6,2 min (es)** contra un presupuesto de 270 s. El test ahora espera el
  contrato real del producto: el toggle se rehabilita cuando el atlas está vivo.
- **Verificación:**
  - Local: `npx playwright test e2e/anatomy-xray.spec.ts` → **2 passed** (11,3 s / 7,3 s) sobre
    hardware real; `pnpm --filter web typecheck` → EXIT 0; `pnpm lint` → 0 avisos / 0 errores.
  - CI run **37021236333** (commit `bb89cd2`) → **los 4 jobs en verde**; `check` 20,5 min:
    60 archivos root + 8 web + **21 e2e en 13,5 min**, con los dos tests de Rayos X en verde.
  - Release `v1.0.0-beta.7` (run 37017104135) → **success**; el paso que antes moría en 1 s tardó
    **396 s**. Assets, los cuatro con HTTP 200 y cabecera `MZ` verificada:
    `BodyLab_1.0.0-beta.7_x64-setup.exe` (23 574 275 B) y `TrainingLab_0.2.0_x64-setup.exe`
    (15 540 359 B), más los alias estables `BodyLab-setup.exe` y `TrainingLab-setup.exe`.
- **Pendiente / decisión del dueño:**
  - **La release va SIN FIRMAR y sin `latest.json`**: los secretos `TAURI_SIGNING_PRIVATE_KEY` /
    `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` no están en el repositorio, así que **los usuarios de
    beta.6 no recibirán la actualización** por el canal automático.
  - **Aun con los secretos puestos, el autoactualizador seguiría sin ver beta.7:** el endpoint
    del producto es `releases/latest/download/latest.json`, y `/releases/latest` **excluye las
    prereleases**; hoy resuelve a `v1.0.0-beta.6` (la beta.6 se publicó como `prerelease: false`).
    Hay que decidir entre marcar una versión como release completa o apuntar el updater a una
    etiqueta concreta.
  - El fichero `anatomy-xray.spec.ts` son **12,0 min de los 13,5 min** de la suite e2e: es el
    coste dominante del job `check`. Candidato a ejecutarse por agenda y no en cada push.
  - **`gh` sigue sin credenciales en este equipo**; el dueño facilitó un PAT de ejemplo por el
    chat para leer los logs. **Ese token queda expuesto en la transcripción: revócalo.**
  - Sigue **aplazado por el dueño** para la próxima sesión: los tres fallos de contraste medidos
    en `tmp/audit-contrast/contrast.json` y conectar ese auditor al CI.
- **Puertas de aprobación:** siguen **CERRADAS** y no se han cruzado: el mapa de calor de fuerza
  frente a una referencia externa publicada, y la integración del prototipo independiente del
  mapa muscular. Esta nota es estado del proyecto, no autorización.
- **Estado Git:** `main` en `bb89cd2`; el tag **`v1.0.0-beta.7` se movió** de `a419754` a
  `bd13ca5` (decisión explícita del dueño) para que la release usara el workflow arreglado, y
  después `main` avanzó a `bb89cd2` con el arreglo del e2e. `Modelo2D_Woman.png` sigue sin
  rastrear a propósito.
- **Siguiente paso seguro:** decidir lo del canal de actualización (prerelease vs. etiqueta
  fija) y, si se firma, cargar los dos secretos; después, retomar el plan de interfaz con el
  contraste medido.
