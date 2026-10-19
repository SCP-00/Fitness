# Informe de interfaces — TrainingLab (2026-10-16, ampliado 2026-10-18)

**Alcance:** estado real de cada interfaz de TrainingLab tal como está el código hoy,
verificado sobre el _bundle construido_ y con **los datos reales del dueño**, no con
datos de ejemplo. BodyLab no se toca en estas rondas (sigue congelado).

**Evidencia visual:**
[`docs/screenshots/2026-10-16/`](screenshots/2026-10-16/index.html) — la ronda del
informe; [`docs/screenshots/2026-10-18/`](screenshots/2026-10-18/index.html) — la del
**port de Entrenamiento (02)**, con las 13 capturas del bundle actual. Todas a
1440 × 900 (PC) y 390 × 844 (móvil), cada una tomada tras **afirmar** una cadena
visible en pantalla.

> La **matriz de destinos** que ordena el trabajo autónomo (mockup ↔ destino ↔ estado
> ↔ lo que falta) está en la §8; se actualiza en cada ronda y es la que decide qué
> pantalla toca después.

---

## 1. Método (lo que hace creíble el informe)

1. `vite build --base=./` en `traininglab/apps/desktop` → bundle servido por
   `node scripts/serve-lan.mjs --no-build --port 8090`.
2. Semilla **real**, por las vías de la propia app:
   `node .tmp-verify/gen-owner-seed.mjs` lee `owner-training-log.csv` con
   `lib/owner-log.ts` (el parser de producción) y escribe `seed-backup.json`
   (log + ajustes) y `seed-payload.json` (perfil, forma del enlace v2 de BodyLab).
3. Capturas con Playwright sobre el Edge instalado (`channel: "msedge"`), **contexto
   nuevo por toma** (cada uno con su propio IndexedDB), 1800 ms de asentamiento y
   aserción de texto antes de guardar el PNG.
4. Los `seed-*.json` **se borran de `dist/` al terminar** (no se publican).

### Datos usados (los del dueño)

| Dato                               | Valor                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre                             | Buendia                                                                                                                                                         |
| Nacimiento                         | 28/09/2005 → **21 años** (derivado por `profileAge`)                                                                                                            |
| Talla / peso                       | **176 cm / 76 kg**                                                                                                                                              |
| Sexo                               | masculino                                                                                                                                                       |
| Log importado                      | `owner-training-log.csv` → **19 sesiones, 442 series, 149 107 kg** de volumen, 02/09/2026 → 07/10/2026                                                          |
| Informe del importador             | `{sessions: 19, sets: 442, duplicates: 0, skippedNoId: 18, skippedBadRow: 0}`                                                                                   |
| Inventario derivado del propio log | barra + discos (104,3 kg / 2,5), mancuernas fijas (32,5 / 2,5), polea (81,6 / 4,5), máquinas (204,1 / 5), banco, rack, barra de dominadas, paralelas, esterilla |
| Mediciones antropométricas         | **vacías a propósito**: no hay medición real y el plan debe decir «sin datos», no inventarlos                                                                   |

Las 18 filas sin id son nombres que el catálogo no cubre honestamente (movilidad, cuello,
un nombre OCR ilegible): quedan contadas y **sin mapear**, no adivinadas.

---

## 2. Mapa de destinos y nivel de desarrollo

Ocho destinos en `app/nav.ts`. **Siete sirven pantalla real** (Historial entró el 16/10 y
Entrenamiento el 18/10); **uno** sigue siendo marcador honesto.

| #   | Destino           | Pantalla                                                                  | Nivel              | Qué hace hoy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Qué falta                                                                                                                                                                                                           |
| --- | ----------------- | ------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Hoy**           | `TodayScreen.tsx` (909 líneas)                                            | **Operativo**      | Fecha, botón Empezar/Continuar, fila de reanudar (sesión en curso o última sesión), día («Hoy toca» + familia principal), equipo necesario con contador de uso, filas de ejercicio con series/repeticiones/descanso y progreso `hecho/total`, enfoque del día, añadir ejercicio, etc.                                                                                                                                                                                                                                                  | Selector `Casa · Gym · Parque` (necesita decir qué equipo vive en cada sitio: decisión del dueño); la píldora de fecha no abre selector                                                                             |
| 2   | **Sesión (ZEN)**  | `SessionScreen.tsx` + `features/today/ZenSession.tsx` (1695)              | **Operativo**      | Registro serie a serie, rampa de calentamiento (1/4), demo de técnica (GIF/imagen del catálogo + cues), progresión recomendada con el número y su razón («Mantén la carga», «−2,5 kg»), temporizador de descanso, marcas D/F, terminar sesión                                                                                                                                                                                                                                                                                          | La pestaña **Rango** de la ficha está deshabilitada a propósito (no hay tabla publicada de rangos); copy de «Cues de técnica» mezcla idioma                                                                         |
| 3   | **Entrenamiento** | `TrainingScreen.tsx` + `lib/day-view.ts` (nuevos 18/10)                   | **Operativo (v1)** | La cola del día (mockup 02): orden propio con subir/bajar (y «Volver al orden del plan»), cambiar por alternativa legal misma-pattern/mismo-tipo-de-carga, quitar (una fila añadida a mano se borra; una del plan se salta y vuelve), vistas por equipamiento y por músculo, agrupación «para saber dónde empezar si algo está ocupado» con aviso derivado, «Añadir varios» con prescripción común (series · reps · descanso) y «¿Por qué estos?» con las razones **del propio plan**, la ventana de recuperación y los totales reales | La píldora de fecha no abre selector; el `Casa · Gym · Parque` del mockup sigue sin modelo de datos (decisión del dueño); sin arrastre (se mueve con botones) y sin «Desde mi rutina» mientras Rutinas sea marcador |
| 4   | **Historial**     | `HistoryScreen.tsx` + `closedSessionHistory` (`features/stats/derive.ts`) | **Operativo (v1)** | Las **19 sesiones cerradas** de su log, la más reciente primero: fecha local, nombre y procedencia, series de trabajo y de calentamiento, ejercicios con su nº de series, volumen (`peso × reps`, 149.107 kg en total) y marcas `D`/`F`. La duración sólo aparece cuando una fuente la sostiene. La regla de «cerrada» (el día ya pasó, o se cerró hoy con _Terminar sesión_) está en el propio helper, igual que la lee el MCP                                                                                                        | Entrenamiento y Rutinas siguen en marcador; falta la pantalla de importación de historial (CSV/Symmetry)                                                                                                            |
| 5   | **Progreso**      | `ProgressScreen.tsx` (638)                                                | **Operativo (v1)** | Últimos 30 días sobre el log real, volumen por familia, PRs, `ConditionCard` (condición física, cuerpo completo)                                                                                                                                                                                                                                                                                                                                                                                                                       | El mapa anatómico con **referencia externa de fuerza** es objetivo, no implementación (gate cerrado, ver `BUFFY_IMPLEMENTATION_BRIEF.md`)                                                                           |
| 6   | **Ejercicios**    | `ExercisesScreen.tsx` (296) + `ExerciseDetailScreen.tsx`                  | **Operativo**      | 151 ejercicios, búsqueda, filtros por familia/equipo/patrón, agrupación por familia con nivel de exigencia 1–5; ficha con Guía · Resumen · Historial                                                                                                                                                                                                                                                                                                                                                                                   | Pestaña Rango; sólo 12 ejercicios tienen indicaciones propias de variante                                                                                                                                           |
| 7   | **Semana**        | `WeekScreen.tsx` (471)                                                    | **Operativo**      | La semana de 7 días, resumen (77 series · 230 min en la captura), estrés por día (5,6/10 … 6,6/10), familias por día, ejercicios propuestos y **edición por día** (entrenar/descansar/familias)                                                                                                                                                                                                                                                                                                                                        | Nada crítico; el «Regenerar semana» no reescribe los días autorados (por diseño)                                                                                                                                    |
| 8   | **Rutinas**       | `PlaceholderScreen.tsx`                                                   | **Marcador**       | Ídem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Plantillas guardadas                                                                                                                                                                                                |
| —   | **Configuración** | `SettingsScreen.tsx` (730)                                                | **Operativo**      | Perfil (nombre, nacimiento, talla, peso, sexo), equipo (`GearPanel`), objetivos (`GoalsPanel`), panel compartido (`SharedPanel`), móvil/LAN (`MobileCard`), coach LLM local (`CoachPanel`), copias, datos de ejemplo y — **nuevo el 16/10** — **Importar historial**: su CSV corregido y el respaldo de Symmetry, con vista previa antes de escribir                                                                                                                                                                                   | —                                                                                                                                                                                                                   |

**Plano de fondo (no interfaz, pero es lo que la hace real):** motor determinista
(`session.ts`, `validator.ts`), modelo de decisión local explicable (`decision.ts`),
biblioteca de 151 ejercicios con traits, y una **superficie MCP de 22 herramientas**
declaradas (`TOOLS` en `scripts/fitness-mcp-server.mjs`: historial, estado, acciones y las de
BodyLab), cada acción con recibo, la **regla que la rechazó** con sus números y `undoToken` —
ver [`docs/MCP_TOOL_SURFACE.md`](MCP_TOOL_SURFACE.md).

---

## 3. Cambios de esta ronda (2026-10-16)

| Cambio                                 | Archivo                                                                                                                                                                                                    | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hoy es solo Hoy**                    | `screens/TodayScreen.tsx`                                                                                                                                                                                  | Orden del dueño: fuera el resumen rápido, los anillos de progreso, la tira de semana y el coach. Quedan las dos piezas que son _entrada_ de hoy, no lectura: la nota de recuperación y «Estado de hoy». `Terminar sesión` y «Enfoque de hoy» se conservan porque sin ellos se pierde funcionalidad (documentado en la cabecera del módulo)                                                                                                                                                                                                                                      |
| **La ficha pinta su referencia**       | `features/exercises/ExerciseThumb.tsx`, `screens/ExerciseDetailScreen.tsx`                                                                                                                                 | La ficha mostraba una caja de 16:10 **vacía** con una inicial, mientras `barbell-squat.gif` viajaba en el bundle sin usarse: `ExerciseThumbLarge` sólo pintaba `src` y nadie se lo pasaba. Ahora acepta `exerciseId` y resuelve la cascada GIF → imagen → monograma, con `object-contain` para no recortar el movimiento                                                                                                                                                                                                                                                        |
| **No inventar duraciones**             | `screens/TodayScreen.tsx`, `lib/i18n.ts`                                                                                                                                                                   | La fila de reanudar imprimía «22 series · **1 min**» cuando el log viene de una hoja sólo-fecha (el lapso entre primera y última serie colapsa a ~0). Por debajo de 5 min la duración no se imprime: queda «Crunch Oblicuo · Dominadas Pronadas · 22 series» (`hoy.stripLastShort`)                                                                                                                                                                                                                                                                                             |
| **Importación con pantalla (Ajustes)** | `screens/SettingsScreen.tsx`, `app/store.tsx`, `lib/i18n.ts` (10 claves `import.*`)                                                                                                                        | Los importadores siempre existieron en el store (`owner-log.ts`, `symmetry.ts`) y **ningún componente los llamaba**: meter su historial significaba escribir IndexedDB a mano o pedírselo a un agente por MCP. Ahora Ajustes tiene «Importar historial»: eliges el fichero, la app lo analiza, lo deduplica contra tu registro y **te dice cuánto entraría** antes de que confirmes. Los números de la vista previa salen del **mismo plan** que ejecuta la importación, así que no pueden divergir                                                                             |
| **Historial de verdad (08)**           | `screens/HistoryScreen.tsx` (nuevo), `features/stats/derive.ts`, `app/App.tsx`, `lib/i18n.ts` (21 claves), `tests/training/test_session_history.test.ts` (nuevo)                                           | El destino existía como marcador porque «nunca existió en el front antiguo»; los datos sí: el log real tenía 19 sesiones cerradas sin pantalla que las abriera. El helper `closedSessionHistory()` es puro y está probado (5 casos, con instantes **locales** para no depender del huso)                                                                                                                                                                                                                                                                                        |
| **Entrenamiento portado (02)**         | `screens/TrainingScreen.tsx`, `lib/day-view.ts` (nuevos), `app/store.tsx`, `app/App.tsx`, `lib/i18n.ts` (49 claves `ent.*`), `mockup.css` (clases `ent-*`), `tests/training/test_day_view.test.ts` (nuevo) | El destino decía «Próximamente» porque el front antiguo nunca tuvo esta pantalla — pero el mockup aprobado sí, y es la pantalla de la **cola del día**: dónde empezar si una máquina está ocupada, qué cambiar y qué quitar sin tocar el plan, y cómo añadir varios ejercicios con una prescripción común. Todo se escribe por los verbos que ya existían (`moveRow`, `swapRow`, `skipRow`, `removeAddedRow`), y el store ganó la prescripción opcional en `addExerciseToToday` (la misma que usa el MCP) y la exposición de `addedToday`/`removeAddedRow`/`addExerciseToToday` |

---

## 4. Verificación ejecutada (exit codes reales)

| Comprobación        | Comando                                                     | Resultado                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipos               | `cd traininglab/apps/desktop && ./node_modules/.bin/tsc -b` | **exit 0**                                                                                                                                                                                                                                                                                                                                                                              |
| Suite raíz          | `node_modules/.bin/vitest run` (desde `fitness-ecosystem`)  | **86 archivos / 1305 tests, todos en verde**                                                                                                                                                                                                                                                                                                                                            |
| Auditoría CSS       | `node scripts/css-class-audit.mjs`                          | **exit 0** (0 clases usadas-y-no-definidas, 0 entradas muertas en la allowlist)                                                                                                                                                                                                                                                                                                         |
| Build               | `./node_modules/.bin/vite build --base=./`                  | **exit 0**                                                                                                                                                                                                                                                                                                                                                                              |
| Capturas            | `node .tmp-verify/shots-real.mjs`                           | **12/12 con aserción de texto**                                                                                                                                                                                                                                                                                                                                                         |
| Ficha carga su GIF  | `node .tmp-verify/verify-real.mjs`                          | **✓ `./exercises/gifs/barbell-squat.gif` (180 px)**                                                                                                                                                                                                                                                                                                                                     |
| Hoy con su log real | `node .tmp-verify/verify-real.mjs`                          | **✓ «Tu última sesión fue hace 9 días»; ✓ sin «· 1 min»; ✓ sin resumen/coach/anillos**                                                                                                                                                                                                                                                                                                  |
| Historial real      | `node .tmp-verify/verify-real.mjs`                          | **✓ 19 tarjetas · «19 sesiones cerradas» · «422 series de trabajo» · «149.107 kg movidos» · último día 07 oct 2026**                                                                                                                                                                                                                                                                    |
| Importación real    | `node .tmp-verify/verify-import.mjs`                        | **8/8 ✓** con sus ficheros: «442 series nuevas de 19 sesiones», «18 filas no tienen equivalente», confirmar → «19 sesiones y 442 series fusionadas (0 duplicadas descartadas)», el contador sube a 442, reimportar el mismo CSV dice «Nada nuevo» con 442 duplicadas y el botón deshabilitado, y el respaldo de Symmetry dice «0 series nuevas de 20 sesiones» (el CSV ya las contiene) |

> El primer intento de comprobación pasó por bueno un estado **vacío**: sembraba el IndexedDB
> dentro de un `fetch().then(...)` y la transacción se cerraba sola antes de escribir. Esa
> trampa está escrita en la cabecera de `verify-real.mjs`, que ahora recibe la siembra como
> argumento y la escribe en el mismo turno del event loop.

> Nota: `tsc` debe invocarse con el binario de la app (`traininglab/apps/desktop/node_modules/.bin/tsc`,
> TypeScript 6.0.3). El del monorepo es 5.9.3 y falla con `TS5103` por `--ignoreDeprecations`.

### 4.1 Cierre — la regla de la regla de cierre (16/10, tarde)

La regla de AGENTS.md exige que todo cambio de UI termine en un instalador nuevo en el escritorio
real. Esta ronda **no empezó con el toolchain roto**: hoy se diagnosticó y se arregló.

| Paso                 | Comando                                                                                                                                          | Resultado                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain de Rust    | `rustup default stable-x86_64-pc-windows-msvc` y `rustup toolchain install stable-x86_64-pc-windows-msvc --profile minimal`                      | El toolchain en disco estaba **interrumpido** («missing manifest»); reinstalado → **rustc 1.99.1**                                                                               |
| Compilador C++       | `setup.exe modify --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet --norestart` (con elevación, aprobada por el dueño) | Build Tools 2022 estaba **sin `VC/Tools`** y sin SDK: hoy tiene **MSVC 14.44.35207** (`cl.exe` + `link.exe`) y **Windows SDK 10.0.26100.0**                                      |
| pnpm                 | `npm install -g pnpm@10` (tras borrar los shims rotos de `%APPDATA%\npm`)                                                                        | **pnpm 10.34.7** — `pnpm` no arrancaba (`Cannot find module …pnpm.mjs`) y `pnpm tauri build` fallaba antes de compilar nada                                                      |
| TrainingLab          | `pnpm tauri build` en `traininglab/apps/desktop`                                                                                                 | **exit 0** → `TrainingLab_0.2.0_x64-setup.exe`, **16,65 MiB**, 23:14                                                                                                             |
| BodyLab              | `pnpm tauri build` en `bodylab/apps/desktop`                                                                                                     | **exit 1** (documentado: `createUpdaterArtifacts` sin `TAURI_SIGNING_PRIVATE_KEY`) pero el bundle **sí se produjo** → `BodyLab_1.0.0-beta.8_x64-setup.exe`, **24,27 MiB**, 23:20 |
| Copia al escritorio  | `cp` a `%USERPROFILE%\Desktop` (en esta máquina OneDrive **no** redirige el escritorio)                                                          | Ambos `.exe` en el escritorio, 23:21                                                                                                                                             |
| Contenido del bundle | `grep` sobre `traininglab/apps/desktop/dist/assets`                                                                                              | Las cuatro cadenas nuevas están dentro: «Sesión a sesión», «Importar historial», «series nuevas de», «Nada nuevo»                                                                |
| Tests de BodyLab     | `cd bodylab/apps/web && npx vitest run`                                                                                                          | **11 archivos / 167 tests, en verde**                                                                                                                                            |

> El instalador **no se ejecutó**: instalarlo cambiaría la app que el dueño usa a diario, y eso es
> su decisión, no mía. El criterio de la regla de cierre (el `.exe` existe, es nuevo y lleva el
> bundle actual) sí queda cumplido y medido.

---

### 4.2 Verificación del port de Entrenamiento (2026-10-18)

| Comprobación      | Comando                                                            | Resultado                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tipos             | `cd traininglab/apps/desktop && ./node_modules/.bin/tsc -b`        | **exit 0**                                                                                                                                                                                             |
| Suite raíz        | `node_modules/.bin/vitest run` (desde `fitness-ecosystem`)         | **87 archivos / 1313 tests, verdes** (el port añade `test_day_view.test.ts`: 8 casos)                                                                                                                  |
| Auditoría CSS     | `node scripts/css-class-audit.mjs`                                 | **exit 0** — 152 clases definidas, 0 usadas-sin-definir, 0 definidas-sin-usar, allowlist al día                                                                                                        |
| Lint de lo tocado | `./bodylab/apps/web/node_modules/.bin/oxlint --quiet <4 archivos>` | **0 errores / 0 warnings** (el warning de `store.tsx` es previo y ajeno: `weekOverrides`)                                                                                                              |
| Build             | `./node_modules/.bin/vite build --base=./`                         | **exit 0**                                                                                                                                                                                             |
| Pantalla real     | `node .tmp-verify/verify-entrenamiento.mjs`                        | **26/26 ✓** sobre el bundle servido con su log: filas, orden que sobrevive al recargar, quitar/volver, las dos vistas, añadir varios con prescripción común, cambiar y 0 px de desbordamiento a 390 px |
| Capturas          | `node .tmp-verify/shots-real.mjs`                                  | **13/13** con aserción de texto → `docs/screenshots/2026-10-18/`                                                                                                                                       |

### 4.3 Auditoría de defectos gráficos y arreglos (2026-10-18, tarde)

El dueño pidió «perfeccionar pequeños errores gráficos». En vez de mirar pantallas, se
**midió**: `node .tmp-verify/audit-visual.mjs` recorre las **9 pantallas × 3 anchos**
(1440 · 1024 · 390) sobre el bundle servido con su log real y falla si encuentra
desbordamiento, texto recortado, objetivos táctiles < 44 px, inputs < 16 px, imágenes rotas,
404 o pantallas que no montan.

> **Primera lección de la ronda:** la versión inicial de la auditoría dio «sin hallazgos»
> sobre nueve pantallas **en blanco**. El `vite build` de Tauri deja `dist` con base absoluta
> (correcto para la app, roto para el servidor LAN: todos los assets daban 404) y mi script no
> comprobaba que la pantalla hubiera montado. La auditoría ahora **exige** la cadena propia de
> cada pantalla y caza 404 y peticiones fallidas; sin eso, un verde no significa nada.

Del primer informe real (44 hallazgos) salieron **diez defectos de verdad**, cada uno con su
causa medida y su arreglo:

| Defecto (medido)                                                                  | Causa                                                                                  | Arreglo                                                                                        |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| «Empezar» de cada fila medía **70 × 30** junto a botones de 44                    | la regla táctil de ≤ 640 px cubría `button`, `select`, `input`… pero **no `a.btn`**    | `a.btn` entra en la regla: un control no cambia de tamaño al cambiar de elemento (`index.css`) |
| La topbar de ZEN desbordaba su caja (**268 → 385** a 1024 y 9 px de página a 390) | `.nownext` con `nowrap` sin truncado: los nombres se salían y chocaban con los botones | `.nownext` con `overflow: hidden` y **solo los nombres** truncan con elipsis (`mockup.css`)    |
| Título de Progreso aplastado a **2 px** de ancho                                  | cabecera con `min-w-0` + controles `shrink-0`: encogía en vez de envolver              | `.tl-card-head` envuelve y el bloque de título conserva 11 rem (≤ 850 px)                      |
| «Análisis corporal · Mapa 2D…» en **43 px** (una palabra por línea)               | el `actions` del `SectionCard` (switch «Red de casa») se quedaba con el ancho          | `summary` envuelve la acción a otra línea (≤ 640 px)                                           |
| Selector de familia del mapa a **42 px y 12 px** de texto                         | sin regla táctil propia                                                                | `.tl-body-picker` a 44 px y 16 px (≤ 640 px)                                                   |
| Página de Ejercicios **+2 px** de ancho a 390                                     | tira de filtros `-mx-4` cuando el margen real del contenido es 14 px                   | `-mx-3.5 px-3.5` (full-bleed exacto, sin desbordar)                                            |
| Campos de máximo/incremento de equipo **recortaban su valor** (62 → 69 px)        | `w-16` (64 px) con `px-2` y espaciadores numéricos                                     | `w-20` en `GearPanel`                                                                          |
| Fila de presupuesto de Configuración **+4 px** a 390                              | 4 botones + campo numérico en un `flex` sin `flex-wrap`                                | `flex-wrap`                                                                                    |
| Buscador de «Añadir varios» a **14 px**                                           | dispara el zoom de iOS al enfocar                                                      | 16 px (`TrainingScreen`)                                                                       |
| Switch «Red de casa» con objetivo táctil de **24 px** de alto                     | `label:has(> input)` no casa cuando el checkbox está un nivel más adentro              | `label:has(input[type=checkbox])`, que sí lo cubre (+ `.icon-btn` a 44 px de ancho en móvil)   |

**Resultado final: `audit-visual.mjs` → SIN HALLAZGOS en 9 pantallas × 3 anchos (exit 0)**, con
exenciones declaradas (no silenciadas) para dos patrones intencionales: la tira de filtros
_full-bleed_ (scroller horizontal simétrico que cabe en el viewport) y el recorte del valor dentro
de un input de texto (el cursor lo desplaza por diseño).

## 5. Limpieza de datos basura (esta ronda)

- `traininglab/apps/desktop/dist/seed-backup.json` y `seed-payload.json` → **borrados** del bundle.
- `bodylab/apps/web/.tmp-node-names.json` → **borrado** (resto de un script).
- Logs de trabajo en `.tmp-verify/*.log` → **borrados** (los scripts de verificación se quedan).
- IndexedDB del navegador de previsualización → **vaciada y resembrada** con el log real; ya no
  hay datos de ejemplo mezclados. `localStorage` está vacío; la única base es `traininglab` con
  sus 442 series reales.

---

## 6. Decisiones abiertas (nada de esto se implementó por adivinar)

1. **`Casa · Gym · Parque`** en Hoy: falta el modelo de datos que diga qué equipo vive en cada
   sitio. Inventarlo cambiaría todos los planes en silencio. (El dueño aclaró el 16/10 que
   «solo Hoy» significa **la pantalla Hoy**, no el menú: los otros destinos se quedan.)
2. **Pestaña Rango** de la ficha de ejercicio: sin fuente publicada de rangos, se queda
   deshabilitada y con el motivo escrito.
3. **Un destino marcador: Rutinas.** Entrenamiento quedó portado el 18/10. La importación con
   pantalla (16/10) e Historial (16/10) también están hechas; lo que queda de esta serie es
   **Rutinas** (mockup 06) y, dentro de él, la decisión de si las plantillas guardadas son de
   usuario o de catálogo (hoy no existen en el modelo).
4. **Mapa de fuerza contra referencia externa** (Progreso): sigue siendo objetivo, con gate
   cerrado; el mapa actual es exposición/objetivos antropométricos y no puntúa fuerza local.
5. **Ruta móvil** (ver apéndice).

---

## 7. Apéndice — la ruta iOS/Android, con datos comprobados

Pregunta del dueño: «tengo un iPhone 11 Pro Max y Android Studio, ¿puedo desarrollar para
PC + iOS con xtool/WSL2/freebuff/MCP?». Resumen verificado (16/10/2026):

- **xtool no sirve para _este_ proyecto.** Construye **proyectos SwiftPM** y firma/instala en
  dispositivo; no compila proyectos `.xcodeproj`, ni CocoaPods, ni React Native, ni Flutter, ni
  **Tauri** (los issues #28 y #144 del repo, y el issue #13457 de Tauri, lo dicen). Nuestra app es
  React + Vite + **Tauri 2**: su iOS exige **macOS con Xcode completo** (documentado por Tauri),
  y WSL2 no puede aportarlo. Además `xtool setup` pide un `Xcode.xip` que el propio dueño descarga,
  y el EULA de Apple restringe instalar/ejecutar sus SDK en hardware no-Apple.
- **Lo que sí funciona hoy, gratis y sin Mac:** la **PWA**. El bundle ya es offline-first con
  IndexedDB y lo sirve `pnpm lan`; en el iPhone se abre por LAN y se añade a la pantalla de inicio.
  Es la vía recomendada para usarlo **ya** en su teléfono, sin firmas ni caducidades.
- **Android:** Tauri 2 **sí** compila en Windows con Android Studio + SDK/NDK + JDK 17 (los targets
  Rust de Android). Es la única compilación móvil nativa posible en su máquina hoy.
- **iOS nativo, si algún día lo quiere:** hace falta un Mac (o un runner macOS en CI). Con Apple ID
  gratuito la instalación en su propio iPhone funciona, pero el perfil de aprovisionamiento
  **caduca a los 7 días** (límites: 10 App IDs, 3 dispositivos, 3 apps por dispositivo) y no hay
  TestFlight ni App Store sin cuenta de pago.

## 8. Matriz de destinos y trabajo autónomo (2026-10-18)

La matriz que gobierna el **workflow autónomo**: cada fila es una pantalla del mockup
aprobado, su destino en el raíl, su estado real verificado y lo que la bloquea. El orden de
lectura es el del propio mockup (el mismo en el que se portaron 01, 03, 08 y ahora 02).

| #   | Mockup                  | Destino       | Estado verificado     | Lo que falta / bloquea                                                                                                        |
| --- | ----------------------- | ------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 01  | `01-hoy.html`           | Hoy           | **Operativo**         | Selector `Casa · Gym · Parque` (falta el modelo de qué equipo vive en cada sitio: decisión del dueño)                         |
| 02  | `02-entrenamiento.html` | Entrenamiento | **Operativo (18/10)** | — (sin arrastre: subir/bajar; «Desde mi rutina» enlaza ya a Rutinas, que la aplica por el verbo del store)                      |
| 03  | `03-sesion.html`        | Sesión (ZEN)  | **Operativo**         | Pestaña **Rango** (sin fuente publicada de rangos); cues de técnica con mezcla de idioma                                      |
| 04  | `04-semana.html`        | Semana        | **Operativo**         | Nada crítico («Regenerar semana» no reescribe los días autorados, por diseño)                                                 |
| 05  | `05-ejercicios.html`    | Ejercicios    | **Operativo**         | Alta de ejercicio propio y pestaña Rango; sólo 12 fichas con indicaciones propias de variante                                 |
| 06  | `06-rutinas.html`       | Rutinas       | **Operativo (19/10)** | Sin rutinas recomendadas ni planes mensuales: no hay fuente para esas afirmaciones; son plantillas del usuario, editables        |
| 07  | `07-progreso.html`      | Progreso      | **Operativo (v1)**    | Mapa de fuerza contra referencia externa: **gate cerrado**, objetivo no implementado (ver `BUFFY_IMPLEMENTATION_BRIEF.md` §3) |
| 08  | `08-historial.html`     | Historial     | **Operativo (v1)**    | Repetir/copiar una sesión del detalle; la duración sólo cuando una fuente la sostiene (hoy no la trae el CSV)                 |
| 09  | `09-ajustes.html`       | Configuración | **Operativo**         | —                                                                                                                             |

**Lectura de la matriz para el siguiente que llegue:** ya no queda ningún destino en marcador.
Los huecos conocidos son, ahora, los que dependen de una fuente o de una decisión: `Casa · Gym ·
Parque`, la pestaña Rango, el mapa de fuerza con referencia externa (gate cerrado), y las dos
cosas que el mockup 02 dibuja y la app no hace (arrastre real y alta de ejercicio propio).
«Desde mi rutina» ya está: el 19/10 Rutinas pasó de marcador a pantalla operativa.

## 9. Cierre del pulido (18/10, tarde)

Dos defectos sobrevivieron a la primera pasada porque **no eran visibles en la captura**, sino en
una medición concreta. Quedan cerrados y verificados sobre el bundle reconstruido.

| Defecto | Causa medida | Arreglo |
| --- | --- | --- |
| `.icon-btn` de 32 px de **ancho** en móvil (el alto ya era 32) | La regla correcta se escribió en `index.css`, pero `mockup.css` se importa **después** y la misma clase gana por orden | `.icon-btn { width: 44px }` dentro del bloque ≤ 640 px de `mockup.css`, junto a su regla base; `index.css` deja una nota de precedencia |
| `oxlint` volvió a **1 warning**: `getRange` leído durante su propia inicialización | `getRange` era una constante local usada por `submitQuickAdd`, un `useCallback` declarado **antes** que ella | `getRange` sube a ámbito de módulo en `Measurements.tsx` (pura sobre `MEASUREMENT_TYPES`); comportamiento idéntico |

**Números finales de la ronda:** `node .tmp-verify/audit-visual.mjs` → SIN HALLAZGOS (9 pantallas ×
3 anchos, exit 0) · `vitest run` raíz → 87 archivos / 1313 tests, exit 0 · `tsc -b` en TrainingLab y
en BodyLab web → exit 0 · `oxlint` 0 warnings / 0 errores · `css-class-audit` exit 0 ·
instaladores de la misma ronda: TrainingLab 16,65 MiB (15:46), BodyLab 24,27 MiB (15:47), ambos en
`C:\Users\andyh\Desktop`.

## 10. Rutinas (06) deja de ser marcador (19/10)

**Modelo decidido por el dueño, sin reinterpretarlo:** *plantillas del usuario, editables*. No hay
rutinas recomendadas, ni planes mensuales, ni «Popular / Para principiantes / Reto 30 días»: no
existe fuente para esas afirmaciones en la app, así que la pantalla muestra **tus** rutinas y un
estado vacío con las dos formas honestas de llenarlo (guardar el entrenamiento de hoy o crear desde
cero). Un dato guardado es un nombre + una lista ordenada de ejercicios con su prescripción
(series · reps · RIR · descanso); los minutos son una **estimación** (`setup + series × (0,5 min +
descanso)`) y así se imprimen, con `~`.

**Dónde vive y por qué.** `settings.routines` dentro del documento de ajustes, no un object store
nuevo: así cada copia de seguridad, restauración y autobackup ya lo lleva sin subir `DB_VERSION`, y
`normalizeSettings` pasa el mismo saneador que el editor — un backup editado a mano no puede meter
un ejercicio desconocido ni una fila de 99 reps: se descarta o se recorta.

**Qué hace la pantalla, y con qué verbos.**

- **Usar hoy** → `applyRoutineToday` → `addExerciseToToday` (el mismo verbo de Entrenamiento y de la
  acción MCP). Suma filas con la prescripción de la plantilla; no reescribe el plan ni la semana, y
  las que ya estaban hoy no se tocan (el recibo dice cuántas entraron y, si ninguna, lo dice).
- **Editar / Duplicar / Eliminar** → `saveRoutine` / `duplicateRoutine` / `deleteRoutine`; borrar
  pide confirmación en la propia hoja.
- **Guardar el entrenamiento de hoy** → instantánea de las filas que el usuario está viendo (tras
  swaps y saltos), nunca un re-plan.
- **Desde mi rutina** en Entrenamiento ya no es un botón muerto: enlaza a `#/rutinas`.

**Dos defectos gráficos cazados en el build real, no en el código:** `.field-label` era un
`<label>` inline y fluía **al lado** de su input en el editor (texto superpuesto). Se fijó
`display: block` en la regla compartida. Y los botones Guardar/Cancelar quedaban al final de un
modal de 88 vh: con 24 ejercicios posibles, «Guardar» no se veía al añadir uno. La barra de
acciones es ahora `position: sticky` (`.ru-actions`).

**Verificación (todo ejecutado):** `vitest run` raíz → **88 archivos / 1333 tests, exit 0**
(`tests/training/test_routines.test.ts` aporta 20) · `tsc -b` TrainingLab → 0 · `tsc -b` BodyLab
web → 0 · `css-class-audit` → exit 0 · `oxlint` (web) → 0/0 · auditoría visual
`node .tmp-verify/audit-visual.mjs` → **SIN HALLAZGOS en 10 pantallas × 3 anchos**, con Rutinas
incluida · flujo real en el bundle servido: crear desde hoy, crear desde cero, guardar, recargar
(la rutina persiste), «Usar hoy» (1 añadido, visible en Entrenamiento con ★), editar en sitio
(sigue habiendo 2, no se duplica) y confirmación de borrado. Instalador de la misma ronda:
`TrainingLab_0.2.0_x64-setup.exe`, 17.467.885 bytes (16,66 MiB), 16:57, copiado al escritorio real;
el bundle contiene la cadena nueva y ya no contiene el texto muerto de `soon.routines`.
