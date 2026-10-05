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

## 2026-10-04 — Tauri 2 a la última estable en ambas apps, y el endpoint del updater

- **Resultado:** revisión de estado (sin commits nuevos en el remoto; `main` en `9e133b4`,
  árbol limpio salvo `Modelo2D_Woman.png` sin rastrear) y actualización del shell Tauri de
  las dos apps a la última estable: `tauri` 2.12.1, `tauri-build` 2.7.1,
  `tauri-plugin-opener` 2.7.0, `tauri-plugin-updater` 2.13.1,
  `tauri-plugin-notification` 2.5.1 y un único `@tauri-apps/cli` 2.12.1. Antes BodyLab
  arrastraba un minor entero de retraso (tauri 2.11.5) y el monorepo instalaba dos CLIs
  distintos (2.11.4 y 2.12.0). Se arregló además el canal de actualización.
- **Cambios:**
  - `fitness-ecosystem/bodylab/apps/desktop/src-tauri/Cargo.toml` y
    `fitness-ecosystem/traininglab/apps/desktop/src-tauri/Cargo.toml` — versiones de crate
    al minor vigente; `rust-version` de `1.77` a `1.90` (Tauri 2.12 declara `rust-version =
    "1.90"`, el valor anterior era ya falso).
  - `fitness-ecosystem/bodylab/apps/web/package.json`,
    `fitness-ecosystem/bodylab/apps/desktop/package.json`,
    `fitness-ecosystem/traininglab/apps/desktop/package.json`,
    `fitness-ecosystem/pnpm-lock.yaml` — CLI y plugins npm al alza; el `version` del
    package.json del escritorio BodyLab decía `1.0.0` mientras `tauri.conf.json` decía
    `1.0.0-beta.7`, ahora ambos coinciden.
  - `fitness-ecosystem/bodylab/apps/desktop/src-tauri/tauri.conf.json` — versión
    `1.0.0-beta.8` y `plugins.updater.endpoints[0]` apuntando a la etiqueta explícita
    `releases/download/v1.0.0-beta.8/latest.json` en vez de
    `releases/latest/download/latest.json`, que devolvía 404: `/releases/latest` excluye
    prereleases y por tanto resolvía a `v1.0.0-beta.6`, donde ese archivo no existe.
    Apuntar a la etiqueta antigua tampoco habría servido (beta.7 ya está publicada y sin
    firmar), así que el bump de versión es parte del arreglo y no un cambio aparte.
  - `.github/workflows/release.yml` — el encabezado documenta el invariante: versión,
    endpoint y `Cargo.toml` se suben los tres a la vez.
- **Verificación:** `pnpm typecheck` EXIT 0 · `pnpm lint` 0 avisos / 0 errores ·
  `pnpm test` 932 tests / 60 archivos OK · `vitest run` (web) 115 OK · `npx tsc -b`
  (TrainingLab) EXIT 0 · `cargo check --locked` en ambos `src-tauri` EXIT 0 ·
  `pnpm tauri build` TrainingLab EXIT 0 → `TrainingLab_0.2.0_x64-setup.exe` (15.319.737 B) ·
  `pnpm tauri build --config tauri-ci-unsigned.json` BodyLab EXIT 0 →
  `BodyLab_1.0.0-beta.8_x64-setup.exe` (23.349.664 B, cabecera PE `4d5a`) · Playwright
  21/21 OK en 40,4 s. Una primera ejecución de `vitest run` falló un caso de
  `page-smoke.test.tsx`; no se reprodujo en 8 ejecuciones posteriores (4 en serie y 3 en
  paralelo bajo carga) y ese test no referencia Tauri, así que es un flake de la ejecución
  en frío (42,9 s), no del cambio.
- **Pendiente / decisión del dueño:**
  1. **La clave de firma del disco no abre el feed.** `.updater-key` es una clave rsign
     válida (mismo formato, longitud y prefijo que una recién generada), pero
     `.updater-key.password` no la descifra: probé las dos formas plausibles (41 caracteres
     y los 42 bytes con el salto final) y ambas dan `Wrong password for that key`. O sea
     que cargar los dos secretos tal cual están en el disco **no** basta. No se puede
     determinar si `.updater-key` es la contraparte del `pubkey` de `tauri.conf.json`
     (el identificador va cifrado dentro del secreto y no se puede leer sin la contraseña).
     Como nunca se publicó ninguna release firmada, regenerar el par no deja a nadie sin
     auto-actualización: es la vía limpia si la contraseña original está perdida.
  2. **`Cargo.lock` está en `.gitignore` (`fitness-ecosystem/.gitignore:45`) y ningún
     workflow usa `--locked`.** Cada build de CI y de release resuelve dependencias de
     nuevo; esa es justamente la causa de que BodyLab se quedase atrás sin que nada lo
     delatara. Versionarlo daría builds reproducibles.
  3. Sigue diferido lo de antes: los 3 fallos de contraste medidos, mover
     `anatomy-xray.spec.ts` (12 de los 13,5 min del job `check`) a un workflow
     programado, y rotar el PAT que quedó expuesto en el chat.
- **Siguiente paso seguro:** publicar `v1.0.0-beta.8` desde la etiqueta una vez que el
  dueño resuelva la clave de firma; el endpoint y la versión ya apuntan a esa etiqueta, así
  que en cuanto exista un `latest.json` firmado el chequeo funciona sin tocar nada más.

## 2026-10-04 — Importador de Symmetry a 20/20 sesiones contra cabecera (E2E)

- **Resultado:** el importador OCR (`scripts/import-symmetry.mjs`) cierra el análisis E2E
  con **las 20 sesiones cuadrando exactamente con el contador de series de la propia
  cabecera de Symmetry** (425 series recuperadas; antes: 410 con 7 sesiones descuadradas).
  Se aplicaron las correcciones del dueño: (a) **último día de gimnasio = 2026-09-26** →
  cada sesión lleva `location: "gym"` (15) u `"home"` (5), y los pesos altos de máquina
  (leg press 204,1 kg, Smith 145–163,3 kg, aducción 77,1 kg) son datos reales de gimnasio,
  con tope de 28,6 kg en casa; (b) **convención de peso**: en ejercicios de DOS mancuernas
  Symmetry guarda el TOTAL (laterales 2×12,5 → 25) y se importa la mitad por mancuerna
  (`weightKg` dividido en 70 series, con el crudo en `symmetryWeightKg` y
  `weightBasis: "bilateral-db-total"`), los unilaterales de una mancuerna (remo a una
  mano, 25 kg) y el resto de implementos (barra, máquina, cable, peso sostenido) se
  quedan tal cual (`as-recorded`). La tabla de clasificación es explícita en el script
  y el dueño puede vetar ejercicio a ejercicio.
- **Bugs corregidos en esta iteración (todos verificados contra la cabecera):**
  1. **Series con hora** (`Set Time`: `1 01:00` — Plank, Dead Hang, estiramientos,
     isométricas de cuello) no se parseaban: explicaban 17 series perdidas en 6 sesiones
     (−8 el 04/10, −3 el 29/09, −2 el 25/09 y el 24/09, −1 el 05/09, −1 el 24/09).
     Ahora se parsean con `durationSec` (TLSet no tiene campo de duración).
  2. **Cabecera de columna corrupta promovida a ejercicio** (`sel Keps` ← "Set Reps"):
     añadía 4 sets DUPLICADOS el 02/10 (+4). Fix: rechazo por distancia de edición ≤2
     contra frases de cabecera, más `set time`/variantes en `HEADER_NOISE`.
  3. **Stats sin kg** (`39min 17`, sesión solo de peso corporal del 29/09): el contador
     de cabecera de esa sesión se perdía; fallback dedicado → también verificable.
  4. **Decimal perdido transesión**: `771 → 77,1` (aducción) — el ancla local ya no
     basta (el 08/09 todas las series salen como 771); ahora hay ancla global por
     ejercicio con sesiones anteriores. 5 reparaciones en total.
  5. **Líneas de serie tolerantes**: `1 40.8 kg x reps` (reps ilegible) y
     `1 N.3 kg x 8 reps` (peso ilegible) ahora parsean con `null` en vez de perderse.
  6. **`0 kg` explícito de Symmetry → `null`** (peso corporal, coherente con las series
     sin kg) — 70 series BW.
  7. **Limpieza de nombres**: token inicial en minúscula (`e Bicycle Crunch`), de dos
     letras (`Bs Incline Bench Press`), solo símbolos (`[ -.] `, `§ | `, `©» `), y
     guardas para líneas con unidades (`ko x`) o `rane`.
- **Recuperación de dígitos ilegibles (el dueño autorizó corregir a mano):**
  re-OCR a 4× en tres modos (psm 4/6/11) + recorte de la línea + **comparación XOR de
  píxeles del glifo contra los dígitos de referencia de la misma tipografía** (banco de
  las 45 capturas): `1 40.8 kg x ?` → **11 reps**; `1 N.3 kg x ?` → **11,3 kg**;
  `2 31.8 kg x ?` → **9**; y 5 sets con **0 repeticiones literales** en la captura
  (Pause Squat ×4 el 08/09, remo a una mano F el 24/09; XOR 0,000–0,008 vs 294
  referencias del dígito 0, glifo de un solo dígito). Quedan registrados en `ocrFixes`.
  Las sondas de diagnóstico (`scripts/.probe-*`) se borraron tras usarse.
- **Verificación (comandos reales):**
  - `node scripts/import-symmetry.mjs ../IMPORT_SYMMETRY --out .cache/symmetry-import.json`
    → `set counts: all 20 verifiable sessions match the header` · 425 series ·
    35 bloques solapados cosidos.
  - Idempotencia: dos corridas seguidas → MD5 idéntico `f48b713e65fe3b62e965f2b3067021df`.
  - Auditoría del JSON: `location` correcto 20/20, conteos 20/20, 70 conversiones ÷2
    con matemática exacta, ejemplos del dueño verificados (laterales 25→12,5 · remo
    25→25), sin basura en nombres (salvo el personalizado conocido), sin `0 kg`.
  - `node scripts/verify-symmetry-overlap.mjs ../IMPORT_SYMMETRY` → 44 pares,
    control #1↔#45 XOR 0,2106 separado de los solapes reales (mejor 0,0000).
    De los 19 cortes entre sesiones, 18 aparecen como discontinuidad (12 con la
    firma típica 96% @~60 px, XOR ~0,25; el resto, por cabecera nueva o hueco de
    tiempo) y el par #29→#30 comparte contenido exacto. De los 25 pares
    intra-sesión: 10 exactos (XOR≤0,018), 10 con XOR 0,02–0,08 y 5 con 0,08–0,29
    (saltos de scroll de más de una pantalla entre tomas). Ninguna captura falta:
    cualquier hueco con datos perdidos rompería el cuadre contra cabecera y todo
    cuadra.
  - `pnpm lint` → 0 avisos / 0 errores.
- **Pendiente / decisión del dueño:**
  1. **Revisar la tabla bilateral ÷2** (7 ejercicios: Alterna bíceps, Bíceps bilateral
     con rotación, Apertura con mancuernas, Encogimientos, Press martillo tumbado,
     Laterales, Press de hombro sentado — ver `BILATERAL_DB` en el script). Los
     crunchs con mancuerna (`Dumbbell Oblique Crunch`, `Sit Up (Weighted)`,
     `Weighted Crunch`) se dejaron **sin dividir** por ser una sola mancuerna
     sostenida; si alguno era en realidad de dos, se añade a la tabla.
  2. **`pa® (Maquina)`** (03/09, 18 kg ×4, junto a "Elevación de pierna tumbado con
     palanca"): nombre personalizado en español que el OCR no descifra; hace falta
     el nombre real para el mapeo a `exerciseId`.
  3. Las 5 series con 0 reps: confirmar si Symmetry mostraba realmente 0 (entradas sin
     ajustar el contador). No afectan volumen ni 1RM (Epley las ignora).
  4. Título/desfecha con día de la semana erróneo en 7 sesiones = error de huso de
     Symmetry (ya verificado en imagen, se replica tal cual) y `11min` dudoso del
     11/09 (su título dice "Duración real 52 min").
  5. Mapeo a `exerciseId` de los 58 nombres (22 sin curar) y decisión de commit.
- **Git:** HEAD `f6c4aef` (sin push). Sucios sin commitear: `.gitignore` (ignora
  `IMPORT_SYMMETRY/`, `*.traineddata`, `.cache/`), `fitness-ecosystem/package.json` +
  `pnpm-lock.yaml` (deps `pngjs`/`tesseract.js` del importador) y sin rastrear los
  tres scripts nuevos (`import-symmetry`, `map-symmetry-exercises`,
  `verify-symmetry-overlap`); `.cache/symmetry-import.json` queda ignorado y
  `Modelo2D_Woman.png` es preexistente y no se tocó. Nada se ha commiteado.
- **Siguiente paso seguro:** que el dueño revise la tabla ÷2 y los puntos 1–3; después,
  commit del trío de scripts + deps + `.gitignore` (todo local, sin datos personales)
  y el mapeo de ejercicios al catálogo.

## 2026-10-04 — Encargo del dueño: histórico Symmetry a TrainingLab + volumen semanal (documentación)

- **Fase/tarea:** Fase 2B del brief (T1–T4); esta sesión cubrió el primer punto del
  pedido del dueño: **actualizar TODA la documentación para las siguientes sesiones**.
- **Resultado:** la documentación queda alineada con el nuevo encargo en cuatro
  fuentes, sin tocar código:
  - `ROADMAP.md` — cabecera a **2026-10-04 (b)**; fila de snapshot «Histórico
    Symmetry» (20/20, 425 series); bloque **«Histórico Symmetry + volumen semanal»**
    en Fase B con las tareas T1 (curar ÷2 + mapeo de 58 nombres → `exerciseId`),
    T2 (carga como sesiones reales: ids deterministas, `warmup` ← W, D/F en
    `notes`, `durationSec`, vista previa + combinado), T3 (revisión de interfaz) y
    T4 (volumen semanal en Progreso); líneas de historial 2026-10-04 (a) Tauri y
    (b) importador E2E.
  - `knowledge.md` — nueva sección **«Symmetry import»** (rutas, comandos, estado
    verificado, convención ÷2/per-mancuerna, gym/casa ≤26/09, badges, pendientes
    T1–T4) y las dos órdenes de script en el bloque de comandos.
  - `docs/BUFFY_IMPLEMENTATION_BRIEF.md` — nueva **Fase 2B** con el orden de
    ejecución T1–T4 y sus criterios, y decisión del dueño nº 6 (veto de la tabla
    ÷2) en §6. La Fase 3 (mapa muscular) y su puerta de aprobación **no se tocan**.
  - `docs/TRAININGLAB_UI_PLAN.md` — fase **P7** en §14 y pendientes (6)(7) en §15.
- **Pruebas:** los cambios son solo Markdown — no hay suite que ejecutar para ellos;
  verificación por grep de anclas (cabeceras insertadas y números de fase) y
  relectura de cada cambio. Sin cambios de código desde la última verificación verde
  del importador (20/20, MD5 idéntico, lint 0/0).
- **Decisiones/gates:** la tabla ÷2 **no está cerrada** hasta el veto del dueño
  (crunchs con mancuerna + `pa® (Maquina)`); la puerta del mapa muscular sigue
  cerrada; los datos personales siguen fuera de git (`IMPORT_SYMMETRY/`, `.cache/`).
- **Estado Git:** sin commits. HEAD `f6c4aef` (sin push). Sucios preservados:
  `.gitignore`, `fitness-ecosystem/package.json`, `pnpm-lock.yaml`, y ahora además
  los cuatro documentos de esta entrada + `knowledge.md` + `ROADMAP.md`.
  Sin rastrear: los tres scripts Symmetry, `.cache/symmetry-import.json` (ignorado)
  y `Modelo2D_Woman.png` (preexistente, no tocado).
- **Punto de reanudación:** tarea **T1** — abrir `scripts/map-symmetry-exercises.mjs`
  con los 58 nombres de `.cache/symmetry-import.json`, contrastar `BILATERAL_DB`
  contra los traits del catálogo (`loadType`, `unilateral`) y preparar la lista de
  decisiones del dueño (7 bilaterales ÷2, 3 crunchs sin dividir, `pa®`).
- **Siguiente paso seguro:** ejecutar el mapeo, producir la tabla curada
  nombre → `exerciseId` con los huecos marcados, y presentar al dueño la lista de
  vetos antes de tocar T2.

## 2026-10-04 — T1 curado + T2 carga en la app (Ajustes → Importar Symmetry)

- **Fase/tarea:** Fase 2B del brief, tareas T1 (curación/mapeo) y T2 (carga).
- **Resultado T1:** `scripts/map-symmetry-exercises.mjs` ahora lleva una tabla
  `CURATED` con los **58/58 nombres decididos explícitamente**: 45 con id de
  catálogo (14 son **propuestas vetables** que cruzan variante/equipo — p. ej.
  `Rowing Machine → seated-cable-row`, `Pause Squat → barbell-squat`) y 13 sin
  equivalente (crunchs, encogimientos, abducción de cadera en máquina, cuello,
  movilidad, `pa® (Maquina)`), que quedan con `exerciseId: null` y motivo —
  **nunca se inventa un id**. Validación automática: un id curado inexistente en
  el catálogo aborta el script. Resultado: **356/425 series (84%) con id, 35 ids
  distintos, 0 sin resolver**. Bug real encontrado y corregido: el array plano
  `session.sets` quedaba con `exerciseId: null` (solo se rellenaba
  `exercises[]`); ahora el script rellena ambos por nombre.
- **Resultado T2:** la app importa el JSON en **Ajustes → Datos → «Importar
  historial de Symmetry»**:
  - `traininglab/apps/desktop/src/lib/symmetry.ts` (nuevo, puro): JSON →
    `TLSet`/`TLSession` con **ids deterministas** (FNV-1a de contenido →
    reimportar es no-op vía `mergeById`), sets sin id de catálogo contados y
    descartados, `warmup` ← badge W, D/F en `notes`, `durationSec` para series
    con tiempo, timestamp a **mediodía local** del día de la sesión (el
    `T00:00Z` del OCR caería en el día anterior en UTC−4 y descolocaría las
    vistas semanales), `completedAt` = inicio + duración, y
    `title`/`location`/`source: "symmetry"` en la sesión.
  - `types.ts`: campos aditivos opcionales `TLSet.durationSec` y
    `TLSession.title|location|source` (registros/copias viejos no se ven
    afectados; `parseBackup` ya conservaba campos desconocidos).
  - `store.tsx`: acción `importSymmetry` con la misma semántica de fusión que
    la restauración de copias (nunca borra; settings intactos si el archivo no
    los trae); `SettingsScreen.tsx` + `i18n.ts`: botón, hint y 3 errores ES/EN.
- **Verificación (comandos reales):**
  - `npx vitest run tests/training/test_symmetry_import.test.ts` → **7/7**
    (determinismo, mapeo warmup/notas/tiempo, día local en cualquier TZ,
    rechazo de no-Symmetry, round-trip `parseBackup` con `dropped: 0`, merge
    idempotente).
  - Test temporal contra **el JSON real** (borrado después): 20 sesiones,
    **356 sets convertidos, 69 descartados sin id, 0 filas corruptas**, 12
    series con tiempo, 19 warm-ups, ids idénticos entre dos parses.
  - `pnpm test` → **939/939 (61 archivos)** · `npx tsc -b` (TrainingLab) → 0 ·
    `pnpm lint` → 0/0 · `npx vite build` → OK (1,11 s).
- **Decisiones/gates:** pendiente del dueño (no se ha importado nada en su app
  todavía): (1) veto de las 14 propuestas de mapeo; (2) lista de 13 huecos de
  catálogo (¿añadir crunch/encogimientos/abducción?); (3) tabla ÷2 (7 ejercicios
  bilaterales + los 3 crunchs sin dividir). La puerta del mapa muscular sigue
  cerrada.
- **Estado Git:** sin commits; HEAD `f6c4aef` (sin push). Además de los sucios
  previos (`.gitignore`, `package.json`, `pnpm-lock.yaml` y los docs), ahora
  cambian: `scripts/map-symmetry-exercises.mjs`,
  `traininglab/apps/desktop/src/lib/{types,symmetry,i18n}.ts`,
  `src/app/store.tsx`, `src/screens/SettingsScreen.tsx` (nuevo),
  `tests/training/test_symmetry_import.test.ts` (nuevo) y la caché
  `.cache/symmetry-import.json` (ignorada, ahora con ids).
- **Punto de reanudación:** presentar al dueño las tres listas de decisión
  (14 propuestas ÷13 huecos ÷7 bilaterales); después T3 (revisión de interfaz
  con datos importados reales) o T4 (volumen semanal en Progreso).
- **Siguiente paso seguro:** con el visto bueno, ejecutar en la app
  «Importar historial de Symmetry» con `.cache/symmetry-import.json` y verificar
  en Progreso/Historial que las 20 sesiones aparecen; después T4.

## 2026-10-05 — T1–T4 cerrados y verificados, datos reales importados en BodyLab, ambos installers reconstruidos

- **Fase/tarea:** cierre del bloque «Histórico Symmetry + volumen semanal» (Fase 2B,
  T1–T4) del encargo del dueño, más el encargo nuevo del 2026-10-05: **«compila mi
  aplicación de escritorio con estos cambios y mis datos verdaderos importados, también
  en BodyLab»**.
- **T1 · catálogo y mapeo:** los 13 huecos se cerraron **añadiendo 8 ejercicios** en
  `bodylab/core/exercises/src/catalog-expansion.ts` (`crunch`, `decline-crunch`,
  `oblique-crunch`, `dumbbell-shrugs`, `tricep-kickback`, `wrist-roller`,
  `hip-abduction-machine`, `hip-adduction-machine`) con sus `traits` en
  `traits-expansion.ts` → **143 → 151 ejercicios**. Las 9 curaciones correspondientes
  en `scripts/map-symmetry-exercises.mjs` cierran también la antigua propuesta de
  abducción de cadera. Resultado: **53 nombres con id (13 vetables), 410/425 series
  (96 %), 0 sin resolver** (antes 356/425 = 84 %). Pack LLM regenerado
  (`node scripts/build-llm-pack.mjs` → 151 ejercicios, 100 con media).
- **T2/T3 · importación ejecutada en la app:** Ajustes → Mis datos → «Importar historial
  de Symmetry» → *«Symmetry: 20 sesiones y 410 series fusionadas (15 filas descartadas,
  sin equivalente en el catálogo)»*; sets 248 → **658**; IndexedDB `traininglab` con
  **40 sesiones** (20 previas + 20 importadas). **Idempotencia probada en vivo:**
  reimportar el mismo archivo deja 658/40. Progreso tras importar: 40 sesiones, 50
  ejercicios distintos, 28 días entrenados, 505 sets / 220.616 kg / 437 kg por serie;
  Ejercicios: «151 ejercicios · 12 con indicaciones propias de variante».
- **T4 · volumen semanal:** `weeklyVolume(sets, weeks=8, now?)` en
  `traininglab/apps/desktop/src/features/stats/derive.ts` (lunes como inicio, warm-ups
  fuera, series de 0 kg cuentan como series, tonelaje de familia acredita una sola vez
  por serie, tendencia contra la **misma cantidad de días transcurridos** de la semana
  anterior con el umbral 10 % ya existente) + `WeeklyVolumeCard.tsx`
  (`data-testid="weekly-volume"`, 8 barras, kg de la semana, flecha de tendencia, top-5
  familias y descargo explícito «tonelaje registrado, no fuerza») en
  `src/screens/ProgressScreen.tsx`, con 11 claves `progress.weekly.*` ES/EN.
- **Datos reales en BodyLab (encargo nuevo):** nuevo `scripts/build-owner-import.mjs`
  → `.cache/bodylab-owner.json` + `.cache/bodylab-owner.mapping.json` (**ambos
  gitignorados**: datos personales en repo público). Perfil 76 kg · 1,76 m · nacimiento
  **2005-09-28** (dado por el dueño en la sesión; la edad la deriva `lib/age.ts`) · sexo
  masculino, y 10 mediciones: peso 76, muñeca 16,5, hombros 116, pecho 95, cintura 83,
  caderas 97, muslo izq/der 55 + **muslo genérico 55** (el Resumen y el mapa leen el
  tipo genérico; la simetría usa los lados) y pantorrilla 39.
  - Importado **por la interfaz real** (*Datos → Importar*, forma legacy `format:
    "bodylab"`), no inyectando en IndexedDB. Resultado en pantalla: «Datos importados
    correctamente», Resumen «Buenos días, Andy» con **cobertura 83 % (5/6)**, «Faltan 1
    medidas», edad cronológica **21**, WHtR 0,472, mapa corporal coloreado, Historial
    9 circunferencias + 1 composición + 2 bilaterales = 10, Simetría Muslo 55/55 =
    100 % balanceado. `IMPORT_DATA` **reemplaza**, así que reimportar el mismo archivo
    no duplica (comprobado: 10 filas antes y después).
  - **No caben en `MEASUREMENT_TYPES` (reportados, nunca inventados):** «manzana» 37,5
    (no existe el tipo), «boxer» 86 (no existe; la app usa caderas/glúteos), «abdomen
    templado» 78 (se guardó el abdomen **libre** 83, que es el protocolo de la app),
    talla de zapato 26 (no es medida corporal), **bíceps izq/der sin valor**. **Nunca
    dados:** cuello, antebrazos izq/der, pantorrillas izq/der, % grasa, FC en reposo.
- **Verificación (comandos reales, 2026-10-05):**
  - `npx vitest run` (raíz) → **947/947, 62 archivos**, exit 0.
  - `cd bodylab/apps/web && npx vitest run` → **115/115, 8 archivos**, exit 0.
  - `npx oxlint` (web) → **0 warnings, 0 errores**.
  - `cd traininglab/apps/desktop && npx tsc -b && npx vite build` → exit 0 (720 ms).
  - `npx tauri build` (TrainingLab 0.2.0) → **exit 0**, instalador NSIS
    `traininglab/apps/desktop/src-tauri/target/release/bundle/nsis/TrainingLab_0.2.0_x64-setup.exe` (15,3 MB)
    + `target/release/traininglab.exe`.
  - `npx tauri build` (BodyLab 1.0.0-beta.8) → instalador
    `bodylab/apps/desktop/src-tauri/target/release/bundle/nsis/BodyLab_1.0.0-beta.8_x64-setup.exe` (23,4 MB)
    + `bodylab.exe`, pero **exit 1**: `createUpdaterArtifacts` pide
    `TAURI_SIGNING_PRIVATE_KEY`, que solo existe en el workflow de release. El
    instalador es válido; lo que falta es la firma del updater.
  - El bundle compilado contiene los cambios: `{id:`crunch`…}` y «Crunch Clásico» /
    «Abducción de Cadera» en `dist/assets/catalog-exercises-*.js`, `weekly-volume` y
    «Esta semana» en `index-*.js`, `import-symmetry` 1 vez, `llm/knowledge.json` = 151.
  - **Nota de honestidad:** una primera pasada de la suite web dio 1 fallo
    (`page-smoke` → «Test timed out in 5000ms») por compilar Rust en paralelo; el mismo
    archivo aislado pasó en 2,49 s y la suite completa volvió a **115/115** sin carga.
    Se reporta como timeout por contención, no como flake del código.
- **Decisiones/puertas abiertas (del dueño):** (1) vetar o confirmar las 13 propuestas de
  mapeo variante/equipo; (2) nombrar `pa® (Maquina)` (03/09, 18 kg ×4) — sigue sin
  equivalente; (3) confirmar la tabla ÷2 de `BILATERAL_DB` (7 ejercicios) y los 3 crunchs
  con mancuerna sin dividir; (4) decidir si **manzana**, **boxer** y **abdomen templado**
  entran como tipos nuevos en `MEASUREMENT_TYPES` (hoy se descartan con motivo escrito);
  (5) confirmar que el nombre del perfil es «Andy» (se infirió del usuario de Windows).
  **La puerta del mapa muscular por fuerza de referencia externa sigue cerrada.**
- **Estado Git:** sin commits; rama `main`, HEAD `f6c4aef` (sin push). Cambian además de
  lo ya anotado: `bodylab/core/exercises/src/{catalog-expansion,traits-expansion}.ts`,
  `scripts/{map-symmetry-exercises.mjs,build-owner-import.mjs(nuevo)}`,
  `bodylab/apps/web/src/__tests__/integration-total.test.ts`,
  `traininglab/apps/desktop/src/features/stats/{derive.ts,WeeklyVolumeCard.tsx(nuevo)}`,
  `src/screens/ProgressScreen.tsx`, `src/lib/i18n.ts`,
  `tests/training/test_weekly_volume.test.ts (nuevo)` y el pack regenerado
  `traininglab/apps/desktop/llm/{knowledge.json,EXERCISES.md}`. `.cache/` ignorado.
  `Modelo2D_Woman.png` (raíz, sin trackear) **no se ha tocado**.
- **Punto de reanudación:** enseñar al dueño los dos instaladores y el par de archivos de
  `.cache/`, con la instrucción exacta de importarlos (BodyLab: *Datos → Importar*;
  TrainingLab: *Ajustes → Mis datos → Importar historial de Symmetry*). Los datos **no**
  viajan dentro del instalador: IndexedDB es por dispositivo.
- **Siguiente paso seguro:** con sus respuestas a las 5 decisiones, cerrar la lista de
  mapeo y (si lo quiere) añadir los tipos `apple`/`boxer`/`waist_tensed` al esquema con
  sus tests; luego re-ejecutar `pnpm test` + `pnpm lint` y reconstruir los installers.

## 2026-10-05 (b) — Aclaraciones del dueño, pestaña Historial, ruido de notas y Progreso con punto en el tiempo

- **Fase/tarea:** respuestas del dueño a las preguntas de la mañana + tres arreglos que
  salieron de verificar en la app con sus datos reales.
- **Aclaraciones del dueño (2026-10-05):** «manzana» **es el cuello** (37,5 cm);
  «boxer» es la **cadera alta** (donde empieza el hueso de la cadera, 86 cm), por encima
  del punto más ancho que mide la app; **bíceps = tríceps = 32 cm**; antebrazo **aún no
  medido**; **no** añadir plano nutricional; el plan de volumen debe respetar los estudios
  formales según el objetivo del usuario, con el LLM + fatiga + volumen + ejercicios
  previos decidiendo el siguiente ejercicio, priorizando **repetir el mismo ejercicio en
  el mismo orden** para medir la carga progresiva; la cadencia debearse por **horas de
  recuperación**, no por día de la semana; el **orden de los ejercicios importa**.
- **BodyLab · Progreso «no funcionaba» (era vacío por diseño):** `ProgressTimeline` chart
  desde **snapshots** + un punto «Ahora»; con 0 snapshots hay 1 punto y cae en la rama de
  «sin datos». Ahora `importData` (`src/lib/store.tsx`) siembra **un snapshot con id
  derivado de los datos** (`snap-import-<primera medición>-<n>`), así que reimportar el
  mismo archivo reescribe el mismo punto. Verificado en la app: 1 snapshot tras importar
  **dos veces**, y Progreso dibuja la línea de tiempo con 2 puntos (pecho/caderas/cintura).
  Backup que ya trae sus propios snapshots: no se toca.
- **BodyLab · datos reales actualizados:** `scripts/build-owner-import.mjs` → **14
  mediciones** (se añade `neck` 37,5 y `biceps` 32 + par izq/der 32; assessment completo).
  Sigue sin equivalente: abdomen templado 78, boxer/cadera alta 86, tríceps 32, talla 26.
- **TrainingLab · pestaña Historial implementada** (era un `EmptyState` fijo, por eso T3
  «no tenía encajes pendientes» era inexacto): `exerciseHistory()` en
  `features/stats/derive.ts` + `HistoryTab`/`HistoryDayCard` en
  `screens/ExerciseDetailScreen.tsx` + 13 claves `ex.history.*`. Reglas: solo el
  `exerciseId` exacto, warm-ups listados pero fuera de volumen/series/marca, día solo con
  tiempos = 0 kg y sin marca (nunca «levantaste 0 kg»), notas D/F conservadas, días más
  recientes primero y totales sobre **todo** el log, no solo la ventana. **9 tests.**
  Verificado con sus 20 sesiones: «4 días de entrenamiento · 20 series · 8092,2 kg ·
  mejor 81,6 kg · 1RM estimado 84,7 kg (Epley, no medido)».
- **TrainingLab · ruido de notas:** 314 de las 410 series traían el **número de serie**
  (`"1"`, `"4"`…) en `notes` porque el parser lo mete en el mismo hueco que el badge;
  `noteOf()` en `lib/symmetry.ts` los descarta (se pierde nada: la posición ya la implica
  el timestamp). Reimportando limpio: `notes` = **41 `D` + 50 `F`**, 0 numéricos. **1 test.**
- **Bug encontrado por los tests (arreglado):** con una serie de 0 reps y otra del mismo
  peso, la de 0 reps se quedaba como «mejor serie» del día. Ahora a igual carga gana la
  que tiene repeticiones.
- **Verificación (comandos reales):** raíz **957/957 (63 archivos)** exit 0 · web
  **115/115** exit 0 · `npx oxlint` **0/0** · `tsc -b` 0 en ambas apps · TrainingLab
  `tauri build` **exit 0** → `TrainingLab_0.2.0_x64-setup.exe` (00:38, ya incluye Historial
  y el arreglo de notas).
- **Pendiente:** (a) **reconstruir el instalador de BodyLab** para que incluya el snapshot
  automático — el de las 00:10 es anterior al arreglo; (b) **la investigación de cadencia
  por objetivo** (hipertrofia / pérdida / recomp / mantenimiento) está **pedida y sin
  empezar**: hay que citar fuentes nombrables, no de memoria; (c) **orden adaptativo por
  fatiga** en el planificador; (d) nada de módulo nutricional (decisión del dueño).
- **Estado Git:** sin commits; `main` en `f6c4aef`. Sin trackear nuevos:
  `scripts/build-owner-import.mjs`, `tests/training/test_exercise_history.test.ts`.

## 2026-10-05 (c) — Investigación: dónde y cómo medir para máximo detalle sin escáner 3D

- **Encargo del dueño:** «investiga de dónde se deben hacer mediciones y cómo, para el
  MÁXIMO detalle posible del cuerpo del usuario sin un escáner 3D».
- **Entregable:** `fitness-ecosystem/docs/ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md`
  (~2.400 palabras, español). **Investigación/documentación: no se ha tocado código.**
- **Fuentes citadas (nombrables):** F1 ISAK *Accreditation scheme* (recuentos por
  nivel: L1 = 4 base + 8 pliegues + 6 perímetros + 3 anchuras; L2 añade 13 perímetros,
  9 longitudes/alturas y 9 anchuras/profundidades; L3/L4 = 43 dimensiones; TEM en
  reacreditación). F2 Whyte & Gallagher, *World Rev Nutr Diet* 2022;124:23–30,
  PMID 35240646 (técnica de calibre; el %grasa por pliegues **no sirve a nivel
  individual**). F3 Hodgdon & Beckett 1984 US Navy (SEE ±3,5 %). F4 Jackson & Pollock
  3/7 pliegues. F5 Drillis, Contini & Bluestein, *Artif Limbs* 1966;8:44–66 (longitudes
  segmentarias como fracción de la estatura: brazo 0,189 H, antebrazo 0,145 H, mano
  0,128 H) y *Hum Factors* 1963;5:493–504. F6 Merrill et al., CDC Stacks 2019 (el
  error al predecir parámetros segmentarios desde antropometría puede llegar al 40 %).
- **Hallazgo de esquema:** `MEASUREMENT_TYPES` está hecho casi solo de **perímetros**;
  le faltan las familias de **pliegues** (ya tiene 5 de 8), **anchuras/diámetros
  óseos**, **longitudes segmentarias** y **ángulos posturales** — que son justamente
  lo que permite un modelo paramétrico sin escáner (F5).
- **Propuesta (NO implementada, §5 del documento):** Grupo B `hip_upper` (tu «boxer»,
  86 cm), `biceps_flexed`, `triceps`; Grupo C `subscapular`/`biceps`/`mid_axillary`
  skinfolds; Grupo D longitudes/anchuras, que exige **una categoría nueva** en
  `MeasurementTypeInfo.category` (hoy `circumference|composition|conditioning`).
- **Regla de honestidad fijada (§6):** con cinta se puede afirmar «esta cintura mide
  83 cm», ratio cintura/altura con fuente, y anclajes óseos; el %grasa por perímetros es
  estimación con **SEE ±3,5 %**; el %grasa por pliegues **no** es afirmación individual
  (F2); el «volumen corporal» y la forma 3D son **aproximación paramétrica** y deben
  mostrarse con su margen (F6, hasta 40 %).
- **Cadencia sugerida (§7):** semanal solo al cambiar de objetivo/fase, quincenal en
  mantenimiento; el motivo es el **error técnico de medición**, no la fisiología —
  declarar tendencia entre dos puntos dentro del TEM es inventarse una tendencia.
- **Pendiente de decisión del dueño:** (1) añadir Grupo B; (2) abrir Grupo D y su nueva
  categoría; (3) exigir nº de réplicas y TEM por medida en el registro; (4) marcar en la
  UI qué datos del modelo 3D son medidos vs estimados por proporción de estatura.
- **Estado Git:** sin commits; `main` en `f6c4aef`. Documento nuevo sin trackear:
  `fitness-ecosystem/docs/ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md`.
- **Checks:** no aplica re-ejecución — el cambio es solo de documentación. Los últimos
  verdes siguen siendo raíz **957/957 (63 archivos)**, web **115/115**, oxlint **0/0**,
  `tsc -b` 0 en ambas apps, TrainingLab `tauri build` exit 0 y BodyLab installer
  reconstruido (exit 1 solo por la clave de firma del updater).

## 2026-10-05 (d) — Esquema ampliado: todo lo medible con cinta o recursos caseros

- **Encargo del dueño:** «en cuanto a las familias de métricas, añade todo lo que se
  pueda medir con cinta métrica o recursos caseros». Autoriza implementar sobre el
  protocolo de (c).
- **22 tipos nuevos en `MEASUREMENT_TYPES`**, todos medibles con cinta/regla/pared/libros:
  - **Perímetros (6):** `hip_upper` (cadera alta = su «boxer»), `triceps`,
    `biceps_flexed`, `forearm_flexed`, `mid_axillary`, `ankle`.
  - **Longitudes (9, categoría nueva `length`):** `stature_sitting`, `arm_span`,
    `subischial_leg_length`, `upper_arm_length`, `forearm_length`, `hand_length`,
    `thigh_length`, `lower_leg_length`, `foot_length`.
  - **Anchuras (7, categoría nueva `breadth`):** `biacromial`, `bi_iliac`,
    `wrist_breadth`, `elbow_breadth`, `knee_breadth`, `malleolar_breadth`, `hand_width`.
- **Archivos:** `bodylab/apps/web/src/lib/{types,constants}.ts` (unión + categorías 3→5 +
  filtros `LENGTH_TYPES`/`BREADTH_TYPES`), `pages/Measurements.tsx` (pestaña «Longitudes y
  anchuras» con dos subsecciones, guías «dónde y cómo» para los 22, tira de pestañas
  `overflow-x-auto` porque 6 tabs no caben a 390 px), `__tests__/contract.test.ts`.
- **Bug arreglado de paso:** las guías de medición se mostraban en **inglés** en la página
  en español (`{guide.en}` en 3 sitios); ahora `{guide[lang]}`.
- **Fuera de alcance (decisión explícita):** los **pliegues** exigen plicómetro, que no
  es recurso casero → no se añadieron; siguen los 5 existentes. Quedan 3 por añadir si
  algún día hay calibre (`subscapular`, `biceps`, `mid_axillary`).
- **Datos del dueño importados: 17 mediciones** (antes 14). Entraron `hip_upper` 86,
  `triceps` 32 y `foot_length` 26 (origen «shoes size 26 cm» — 26 no es talla europea,
  así que es la longitud del pie, **con aviso de verificación**). «Hombros 116» quedó
  corregido en las notas: es perímetro sobre deltoides, **no** anchura biacromial (la
  anchura acromial real se mide aparte y sigue sin tener). Abdomen templado 78 sigue sin
  tipo (decidido: solo existe una cintura). Reimportar = 1 snapshot, sin duplicados.
- **Verificación (comandos reales):** `npx vitest run` (raíz) → **958/958, 63 archivos**,
  exit 0 · web `npx vitest run` → **116/116, 8 archivos**, exit 0 (+1 test nuevo de
  rangos y de `cm` obligatorio en `length`/`breadth`) · `npx oxlint` → **0/0** ·
  `npx tsc -b` → exit 0 · **Playwright e2e** (`npx playwright test`) → **21/21 en 40,4 s**,
  exit 0 (incluye el fit-solver 3D contra las medidas reales y el round-trip de export/import).
  **En el navegador** (vite 5173): import → «Datos importados
  correctamente», 17 mediciones, snapshot de 17; pestaña «Longitudes y anchuras» con
  subsecciones «Longitudes — cinta y pared» y «Anchuras — regla y dos libros»; Circunferencias
  muestra Cuello 37,5 · Hombros 116 · Pecho 95 · Cintura 83 · Cadera 97 · Bíceps 32 y
  Antebrazo con «Agregar» (pendiente), con las guías ya en español.
- **Instalador de BodyLab RECONSTRUIDO a las 01:47** (`BodyLab_1.0.0-beta.8_x64-setup.exe`,
  22,27 MiB) — comprobado que el bundle compilado lleva los 22 ids nuevos y la pestaña
  «Longitudes y anchuras». `exit 1` únicamente por `TAURI_SIGNING_PRIVATE_KEY` (updater,
  workflow de release). **TrainingLab no cambió en esta ronda** (el esquema es de BodyLab),
  así que su build de las 00:38 sigue siendo válido.
- **Estado Git:** sin commits; `main` en `f6c4aef`. Nuevos sin trackear:
  `docs/ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md`, `tests/training/test_exercise_history.test.ts`,
  `scripts/build-owner-import.mjs`.

## 2026-10-05 (e) — Progreso legible por objetivo: panel «Hacia tu ideal» + ideal McCallum del dueño

- **Encargo del dueño:** «la página de progreso aún me parece difícil de leer… quiero
  verme musculoso como boxeador de peso ligero o mediano», con dos preguntas
  (¿bíceps y tríceps son el mismo diámetro? ¿cuáles son mis dimensiones ideales?) y
  la aclaración de que **no usa modelo local: el modelo es Buffy**.
- **Decisión tomada con el dueño** entre cuatro opciones: implementar el panel
  «Hacia mi ideal» como primera tarjeta de Progreso. Las otras tres (resumen tipo
  tarjeta de visita, rediseño completo, no tocar) quedan sin hacer.
- **Implementación:**
  - `bodylab/apps/web/src/features/progress/GoalPanel.tsx` (nuevo) — presentación pura
    sobre `state.assessment`, `state.adonisResult` y `state.whtrResult` que el store
    calcula con `CALCULATE_ASSESSMENT` (`@fitness/bodylab-anthropometry`). **No inventa
    ninguna meta**: todo ideal es la proporción publicada y la pie lo declara índice de
    referencia, no meta de salud ni consejo médico.
  - `features/progress/index.ts` (export) y `pages/Progress.tsx` (montado antes de las
    Quick Stats, es decir lo primero que se ve).
  - `bodylab/apps/web/src/__tests__/goal-panel.test.tsx` (nuevo, 2 tests): siembra el
    marco del dueño y comprueba que llegan los números publicados tras el
    `setTimeout(0)` del store (si el panel leyera antes de tiempo saldría vacío y nadie
    lo notaría), más el estado vacío sin datos.
- **Qué ve el dueño con sus 13 medidas (verificado en navegador, 1280×1000 y 390×844):**
  agregado **65/100 «Moderado»** y las 8 filas McCallum — Pecho 95,0/107,3 (54 %) ·
  Cintura 83,0/75,1 (58 %) · Cadera 97,0/91,2 (74 %) · Bíceps 32,0/38,6 (**32 %**) ·
  Muslo 55,0/56,8 (87 %) · Cuello 37,5/39,7 (78 %) · Pantorrilla 39,0/36,5 (72 %) ·
  **Antebrazo «sin medir»** (fila punteada con enlace a Medir). Debajo, tres fichas:
  **Adonis 1,40 «Cerca»** (meta Φ ≈ 1,62), **WHtR 0,47 «Saludable»** (meta ≤ 0,50) y
  **Peso 76 kg · 1,76 m**. Los huecos se muestran como «sin medir», nunca como ausencia.
- **Respuestas al dueño (con su fundamento, sin inventar):**
  - **Bíceps = tríceps en la misma lectura de cinta.** La cinta rodea todo el brazo
    (húmero + bíceps + braquial + tríceps) y a media altura el tríceps es ~2/3 de la masa
    muscular del brazo; el ISAK mide **una** circunferencia de brazo (relajada o
    contraída) y su «tríceps» es un **pliegue con plicómetro**, que queda fuera del
    alcance acordado (no es recurso casero). Sus 32/32 son el mismo punto medido dos
    veces; la lectura que sí distingue es relajado vs `biceps_flexed`, ya en el esquema.
  - **Sus ideales** salen de McCallum con su muñeca (16,5 cm → pecho 6,5×): tabla en el
    mensaje del dueño, con Adonis 1,40 (desvío 13,6 % de Φ) y WHtR 0,47. Brechas: bíceps
    −17 %, cintura +11 %, pecho −11 %; muslo y pantorrilla ya casi en referencia.
- **Sin modelo local:** el planificador determinista (`session.ts`/`validator.ts`) sigue
  siendo el suelo y **Buffy es el coach/modelo**; no se habilita el LLM local.
- **Verificación (comandos reales):** `npx tsc -b` (web) → exit 0 · web `npx vitest run`
  → **118/118, 9 archivos**, exit 0 (+2) · raíz `npx vitest run` → **958/958, 63
  archivos**, exit 0 · `npx oxlint` → **0/0** · **Playwright** `npx playwright test` →
  **21/21 en 39,6 s**, exit 0. **QA visual**: vite en 127.0.0.1:5273, sembrado por el
  camino legacy de `localStorage` (el mismo que usa `scripts/capture-screenshots.mjs`),
  recarga y hash `#/progress`; 13 medidas del dueño; sin errores en consola; servidor
  parado al terminar.
- **NO se reconstruyó el instalador de BodyLab** en esta ronda: el instalador de (d)
  (01:47) **no** incluye el panel; hace falta `pnpm build` en `bodylab/apps/desktop`
  cuando el dueño quiera la app de escritorio con esto.
- **Estado Git:** sin commits; `main` en `f6c4aef`. Sin trackear, además de los de (d):
  `bodylab/apps/web/src/features/progress/GoalPanel.tsx` y
  `bodylab/apps/web/src/__tests__/goal-panel.test.tsx`.
- **Gates y límites respetados:** mapa muscular y su gate sin tocar; sin módulo de
  nutrición; sin metas inventadas; «peso ligero/medio» tratado como **categoría de
  competición**, no como physique, y sin Lean Mass no se afirma ningún peso objetivo.
- **Pendiente de decisión del dueño:** 13 propuestas de mapeo de ejercicios · nombre
  `pa® (Maquina)` · confirmación de la tabla ÷2 · nombre de perfil · plicómetro ·
  TEM/replicación · marcado medido vs estimado en el 3D · **segunda opción de rediseño
  de Progreso** (resumen o página única), si el panel no le basta.
- **Siguiente paso seguro:** medir `forearm` y `biceps_flexed` (cierra la 8.ª fila y
  resuelve la pregunta bíceps/tríceps con datos propios) y decidir la segunda opción de
  Progreso.

## 2026-10-05 (f) — Training: «Objetivo de volumen» con la banda publicada 12–20 series/semana

- **Aclaración del dueño:** «cuando dije que Progreso era difícil de comprender hablaba de
  **Training**» (BodyLab ya le vale). Encargos: «mejorar Training basado en investigación
  real, y una mejor UI», más la pregunta «¿tener la pantorrilla más grande sin grasa es
  malo? ¿me aleja de mi ideal?».
- **Respuesta de la pantorrilla (con dato, sin inventar):** no. La literatura clínica
  señala la circunferencia de pantorrilla **baja** como factor de riesgo (puntos de corte
  de sarcopenia ~34–36 cm en hombres: González 2021 AJCN con datos NHANES 1999–2006;
  Champaiboon 2023; Kerminen 2024), y él está en **39 cm con 1,76 m = 22,2 cm/m**, muy por
  encima de cualquier umbral y sin grasa. Además, sus 39 frente al ideal de McCallum
  (36,5 = 0,34 × pecho) **no son una desviación mala**: es una proporción de referencia,
  no un techo. De ahí el cambio de texto en BodyLab (abajo).
- **Investigación usada (con DOI/PMID en el código, no en la prosa):**
  - **Baz-Valle 2022**, *J Hum Kinet* 81:199–210, **PMID 35291645** — revisión sistemática
    + metaanálisis (7 ECA, hombres entrenados 18–35, ≥1 año, medición directa de grosor):
    **12–20 series semanales por grupo** como recomendación de referencia; moderado
    (12–20) vs alto (>20) **sin diferencia** en cuádriceps (p = 0,19) ni bíceps
    (p = 0,59), pero **mejor en tríceps (p = 0,01)** → tríceps con franja **12–24**.
  - **Pelland 2025/2026**, doi **10.51224/SRXIV.460** — meta-regresiones (67 estudios,
    2 058 participantes): más volumen → más hipertrofia (100 % de probabilidad posterior de
    pendiente positivo) **con rendimientos decrecientes**; la **frecuencia** no tiene efecto
    apreciable en hipertrofia (sí en fuerza). De ahí que sea una **franja** y no «más siempre
    es mejor».
  - **Schoenfeld 2017**, *J Sports Sci* 35:1073–1082 — metaanálisis dosis-respuesta que
    justifica el suelo de la franja (>9 series/semana).
- **Implementación:**
  - `traininglab/apps/desktop/src/lib/volume-target.ts` (nuevo, puro) — la franja por
    familia con su procedencia, más `readVolume` y `summariseVolume`.
  - `traininglab/apps/desktop/src/features/stats/derive.ts` — `weeklyDirectSets(sets,
    days=7)`: cuenta **solo series directas** (intensidad 3 del catálogo), sin calentamientos
    y sin crédito al trabajo secundario/accesorio. Es la lectura literal de «sets per muscle
    group» y evita que compita con el índice fraccionado del mapa corporal (1/0,66/0,33),
    que sigue intacto y aparte.
  - `traininglab/apps/desktop/src/features/stats/VolumeTargetCard.tsx` (nuevo) — tarjeta
    **primera** de Progreso: «X de Y grupos en rango», filas ordenadas por **mayor déficit**,
    barra con la franja dibujada sobre la misma escala, y pie con las tres fuentes + el aviso
    de que no es consejo médico.
  - `screens/ProgressScreen.tsx` monta la tarjeta antes de los KPI; `lib/i18n.ts` con 12
    claves nuevas bilingües.
  - BodyLab `features/progress/GoalPanel.tsx`: «sobre/bajo **la referencia**» en vez de «el
    ideal», y pie explícito de que **la referencia es una proporción, no un techo ni un
    mínimo: estar por encima no es un defecto** (era justo el mensaje engañoso de la
    pantorrilla).
  - `tests/training/test_volume_target.test.ts` (nuevo, 8 tests): bordes de la franja
    inclusivos, franja ampliada del tríceps, series directas sin crédito fraccionado,
    calentamiento excluido, ventana de 7 días, orden por déficit y familia sin series
    **ausente** en vez de un cero inventado.
- **Bug de UI encontrado y arreglado en el proceso:** la primera versión usaba `.tl-row`, que
  es una rejilla de **2 columnas**; la barra añadía una tercera y la fila se partía en dos,
  dejando media caja vacía (justo el tipo de fila rota que el dueño reclamaba). Las filas
  de la tarjeta declaran ahora sus tres columnas con `gridTemplateColumns` en línea.
- **Verificación (comandos reales):** raíz `npx vitest run` → **966/966, 64 archivos** (+8),
  exit 0 · TrainingLab `npx tsc -b` → **exit 0** · BodyLab `npx tsc -b` → exit 0 · web
  `npx vitest run` → **118/118**, exit 0 · `npx oxlint` → **0/0** · Playwright e2e →
  **21/21 en 40,3 s**, exit 0.
- **QA visual con SUS datos reales** (importados con el `parseSymmetry` real desde
  `.cache/symmetry-import.json` → 20 sesiones / 410 series, en español): 1366×1100 y
  390×844, sin desbordes ni texto cortado. Lectura de **los últimos 7 días tal cual**:
  dorsales 1 · hombros 4 · trapecios 4 · pecho 7 · antebrazos 10 · tríceps 11 · bíceps 12 ·
  core 46 → **1 de 8 grupos en rango, 6 por debajo**. Lectura de su semana más completa
  (2026-09-03…09-09, calculada con la misma función dentro de la app): 12 grupos,
  **3 en rango, 1 por debajo (trapecios 8) y 8 por encima** — el patrón de Symmetry es de
  volumen alto y su hueco real está en trapecios, no en brazos ni piernas.
- **NO se reconstruyó ningún instalador** en esta ronda: el de TrainingLab 0.2.0 (00:38) y
  el de BodyLab beta.8 (01:47) **no** incluyen la tarjeta nueva.
- **Estado Git:** sin commits; `main` en `f6c4aef`. Sin trackear, además de los de (d) y (e):
  `traininglab/apps/desktop/src/lib/volume-target.ts`,
  `traininglab/apps/desktop/src/features/stats/VolumeTargetCard.tsx`,
  `tests/training/test_volume_target.test.ts`.
- **Pendiente de decisión del dueño:** si la tarjeta debe respetar el selector de periodo
  (hoy es fija a 7 días, que es lo que dice la literatura) y qué hacer con las familias «por
  encima»: la evidencia habla de rendimientos decrecientes, no de castigo, y la pantalla lo
  dice, pero el planificador todavía **no** usa la franja como restricción.
- **Siguiente paso seguro:** decidir lo anterior y, si lo aprueba, hacer que el generador de
  sesiones reparta el volumen dentro de la franja publicada en lugar de solo repartir por los patrones del catálogo.

## 2026-10-05 (g) — CI reproducida en local, ambos installers reconstruidos y publicado a GitHub

- **Encargo del dueño:** «compila todo en mi escritorio y actualiza el github, haz las pruebas
  CI en local antes».
- **Los cuatro jobs de `.github/workflows/ci.yml` reproducidos en local, con su exit status:**
  | Job | Comandos | Resultado |
  |---|---|---|
  | `check` | `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm check` → `npx vite build` (BodyLab) → `pnpm --filter traininglab-desktop build` | **exit 0** en los cinco |
  | `traininglab-desktop` | `pnpm --filter traininglab-desktop build` (`tsc -b` + vite) → `pnpm tauri build --no-bundle` | **exit 0** / compilado |
  | `desktop` | `pnpm tauri build --no-bundle` (BodyLab) | **exit 0** |
  | `e2e-desktop-smoke` | `pnpm tauri build --no-bundle` → `smoke-desktop.ps1` | **exit 0** |
- **Números de la pirámide completa (`pnpm check`):** typecheck web + core exit 0 ·
  raíz `vitest` **966/966 en 64 archivos** · web `vitest` **118/118 en 9 archivos** ·
  Playwright **21/21 en 50,7 s** · `oxlint` **0 avisos / 0 errores**.
- **Un fallo real encontrado y corregido (no era ruido):** la primera pasada de `pnpm check`
  dejó **rojo** el smoke de páginas — `renders Progress without throwing` **se pasó de los
  5 000 ms por defecto (7 772 ms)**. Medido: aislado son **933 ms** y en la suite completa
  **721 ms**, o sea que el test no estaba lento, sino **hambriento de CPU**: vitest lanza los
  nueve archivos web en paralelo y, bajo contención, la página Progress (recharts + hidratación
  del store desde IndexedDB + la GoalPanel nueva) se multiplicó ×8. Con el árbol de procesos
  limpio no había nada corriendo que explicara la lentitud: era contención puntual. Solución en
  `bodylab/apps/web/src/__tests__/page-smoke.test.tsx`: `MOUNT_TIMEOUT_MS = 20_000` explícito
  y documentado en los tests de montaje. **No se relajó ninguna aserción** — siguen fallando
  igual si la página no monta, si el árbol sale vacío o si aparece el `ReferenceError` de
  zona temporal. El objetivo real era que CI (ubuntu de 2 núcleos, con más contención que
  esta máquina) no se ponga rojo por un test de integración de página completa.
- **Instaladores reconstruidos con el código de (e) y (f) dentro** (comprobado en el bundle,
  no supuesto):
  - **TrainingLab 0.2.0** → `TrainingLab_0.2.0_x64-setup.exe`, **15 325 376 bytes (14,62 MiB)**,
    `pnpm tauri build` **exit 0**. El `dist` embebido contiene `ProgressScreen-BFO4Lt5s.js` con
    la tarjeta «Objetivo de volumen».
  - **BodyLab 1.0.0-beta.8** → `BodyLab_1.0.0-beta.8_x64-setup.exe`, **23 355 307 bytes
    (22,27 MiB)**, `pnpm tauri build` **exit 1 por `createUpdaterArtifacts`**: «A public key has
    been found, but no private key» — la clave de firma solo existe en `release.yml`. El
    instalador NSIS se genera **antes** de ese paso y es válido; con `--no-bundle` (lo que hace
    el job `desktop` de CI) el mismo build sale **exit 0**. El `dist` embebido contiene
    `Progress-Dxps7vm1.js` con «Hacia tu ideal».
  - Los dos `.exe` están copiados al **escritorio real** (`C:\Users\andyh\OneDrive\Desktop`,
  que es donde OneDrive redirige el escritorio; no `%USERPROFILE%\Desktop`).
- **Smoke del binario de BodyLab (job `e2e-desktop-smoke`):** `SMOKE PASS`, exit 0 — versión
  1.0.0-beta.8 en el recurso de versión, ventana `BodyLab` launched, estable a los 14 s,
  contenedor WebView2 con su origen `indexeddb.leveldb` y cierre limpio.
- **Datos personales: decisión del dueño, «Publicar todo».** Se avisó antes de publicar de que
  el repositorio es **público** y de que `scripts/build-owner-import.mjs`, `knowledge.md` y este
  documento citan su fecha de nacimiento, estatura, peso y mediciones concretas; el dueño
  respondió **«Publicar todo»**, así que viaja en el commit tal cual. `.cache/` (donde viven
  sus exportaciones reales) sigue ignorado y **no se stageó**. `Modelo2D_Woman.png`, sin
  trackear en la raíz, **no es nuestro** y quedó fuera.
- **Estado Git:** todo lo de (a)–(f) más esta entrada, en un commit en `main` y **push a
  `origin/main`**. No hay cambios pendientes sin stagear salvo ese PNG ajeno.
- **Siguiente paso seguro:** con el push, los jobs Windows de CI y `release.yml` se ejecutan solos con
  el push; la única diferencia con lo local es la firma del updater, que solo el workflow de
  release puede hacer. Vigilar el run verde antes de dar por buena la publicación.

## 2026-10-05 (h) — El push de (g) salió rojo: dos causas que solo aparecen en un clon limpio

- **Qué pasó:** el commit `e763ebf` se empujó con la pirámide local en verde, y GitHub Actions dejó **los cuatro jobs de `ci.yml` en rojo, todos en el mismo paso: "Install dependencies"**. `deploy-pages.yml` también cayó. La lección de (g) —«los cuatro jobs reproducidos en local»— era **cierta pero incompleta**: se había ejecutado sobre el `node_modules` que ya existía.
- **Causa 1, y la que realmente dejó el CI rojo: `ERR_PNPM_IGNORED_BUILDS`.** pnpm 11 da por fallada una instalación entera cuando una dependencia trae script de build y **nadie lo ha declarado**. `scripts/import-symmetry.mjs` (nuevo) arrastra `tesseract.js`, cuyo `postinstall` es `opencollective-postinstall || true`, o sea un banner de donación. En local `pnpm install --frozen-lockfile` respondía «Already up to date» y no se enteraba. Reproducido en un clon limpio (`git clone` + install) antes de tocar nada: **exit 1**. Arreglo: `tesseract.js: false` en `allowBuilds` de `pnpm-workspace.yaml`, con el porqué escrito en el propio archivo. Es la respuesta honesta —lo leí y no lo quiero— y deja la regla estricta para todo lo demás. El `pnpm-lock.yaml` **no se tocó**: la declaración no altera la resolución.
- **Causa 2, latente y (no visible en CI): fin de línea.** Esta máquina tiene `core.autocrlf=true`, así que un clon nuevo saca los textos en **CRLF** mientras el runner de ubuntu los saca en **LF**. `scripts/lan-store.mjs` empieza con `#!/usr/bin/env node`; vitest 1 pasa el módulo transformado a `vm.runInThisContext`, y ahí un shebang terminado en `\r` es **«SyntaxError: Invalid or unexpected token»**. Se llevaban por delante **`tests/lan/test_lan_store.test.ts`** y **`tests/training/test_data_cli.test.ts`**, las dos únicas suites raíz que importan un script con shebang. Aislado por bisección: convertir **solo** el test a CRLF no lo rompía; convertir **`scripts/lan-store.mjs`** a CRLF sí. Con LF forzado: **966/966**. Arreglo: **`.gitattributes`** en la raíz con `* text=auto eol=lf` y CRLF solo para `*.bat`, `*.cmd`, `*.ps1` (cmd.exe y el doble clic son los lectores menos tolerantes del repo). Sin renormalización masiva: el árbol de trabajo ya estaba en LF.
- **Verificación de los arreglos, en clones de verdad:** clon con el `autocrlf` de esta máquina (CRLF) → shebang en **LF**, `BodyLab.bat` en **CRLF**, `pnpm install --frozen-lockfile` **exit 0**, `pnpm lint` 0/0, `pnpm check` **966/966 + 118/118 + 21/21 E2E, exit 0**, y los dos builds de producción **exit 0**. O sea: el job `check` completo, en el escenario que antes fallaba.
- **Commits:** `e763ebf` (la functionality, 44 archivos) y `c5db91b` (los dos arreglos). Los dos en `origin/main`.
- **Pendiente por decidir con el dueño (no es un bloqueo):** los instaladores del escritorio se compilaron con `e763ebf`, que es el mismo código de aplicación que `c5db91b` — los arreglos son de instalación y de fin de línea, no tocan el bundle. Aun así, si quiere installers construidos **exactamente** desde `c5db91b`, hay que rehacer los dos `tauri build` (~2 min 20 s cada uno).

## 2026-10-05 (i) — «actualicé el .exe y perdí los datos»: qué pasó de verdad, y copias + series repetidas

- **Encargo del dueño:** «acabo de descargar la actualización en el .exe de training y perdí
  todos mis datos, eso no puede suceder en una update. Busca cómo solucionarlo, mira si puedes
  recuperar mis datos». Más dos cosas sobre las series: «me obliga a registrar un rango en cada
  serie» y «lo ideal es que por tipo de ejercicio recomiende el fallo en ese rango, el usuario
  digita las repeticiones y si no las digita se asume la misma cantidad que la anterior».
- **Diagnóstico (con evidencia, no teoría).** Todo TrainingLab vive en
  `%LOCALAPPDATA%\com.traininglab.desktop\EBWebView\Default\IndexedDB\http_tauri.localhost_0.indexeddb.leveldb`.
  Leyendo ese log: **9 registros de `readiness` (2026-09-29), los ajustes, y 3 series de
  `arnold-press` fechadas hoy 13:09–13:10** — `reps: 0`, `reps: 8`, `reps: 8`. **Ninguna serie
  anterior, en ningún almacén**: los orígenes de Edge (`localhost:5173`, `:8080`, `:8090`) no
  tienen ni un `exerciseId`, y `tmp/fitness.sqlite` (almacén LAN) tiene 0 filas.
- **La actualización no borró nada, y está demostrado en el código:** `DB_NAME`/`DB_VERSION`
  llevan `traininglab`/1 desde el primer commit, no hay `deleteDatabase()` y las stores se crean
  solo si no existen. La ruta del perfil tampoco cambió. Lo que sí era verdad —y es el agujero
  real— es que **no existía ninguna copia fuera del perfil de WebView2**, que es de Windows y
  puede reiniciarse sin aviso.
- **Lo recuperable:** su histórico de Symmetry está intacto en
  `fitness-ecosystem/.cache/symmetry-import.json` (20 sesiones / 410 series) y la app ya tiene
  Ajustes → Importar Symmetry. Las series de hoy son 3 y se respaldan solas con (i). Su perfil y
  medidas de BodyLab no se han tocado.
- **Copia de seguridad automática (lo nuevo).** Tres comandos Rust **muy estrechos** en
  `src-tauri/src/lib.rs` — `write_autobackup`, `read_autobackup`, `autobackup_dir` — que espejan
  el log en `%APPDATA%\com.traininglab.desktop\backups\traininglab-<milis>.json` y conservan 8.
  **No se activa el plugin de filesystem**: el shell declaraba «no filesystem plugin» y esa
  postura se mantiene; los comandos no aceptan rutas, la carpeta se calcula en Rust.
  `lib/autobackup.ts` (nuevo) decide **qué** guardar con `logSignature` (fingerprint de recuento
  + última marca) y colapsa ráfagas con `AUTOBACKUP_DEBOUNCE_MS = 2000`; nada de lo que hace
  lanza una excepción. Un `useEffect` en `app/store.tsx` cuelga la copia de `sets`, `sessions`,
  `health`, `settings` y `model`, así que **ninguna vía de guardado se puede saltar** (registrar,
  editar, deshacer, restaurar, importar Symmetry, Ajustes, readiness). Si la app abre con el log
  vacío y hay copia, `isWorthRecovering` lo detecta y Ajustes ofrece **«Restaurar mi historial»**,
  que reutiliza el mismo `importBackup` del import manual: una recuperación no puede comportarse
  distinto de un restore elegido a mano.
- **Series: la regla que pidió, y dos bugs que lo choraban.** El rango recomendado **ya existía**
  (`GOAL_REPS` en `bodylab/core/training/src/session.ts`: hipertrofia compuesto 8–12,
  aislamiento 10–15), pero la tarjeta lo pintaba como un placeholder tipo «8–12» en el campo de
  repeticiones, que se lee como «tengo que registrar un rango». Y al dejar el campo en blanco la
  app asumía `repRange.min` **en silencio**. Sus propias 3 series lo demuestran: las dos que dejó
  en blanco guardaron 8. La primera guardó **`reps: 0`**, porque `??` solo cae en `null`, no en
  `0` — un `0` tecleado se guardaba como cero repeticiones. Ahora la regla vive en
  `lib/set-entry.ts` (puro): lo tecleado gana; vacío = **la serie anterior**; solo si no hay
  anterior cae al mínimo prescrito. La UI lo dice (`«en blanco repite la anterior (12)»`) en vez
  de suponer en silencio, y el placeholder muestra el número que se va a usar, no un rango.
- **Verificación:** `tests/training/test_autobackup.test.ts` (nuevo, **15 tests**): el
  fingerprint es estable entre instantáneas iguales y cambia al añadir serie, **al editar una
  serie antigua sin cambiar el recuento**, y al aparecer ajustes; `isWorthRecovering` solo se
  ofrece con el dispositivo vacío y copia no vacía; y la regla de reps (tecleada gana, vacío
  repite, una serie sin repeticiones no borra el valor, cero y negativos cuentan como vacío).
  Suite raíz **981/981 en 65 archivos**, TrainingLab `tsc -b` exit 0, `cargo test --lib` 1/1,
  `pnpm lint` 0/0, `pnpm tauri build` exit 0. **Y la prueba que no se puede hacer con tests:**
  lanzar el `.exe` recién compilado durante 25 s → aparece
  `%APPDATA%\com.traininglab.desktop\backups\traininglab-00000001791208182431.json` con las 3
  series, los ajustes y la meta `hypertrophy`. Instalador nuevo (15 334 958 bytes) copiado al
  escritorio real.
- **Pendiente del dueño (no es un bloqueo):** reimportar las 410 series de Symmetry desde
  Ajustes → Importar Symmetry, y decidir si el aviso de recuperación debe también aparecer en
  Inicio en vez de solo en Ajustes.

## 2026-10-05 (j) — Registro de series para móvil: un número grande, «Siguiente serie», peso heredado

- **Encargo del dueño:** «rediseña el registro de series para móvil: un único campo numérico
  grande, acción "siguiente serie" y el peso heredado de la serie anterior salvo que se cambie».
  Viene detrás de «el manejo de las series todavía es horrible», así que el criterio no era
  que se viera bien: era que se pudiera registrar una serie con una mano, entre series, sin
  leer.
- **Qué hay ahora** (`features/today/SetEntryBar.tsx`, nuevo, montado por `SlotCard`):
  - **Un solo campo grande**, y es el de **repeticiones**, porque es el único número que
    cambia serie a serie. Va **prellenado** con el valor que se va a registrar, seleccionado al
    enfocar: escribir sustituye, y vaciarlo vuelve a heredar. El placeholder ya no es un
    rango, que es lo que se leía como «tengo que registrar un rango».
  - **El peso no se pide, se muestra.** Vive en una ficha a la derecha con lo que se va a usar y
    de dónde sale («repite la anterior» o «sugerido para hoy»). Un toque la convierte en el
    campo grande, y se vuelve a reps al registrar. La carga casi nunca cambia; pedirla cada vez
    era el ruido.
  - **Acción principal «Siguiente serie»**: barra ancha, la que un pulgar no puede no pulsar.
    En escritorio es un botón compacto con la misma acción, y Enter hace lo mismo.
  - Las reglas viven en `lib/set-entry.ts` (`resolveReps`, `resolveWeight`, `inheritedWeight`),
    puras y testeadas; el componente no decide nada.
- **Reglas de precedencia (idénticas en ambos lados):** lo tecleado gana → si no, la serie
  anterior → si no hay anterior, el mínimo prescrito (reps) o la sugerencia del plan (peso). Un
  `0` o un negativo cuentan como «en blanco», que era el bug de (i). Una última serie sin carga
  **no** envenena la cadena: una serie de peso corporal no convierte la siguiente en peso
  corporal si las dos anteriores usaron 60 kg.
- **Dos defectos encontrados viéndolo, no leyéndolo:**
  1. **El CSS nuevo estaba dentro del media query de móvil**, así que en escritorio la barra
     salía sin estilos: campo de 12 px, chip aplastado y el botón partido en dos líneas. La
     base está ahora **fuera** del media query y solo el tamaño del campo, el ancho de la ficha
     y el ancho de la barra son específicos de móvil. El comentario del CSS lo dice, porque
     volver a meterlo ahí es el error fácil.
  2. **El botón «Ver cómo se hace» se estampaba letra a letra** al aparecer la línea
     «Last: 2026-10-05 · 1 sessions»: el bloque derecho de la cabecera era `shrink-0` sin tope
     y empujaba el botón hasta no dejarle ancho. Corregido con `shrink-0 whitespace-nowrap` en
     el botón, `max-w-[52%]` y `truncate` en la línea de la derecha.
- **Verificación (comandos reales):** raíz `npx vitest run` → **990/990, 65 archivos** (+9
  tests de peso heredado) · `pnpm lint` **0/0** · `pnpm --filter traininglab-desktop build`
  **exit 0** · TrainingLab `npx tsc -b` **exit 0**. **QA visual en el navegador a 390×844 y
  1366×1000**, registrando de verdad: serie 1 = 12 reps sin peso, serie 2 = **22 kg × 12** con
  la ficha mostrando «22 kg · repite la anterior» y el campo offering 12; el temporizador de
  descanso salta en ambos casos. Los dos ajustes del punto anterior se comprobaron en pantalla
  antes y después.
- **Instaladores: reconstruidos los DOS desde este mismo commit** (`pnpm tauri build` en cada
  shell) y copiados al escritorio real. TrainingLab 0.2.0 sale **exit 0**; BodyLab 1.0.0-beta.8
  sale **exit 1 por `createUpdaterArtifacts`** (la clave de firma solo existe en `release.yml`),
  pero el NSIS se genera antes de ese paso. De ambos se comprobó el **contenido del bundle**, no
  solo que existieran: el de TrainingLab lleva dentro «Siguiente serie» y «repite la anterior»,
  y el de BodyLab lleva dentro «Hacia tu ideal». La regla de cierre que faltaba ya está escrita
  en `AGENTS.md`: ningún cambio de interfaz se cierra sin `tauri build` y copia al escritorio.
- **Pendiente de decisión del dueño:** el campo pasa a ser reps siempre. Para ejercicios de
  fuerza (peso-rango 3–6) quizá el número que más cambia sea el peso, no las reps; si quieres,
  se puede invertir el campo por defecto según el rango prescrito.

## 2026-10-05 (k) — La regla de cierre que faltaba: ninguna entrega con el `.exe` viejo

- **Reclamación del dueño:** «aunque no te lo pedí en este turno, tenía la regla en tus
  conocimientos y en AGENT de que cada cambio realizado en WEB debería verse ejecutado en la
  aplicación de escritorio, ambas en la misma versión, para las dos aplicaciones. De nada me sirve
  tener el servidor web funcional y la aplicación diez versiones atrasada». **Tenía razón**, y el
  incumplimiento era mío: la ronda (j) cerró el rediseño de registro de series con la pirámide en
  verde, con QA visual en el navegador a 390×844 y 1366×1000, y **sin tocar el instalador**. El
  `.exe` de su escritorio era el de (i).
- **Regla escrita en `AGENTS.md`** (sección Conventions, antes de «Things to avoid»), porque estaba
  solo como registro histórico en `knowledge.md` y no como criterio de cierre: todo cambio de UI o
  lógica en `bodylab/apps/web` o `traininglab/apps/desktop` termina en `pnpm tauri build` **desde
  el mismo commit**, con los **dos** instaladores copiados al escritorio real, comprobando el
  **contenido del bundle** (que la cadena nueva esté en `dist/assets`), no solo que el `.exe`
  exista. Se anota tamaño y hora, porque un timestamp es la prueba y el exit code de BodyLab miente
  (sale 1 por la firma del updater).
- **Cumplido en esta ronda, desde `3b44272`:** TrainingLab 0.2.0 **exit 0**, 15 335 972 bytes,
  bundle con «Siguiente serie» y «repite la anterior»; BodyLab 1.0.0-beta.8 **exit 1 por
  `createUpdaterArtifacts`** (esperado), 23 355 369 bytes, bundle con «Hacia tu ideal». Los dos en
  `C:\Users\andyh\OneDrive\Desktop`.
- **Un fallo real encontrado al smokear, y arreglado:** la primera ejecución de
  `smoke-desktop.ps1` dio **FAIL — «no main window title after 8s»**, y la segunda, sobre el mismo
  binario, dio **SMOKE PASS**. La causa no era la app: el script esperaba con un `Start-Sleep`
  fijo de 8 s a que WebView2 levantara la ventana, en una máquina que acababa de terminar un build
  release de Rust. Es un test que se pone rojo por suerte de reloj — y ese job corre también en CI
  (`e2e-desktop-smoke`). Ahora **espera a la ventana sondeando hasta 45 s**, sin cambiar ninguna
  aserción: si no aparece en 45 s, la app está rota de verdad y sigue fallando. Dos ejecuciones
  seguidas: **PASS**, y ahora dicen que la ventana apareció a los **0,5 s**, que es el dato que
  hacía falta para saber si 8 s eran poco o si el arranque se había colgado.
