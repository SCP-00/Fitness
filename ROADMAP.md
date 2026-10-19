# ROADMAP vivo — BodyLab + TrainingLab

> **Cómo usar este archivo (regla operativa):** es la memoria de trabajo entre
> sesiones. Toda sesión nueva lo **lee al empezar** y lo **actualiza al
> terminar** (marcar hecho con fecha, añadir lo descubierto, reordenar).
> Los ítems hechos NO se borran — se marcan `[x] (fecha)` para tener historia.
>
> Marcadores: `[ ]` pendiente · `[~]` en curso · `[x]` hecho (fecha) · `[!]` bloqueado (por qué) · `[?]` decisión abierta
>
> Dirección de producto (visión, IA, branding, plataforma): `docs/ECOSYSTEM_STRATEGY.md`.
> Fases de TrainingLab: `fitness-ecosystem/docs/REDESIGN_STORM.md`.
>
> Última actualización: **2026-10-13 (a)** (**auditoría CSS↔clases**: `pnpm audit:css` compara, en
> cuatro direcciones, las clases que piden los componentes con las que define la hoja de estilos
> —usada y no definida, definida y sin uso con lista blanca motivada, nombrada sólo dentro de un
> `:has()`/`:not()`, y nombres montados en runtime— y el test raíz la ejecuta sobre la app real, así que
> CI ya cubre lo que ningún job miraba; primer barrido de TrainingLab **limpio** (tres clases sin regla,
> una rama muerta `:has()`, CSS muerto borrado) e instalador **TrainingLab 0.2.0** reconstruido y copiado
> al escritorio real 13-10 07:30 — ver `fitness-ecosystem/docs/AGENT_HANDOFF.md`).
> Anterior: **2026-10-12 (a)** (**el día del registro es el día
> local**, no el UTC — el bug partía el día a las 19:00, archivaba la sesión de
> la noche bajo mañana e inflaba «entrenos esta semana»; la **barra de registro
> rápido** de Inicio recupera su CSS (el port del mockup la había dejado sin
> estilos), **decide la carga de la siguiente serie** con la misma regla que ZEN,
> **acepta la marca D/F sin abrir la sesión** (armada y escrita con la serie) y
> convierte lb→kg al escribir la carga; instalador **TrainingLab 0.2.0**
> reconstruido y copiado al escritorio real 12-10 23:27 — ver
> `fitness-ecosystem/docs/AGENT_HANDOFF.md`).
> Anterior: **2026-10-05 (a)** (T1–T4 del bloque Symmetry cerrados y
> verificados en la app; **datos antropométricos reales del dueño importados en
> BodyLab** con un import reproducible; **ambos instaladores de escritorio
> reconstruidos** — TrainingLab 0.2.0 y BodyLab 1.0.0-beta.8 — ver
> `fitness-ecosystem/docs/AGENT_HANDOFF.md`).
> Anterior: **2026-10-04 (b)** (encargo del dueño: histórico Symmetry →
> sesiones reales en TrainingLab + **volumen semanal** en Progreso para validar
> progresos de fuerza/masa; el importador OCR ya está en 20/20 sesiones contra
> cabecera — ver `fitness-ecosystem/docs/AGENT_HANDOFF.md`).
> Anterior: **2026-10-04 (a)** (Tauri 2 a la última estable en ambas apps y endpoint
> del updater arreglado, commit `f6c4aef`).
> Anterior: **2026-10-01 (m)** (se refinaron zonas de la máscara y drilldown
> anatómico a ejercicios del catálogo; no cambia que la fuerza relativa externa siga pendiente).
> Anterior: **2026-09-30 (g)** (el handoff reporta la tarjeta whole-body
> `Condición física` implementada; no sustituye el mapa muscular de fuerza externa, aún
> pendiente de evidencia/aprobación. Se añadió brief detallado para Buffy con orden F2,
> aceptación PC/móvil y límites del prototipo: `docs/BUFFY_IMPLEMENTATION_BRIEF.md` y
> `docs/AGENT_HANDOFF.md`). Anterior: **2026-09-29 (e)** (rediseño TrainingLab completo:
> app modular de 5 pantallas con rail plegable, mapa 2D del propietario con
> doble lente entrenamiento/objetivos, reps por serie configurables,
> **TrainingLab 0.2.0 con instalador Tauri construido y smoke-testeado**).
> Anterior: **2026-09-28 (c)** (icono real en el lanzador de
> escritorio · **Born Date** en vez de Edad · **avisos sonoros** de campana,
> logro y récord · **notificaciones locales** del temporizador · paquetes de
> ejercicios a core compartido · constructor de sesión del día · modelo de
> decisión local clase JEV · puente LLM local con tool calling · inventario de
> equipamiento · corrección JEV ≠ JEPA)

---

## 0. Estado actual (snapshot verificado)

| Frente                 | Estado                                                                                                                                                                                                                             | Verificación                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| BodyLab web            | Beta pública de alta calidad                                                                                                                                                                                                       | **775 root · 110 web · lint 0/0 · typecheck OK · build OK** (2026-09-29) |
| BodyLab desktop        | **beta.8 reconstruida e INSTALADA** (10-06 22:57, `bodylab.exe` 24 442 368 B, `VersionInfo` `1.0.0-beta.8`; antes beta.6 del 09-29). **Última release publicada: beta.7** (10-02) — beta.8 sigue sin publicarse. Ajustes muestra ahora `Installed: v1.0.0-beta.8 · build 2026-10-06 22:54`. | **2026-10-06 (m) (DOM real del binario por CDP)** |
| TrainingLab            | **app de escritorio propia** (`traininglab/apps/desktop`): plan del día, readiness, inventario, coach local opcional, modelo de decisión, **shell Tauri 2 + instalador NSIS**. **0.2.0.** El binario instalado ya es el **build del 10-06 22:54** (antes, el del 10-05 07:11, que no llevaba el rediseño del registro ni el autobackup). Como el número sigue siendo `0.2.0`, ahora **Ajustes → Acerca de muestra `Compilación <fecha>`**, que es lo que distingue una build de otra. | **2026-10-06 (m) (DOM real del binario por CDP)** |
| Historial compartido   | **mini servidor SQLite** (`scripts/lan-store.mjs` + `lan-api.mjs`, `pnpm lan --shared`): miembros/sesiones/series/registros de salud, login no estricto en LAN, aviso de que no es privado                                         | 2026-09-29                                                               |
| Plataforma pública     | **Release en GitHub** con los dos instaladores y alias estables (`releases/latest/download/<app>-setup.exe`), **README con vitrina**, **capturas generadas** y **Pages sirviendo ambas apps**                                      | 2026-09-29                                                               |
| Catálogo de ejercicios | **paquete core compartido `@fitness/bodylab-exercises`**: 94 ejercicios + traits de equipamiento/patrón/carga/progresión                                                                                                           | 2026-09-28                                                               |
| Puente de datos        | `bodylab-traininglab-link` **v2** (+ campos aditivos: `conditioning`, `personalRecords`, `trainingLog`) — TrainingLab ya **no lo necesita** para funcionar                                                                         | 2026-09-28                                                               |
| IA local               | Determinista + **modelo de decisión clase JEV implementado** + **puente LLM llama.cpp con tool calling** (opt-in)                                                                                                                  | 2026-09-28                                                               |
| Móvil / LAN            | Ambas apps usables en teléfono (≥40 px de objetivo táctil, sin desbordes a ~320 px) + `pnpm lan` / `LAN Server.bat` sirve **las dos** desde un puerto con hub                                                                      | 2026-09-28                                                               |
| Marca                  | Iconos reales (BodyLab índigo / TrainingLab naranja) como maestros raster en `resources/brand/`, rasterizados a favicon/apple-touch/512 + launcher Tauri + **`.ico` multinivel y accesos de escritorio con `IconLocation` propio** | 2026-09-28 (c)                                                           |
| Perfil                 | **`birthDate` es el dato; la edad se deriva** (`lib/age.ts`, migración de `age` al cargar) — se acabó la edad congelada                                                                                                            | 2026-09-28 (c)                                                           |
| Feedback en el entreno | **3 avisos sonoros sintetizados** (campana fin de sesión · logro al completar series · fanfarria al batir récord) + banner visual + **notificación local** al terminar el descanso                                                 | 2026-09-28 (c)                                                           |
| Histórico Symmetry     | **importador OCR completo** (`scripts/import-symmetry.mjs`): 45 capturas → **20/20 sesiones, 425 series**; convención ÷2 en mancuernas bilaterales (crudo en `symmetryWeightKg`), `location` gym/casa por ≤26/09, series con hora, idempotente. **YA CARGADO EN LA APP** (Ajustes → Mis datos → Importar historial de Symmetry): **20 sesiones y 410 de 425 series**; las **15 descartadas tienen `exerciseId: null`** en el origen y la app lo indica en su mensaje. Roundtrip export = 412 series / 20 sesiones, JSON válido. | **2026-10-06 (integración: import real + export roundtrip)** |
| Estrategia             | `docs/ECOSYSTEM_STRATEGY.md` (JEV = producto de terceros, «clase JEV» = lo nuestro; JEV ≠ JEPA; arquitectura IA, branding, plataforma pública)                                                                                     | 2026-09-28                                                               |

### Verificación de integración (2026-10-06)

Hecho con la app real, no con tests unitarios. **Suites re-ejecutadas el 10-06 (m):** root **995/995
(66 archivos)** · web **118/118 (9)** · `pnpm lint` 0/0 · `pnpm typecheck` 0 · `tsc -b` 0. Los 21 e2e
de Playwright **no se volvieron a ejecutar** y siguen siendo el recuento del 10-05.

| Qué se probó | Cómo | Resultado |
| --- | --- | --- |
| `.exe` de escritorio | Lanzado el binario instalado y esperada la ventana | **TrainingLab 1,7 s** · **BodyLab 2,3 s**, ambos con título correcto |
| Versión instalada | `VersionInfo` del `.exe` (el grep de strings no sirve: Tauri/NSIS comprime los assets) | BodyLab **`1.0.0-beta.6`** vs instalador `beta.8` · TrainingLab `0.2.0` en ambos |
| Bundle de producción en navegador | Sirviendo los `dist` reales en la raíz (`8123`/`8124`; los bundles usan base absoluta `/assets/`, solo cargan en raíz) | Plan → sesión → registrar serie → `1/4`, `1/18` → descanso → **recarga y persiste** → Progreso se actualiza |
| Importación | JSON real de Symmetry, 20 sesiones / 425 series | **`sessions 0→20`, `sets 2→412`**; la app reporta *«410 series fusionadas (15 filas descartadas)»*; verificado que las 15 tienen `exerciseId: null` |
| Exportación | `Descargar copia completa (JSON)` y `Exportar backup` de BodyLab | Ambos JSON válidos; roundtrip = 412 series · 20 sesiones · settings · decisionModel (111 KB) |
| Historial | Pantalla Progreso tras el import | 20 sesiones · **391 series de trabajo** · 43 ejercicios · 18 días · 6 marcas; Epley correcto (204,1×10 → ~272 kg) |
| Esquema de datos | IndexedDB leída desde la página | `traininglab` v1 → `meta` / `sessions` / `sets` |

**Hallazgo principal — los binarios instalados estaban viejos. RESUELTO el 10-06 (m):** los dos
instaladores se construyeron desde el mismo commit, se copiaron al escritorio real y se instalaron
(`/S`, per-user); verificado leyendo el **DOM real de cada app instalada** por el puerto de depuración
de WebView2, no el código. La causa de fondo también está atacada: **la app muestra su sello de
compilación**, así que un binario viejo se ve, no se adivina. Sigue abierto que la REGLA DE CIERRE no
obliga a *ejecutar* el instalador, y que **beta.8 no se ha publicado** (la última release es
`v1.0.0-beta.7`, 10-02).

**Otros hallazgos de integración:**

- **Contadores con la misma etiqueta** (**ARREGLADO** en `7e5df86`): Ajustes dice ahora *«N series
  guardadas»* y desglosa *«X de trabajo, Y de calentamiento»*, y Progreso dice *«Series de trabajo»*.
  Los dos números suman a la vista.
- **Sin forma de pedir un día concreto** (**RESUELTO** en `7e5df86`): la app gana **Enfoque de hoy**
  (Automático · Empuje · Tracción · Pierna · **Core**). El día automático queda intacto y un día
  enfocado deja de reportar los avisos de cobertura de las familias que hoy no se le pidieron.
- **Calentamientos guardados con `reps: 0`** — la misma forma de dato que hizo desconfiar al dueño.
- **`0 sesiones` con series existentes**: la sesión solo cuenta al pulsar *Terminar sesión*.
- **Cuatro versiones hardcodeadas y tres valores distintos** (hallazgo de la verificación; **ARREGLADO
  el mismo día** en `1209eb3`): `Onboarding.tsx:624` = `v1.0.0-rc` · `ExportImport.tsx:68,108` y
  `db.ts:310` = `1.0.0` · `SettingsScreen.tsx:51` = `0.2.0`, frente al real `1.0.0-beta.8`. Ahora cada
  app deriva su versión de su único `apps/desktop/package.json` vía `define` en Vite.
- **Plan sin tracción** (**parcial**): con inventario vacío el planner avisa *«No hay ningún ejercicio
  de tracción posible con tu equipamiento»* y aun así emite un día **sin espalda** (Flexión Declinada ·
  Pistol · V-Up · Diamante · Crunch). Un día **enfocado** ya no arrastra ese ruido, pero el día
  **automático** lo sigue presentando como una nota más. Falta decidir con el dueño si debe bloquear o
  solo gritar, y hacerlo visualmente imposible de leer como nota menor.
- **El día se calculaba en UTC** (**ARREGLADO 2026-10-12**): todo el registro agrupaba por
  `timestamp.slice(0, 10)`, que es la fecha UTC. Al oeste de Greenwich eso parte el día a las 19:00
  locales: la serie de la mañana dejaba de contar como «hoy» por la tarde, la sesión de las 21:38 se
  archivaba bajo el día siguiente y «Entrenos esta semana» subía un día al registrar de noche. Ahora
  hay **una sola definición de día** (`lib/day.ts`, local) usada por store, Progreso, Semana, la
  biblioteca de ejercicios y la importación; test de regresión en `tests/training/test_day_key.test.ts`.
- **La barra de registro rápido de Inicio estaba sin estilos** (**ARREGLADO 2026-10-12**): el port del
  CSS de los mockups borró las 16 reglas `.tl-entry*` mientras `SetEntryBar.tsx` seguía usándolas, así
  que el campo grande de reps, el chip de carga y la barra «Siguiente serie» se dibujaban con los
  estilos por defecto del navegador. Restauradas desde `HEAD` (base + overrides de móvil).
- **Nada comparaba las clases usadas con las definidas** (**ARREGLADO 2026-10-13**): lo de arriba no lo
  vio ningún job porque TypeScript no lee una hoja de estilos, el linter no lee cadenas de clases y
  ningún test monta esas pantallas. Ahora `pnpm audit:css` (`scripts/css-class-audit.mjs`, con la lógica
  pura en `scripts/css-class-audit-lib.mjs`) compara las dos mitades en **cuatro** direcciones —una clase
  usada y no definida (sin lista blanca: siempre es un defecto), una definida y sin uso (aparqueada en
  `UNUSED_ALLOWLIST` con su motivo, y falla el día que recupera usuario), una nombrada **sólo** dentro de
  un `:has()`/`:not()` (rama que ya no puede casar), y entradas obsoletas de esa lista— y
  `tests/training/test_css_class_audit.test.ts` lo ejecuta sobre la app real dentro de `pnpm test`, así
  que CI ya lo protege. Primer barrido de TrainingLab: **limpio** — tres clases usadas sin regla
  (`.tl-entry`, `.tl-swap`, `.tl-offline-title`/`-hint`), una sin regla en el mapa (`.tl-body-goal-note`),
  la rama muerta `tl-zen-input`, y CSS muerto borrado (`.tl-set-row*`, `.tl-zen-fact*`). De paso, la
  tarjeta «Modo local» del raíl plegado ya no se dibuja como una caja vacía (queda el punto encendido) y
  el arnés de comportamiento, que enfocaba la clase renombrada `.tl-zen-input`, vuelve a recorrer la app
  entera: **76 PASS · 10 FAIL · 10 WARN**, con los diez fallos ajenos a este cambio (BodyLab sin bundle
  de LAN, cuatro expectativas del arnés sobre bloques **aún sin portar** —justo los que la lista blanca
  tiene aparcados— y uno del ZEN en móvil).
- **La carga tecleada en lb se guardaba como kg** (**ARREGLADO 2026-10-12**): el formulario escribía el
  número tal cual, sin `toKg`. Ahora pasa por `resolveEntryWeight` (`lib/set-entry.ts`), con test.
- **`Symmetry_Corregido.xlsx` del dueño es estructuralmente inconsistente** (fechas como serial de
  Excel, `implements` reutilizado como equipo en las filas 2–157 y `13` en las 158–439, `source` vacío
  en 269 filas, 24 filas sin `exercise_name`). Acordar el esquema **antes** de que termine de corregirlo.

**Acción inmediata (2026-10-06):** (1) **HECHO (m)** — los dos instaladores se reconstruyeron desde el
mismo commit, se copiaron al escritorio real y se **instalaron y verificaron** contra el DOM del binario
(BodyLab beta.6→beta.8; TrainingLab al build del 10-06 22:54), con los datos del dueño intactos.
(2) **Pendiente: importar el histórico de Symmetry en la app instalada** — probado, pero requiere un
clic en Ajustes → Mis datos porque «Restaurar mi historial» solo se ofrece con el log vacío. Sin eso, el
plan de la app sigue diciendo «0 series esta semana».

**Plan de hipertrofia de abdomen (2026-10-06 (m)):** en `docs/plan_hipertrofia_abdomen.md`, con el
registro explícito de cambios de suposición (sin déficit, peso estable, hipertrofia de la zona) y
ejecutable desde `Inicio → Enfoque de hoy → Core`.

**Siguiente acción recomendada:** cerrar Gate A de BodyLab (BL-REF-003) **y** en
paralelo la biblioteca/historial de TrainingLab (F2), que es lo que falta para
que el ciclo medir→entrenar→re-medir se sienta completo.

**Pendiente inmediato declarado por el dueño (2026-09-28 c):** planificador
semanal automático con **cadencia 0-6 días/semana** y **TAGs de entrenamientos
planeados**; **menús desplegables** (Chatbot Planner, Agregar Equipamiento,
Registrar Entrenamiento personalizado); pasada de QoL; **registro de
entrenamiento personalizado**.

**Resuelto el 2026-09-29:** el workspace público `Fitness` ya está en GitHub (con
release, Pages y CI corriendo), TrainingLab ya es app de escritorio y el historial
compartido por LAN existe. **Sigue pendiente:** el feed de auto-actualización
(la contraseña guardada de la clave del updater no coincide con la clave, así que
las builds salen sin firma y sin `latest.json`).

---

## 1. Principio rector (no cambia)

**BodyLab mide y explica tu cuerpo. TrainingLab entrena lo que BodyLab encontró
débil.** Todo es local, gratis, verificable y funciona sin IA. La IA propone; la
matemática y las reglas duras disponen; el usuario decide.

---

## 2. Plan por fases

### Fase A — BodyLab v1.0 (GA)

**A.1 Requisitos MUST (Gate A: 70/73)**

- [x] BL-MEAS-005 (2026-09-28) — conversión cm↔in / kg↔lbs (capa de display; el
      disco sigue en métrico; toggle en Ajustes; tipos con unidad no-longitud nunca
      se convierten). 12 tests web.
- [x] BL-PROF-004 (multi-perfil) — diferido a V1.1 por decisión del owner.
- [ ] **BL-REF-003** — perfiles de referencia personalizados (crear/editar/
      borrar además de los built-in). Medium. **Es el último MUST de producto.**
- [ ] **BL-3D-005** — export GLB del modelo 3D (medium; puede ir a V1.1).
      **Activo (2026-10-08):** el modelo anatómico por capas que el dueño pidió ya está
      en disco y verificado en Blender 5.2 (Z-Anatomy CC BY-SA 4.0 →
      `fitness-ecosystem/resources/anatomy/README.md`); el cuello de botella del 3D ya
      no es el asset sino el flujo/valor de `BodyViewer3D` (queja «no es útil»).

**A.2 Gates restantes**

- [ ] Gate I — doc/reference de los 10+1 paquetes core (incluye ahora
      `exercises` y `training`).
- [ ] Gate K — auditoría independiente (única gate roja): checklist verificable
      por gate con evidencias → release report → declarar V1.0.

**A.3 Distribución**

- [x] beta.1 → beta.4 (embebe conditioning/somatotipo/Navy/guías//history/export v2)
- [ ] Investigar el flake de primer arranque del smoke (WebView2 cold start)
- [ ] Endpoint real del updater (hoy `github.com/OWNER/REPO` placeholder)
- [ ] Firma del updater/certificado de firma (bloquea distribución pública seria)
- [ ] beta.5 o 1.0.0 estable cuando Gate A esté cerrado
- [?] ¿Publicar la web (GitHub Pages) antes del GA desktop?

### Fase B — TrainingLab F2 (biblioteca, programas, historial)

- [x] **Condición física whole-body (2026-09-30, según handoff)** — tarjeta en Progreso
      con Cooper, %BF, WHtR y FFMI, provenance y estados sin dato. No es un mapa de fuerza
      por músculo ni aporta por sí sola una norma de fuerza. Revalidar código/UI al retomar.
- [?] **Mapa de fuerza relativa vs. referencia externa (owner, 2026-09-30)** — vista
  principal del mapa: fuerza observada/estimada frente a un nivel “ideal” publicado;
  investigar cómo se sostienen sexo, estatura, peso corporal y edad en la fuente elegida.
  Añadir exposición por series como lente alternativa. Las normas citadas hasta ahora no
  justifican pintar fuerza aislada por cada músculo ni ajustar universalmente por estatura.
  No aprobar fórmula ni recolorear la app hasta documentar validez, límites, cobertura por
  ejercicio y el destino de la lente antropométrica existente. Handoff:
  `fitness-ecosystem/docs/AGENT_HANDOFF.md`; ejecución detallada:
  `fitness-ecosystem/docs/BUFFY_IMPLEMENTATION_BRIEF.md`.

- [x] **Package core compartido `@fitness/bodylab-exercises` (2026-09-28)** —
      catálogo movido desde la web, con `traits.ts` (requerimientos de equipamiento,
      patrón de movimiento, tipo de carga, unilateral, estrés articular/columna,
      ejes de progresión) y `equipment.ts` (presets + capacidades + límites + helpers).
      TrainingLab funciona **sin** BodyLab.
- [x] **Catálogo ampliado a 94 ejercicios (2026-09-28)** — 30 nuevos:
      remo invertido, flexión pike, fondos en banco, flexión diamante, press/remo/
      face-pull/curl/extensión con banda, dominada escapular, Y prono, paseo del
      maletín, peso muerto rumano a una pierna, sentadilla búlgara, subida al cajón,
      curl nórdico, plancha Copenhague, gemelo a una pierna, hueco, bicicleta,
      rueda abdominal, bicho muerto, plancha lateral, escalador y **6 bloques de
      cardio reales (bici MTB continua e intervalos de subida, escaleras, cuerda,
      burpees, circuito metabólico)** — la base de datos no tenía NINGÚN cardio pese
      a que BodyLab mide condición física.
- [x] **Sesión del día con presupuesto de tiempo + readiness (2026-09-28)** —
      `core/training/session.ts`; ver §4 (regresión real).
- [x] **Inventario de equipamiento ítem a ítem (2026-09-28)** — panel en la
      pantalla Hoy: presets (mancuernas ajustables con su máximo real e incremento,
      barra de dominadas prono/supino, paralelas, bandas, banco/cajón, bici, cuerda,
      escaleras, rueda abdominal, correa nórdica, máquinas/poleas de gimnasio) con
      capacidades derivadas, no escritas a mano.
- [x] **Sugerencia de carga mejorada (2026-09-28)** — histórico real + PR
      (e1RM Epley exportado por BodyLab) + techo e incremento del equipo propio +
      ajuste por agujetas; siempre explicada.
- [x] **Cambiar ejercicio (2026-09-28)** — sustitutos del mismo patrón y mismo
      tipo de carga, legales con el equipo disponible.
- [ ] **Vista de programa semanal** — el generador determinista
      (`generateRoutine`) sigue existiendo y probado (17 goldens) pero ya no está en
      la UI: añadir una pestaña «Semana» que lo muestre con `validateRoutine`.
      **Actualizado (2026-10-08):** la pestaña/pantalla Semana **existe** y ahora es
      **editable por el usuario con estrés estimado** (§4.4); lo que sigue sin UI es
      `generateRoutine` + `validateRoutine` (el plan mostrado sale de
      `buildWeekPlan`, no del generador semanal de rutinas).
- [x] **Historial por ejercicio con edición y borrado in-situ (2026-10-08)** —
      en `ExerciseDetailScreen.tsx`: series listadas por día con opción de editar peso/reps
      y botón de eliminar serie con recálculo automático de marcas y volumen.
- [~] **Editar/borrar una serie y una sesión completa + E2E** (2026-10-08):
      primitivas de base de datos (`deleteSession`, `updateSession`, `deleteSetsMany`) en `db.ts`
      y store (`removeSession`, `editSession`) completadas; edición de series en `SlotCard` y
      `ExerciseDetailScreen` operativas; pendiente lista visual de sesiones en Progreso y test E2E.
- [ ] Biblioteca con filtros (músculo/equipo/patrón/nivel) + favoritos.
- [ ] Plantillas manuales (PPL, Upper/Lower, Full body) como datos editables.
- [ ] **Multi-perfil de equipamiento**: «casa» vs. «gimnasio» (hoy hay un único
      inventario; el owner quiere poder alternar).

**Bloque «Histórico Symmetry + volumen semanal» (encargo del dueño 2026-10-04):**

- [x] **T1 · Curar la tabla ÷2 y mapear los 58 nombres → `exerciseId`** (2026-10-05) —
      los 13 huecos se cerraron **añadiendo 8 ejercicios al catálogo** (`crunch`,
      `decline-crunch`, `oblique-crunch`, `dumbbell-shrugs`, `tricep-kickback`,
      `wrist-roller`, `hip-abduction-machine`, `hip-adduction-machine` → **151**), con
      sus `traits` obligatorios y el pack LLM regenerado. Resultado: **53 nombres con
      id (13 vetables) y 410/425 series mapeadas (96 %)**, 0 sin resolver.
      **Pendiente del dueño:** vetar esas 13 propuestas y nombrar `pa® (Maquina)`
      (03/09, 18 kg ×4), que sigue sin equivalente.
- [x] **T2 · Carga del JSON en TrainingLab como sesiones reales** (2026-10-05) —
      `lib/symmetry.ts` (puro) + acción `importSymmetry` con fusión por id
      determinista: **reimportar es no-op** (probado en la app: 658 sets / 40 sesiones
      antes y después del segundo import). `warmup` ← badge W, D/F en `notes`,
      `durationSec`, timestamp a mediodía local.
- [x] **T3 · Revisión de interfaz con datos reales** (2026-10-05) — import executed en
      la app («20 sesiones y 410 series fusionadas»); Progreso, Ejercicios e Historial
      se ven con el histórico real. Sin encajes pendientes detectados.
- [x] **T4 · Volumen semanal en Progreso** (2026-10-05) — `weeklyVolume()` en
      `features/stats/derive.ts` (8 semanas, lunes como inicio, calentamientos fuera,
      lbs→kg) + `WeeklyVolumeCard` con total, tendencia contra la semana anterior
      (mismos días transcurridos) y top-5 familias. 8 tests nuevos. Semántica
      explícita: **tonelajelogged, no fuerza ni hipertrofia**.

### Fase C — IA local (clase JEV + LLM opt-in)

- [x] **Modelo de decisión local (2026-09-28)** — `core/training/decision.ts`:
      bandit contextual lineal con prior determinista, features documentadas, update
      online desde resultados reales, pesos acotados, `explain()` y `drift()`.
      12 tests (prior, aprendizaje, estabilidad a 500 updates, explicabilidad,
      persistencia hostil).
- [x] **Puente LLM local con tool calling (2026-09-28)** — cliente compatible
      OpenAI, presets llama.cpp/LM Studio/Ollama/Jan, bucle de herramientas acotado,
      `propose_session` como herramienta terminal + `validateProposal` (equipo,
      familia repetida, presupuesto). 11 tests con fetch inyectado.
- [ ] **Chat de planificación** (modo conversación, no solo una petición): el
      owner lo quiere cuando de verdad quiera planear a mano.
- [ ] **Archivos AGENT.md/SKILL del modelo local** (personalidad, reglas, tono)
      y prompt CSV-like ya disponible para LLM-friendly (§2.4 de la estrategia).
- [x] **Modelo de decisión tipado, clase LAYA (2026-10-01)** — contrato `choice`/`score`
      en `core/training/laya.ts` (25 tests): estado acotado con bandera de truncado, techo
      duro de 20 opciones (descomposición familia → ejercicio), `noul` descartada por su
      fallo documentado, y traducción a `modelScores` con suelo determinista y puerta de
      confianza. Tubería de entrenamiento **RLCD** en `ml/laya/` (38 tests pytest) con
      etiquetado débil, calibración de temperatura, export del registro y protocolo
      antes/después contra **nuestro propio suelo**. Informe: `docs/LAYAS_MODELO_DECISION.md`.
      Entrenamiento con datos reales pendiente; ruta recomendada Kaggle 2×T4.
- [ ] **Consumo en la app del modelo tipado** — `laya-serve` como proceso local o export
      ONNX INT8 + `onnxruntime-node`. Ninguna de las dos está implementada.
- [ ] **Ranker aprendido ONNX** (GBDT/MLP pequeño) como sustituto/mejora del
      bandit, misma interfaz `scoreExercise`. **Alternativa, no la vía principal**: el camino
      elegido es el modelo tipado de arriba.
- [ ] **Modelo de fatiga/recovery** (secuencia corta por familia).
- [ ] **Experimentación de investigación** (mundo latente tipo JEPA) — solo
      como publicación/experimento, nunca dependencia del producto.
- [ ] RIR/RPE capturado en el log (hoy se prescribe RIR pero no se registra) →
      alimenta el modelo y la autorregulación.

### Fase D — Ecosistema (ciclo cerrado medir → entrenar → re-medir)

- [x] Puente v1 → v2 con condición física (`conditioning`) y campos aditivos.
- [x] **Cardio real en el catálogo** (2026-09-28) — habilita «entrena tu
      condición física», no solo hipertrofia.
- [ ] **Import inverso TrainingLab → BodyLab** (resultados de sesión alimentan
      el historial de BodyLab) — decidir formato en F4.
- [ ] **Puente conditioning ↔ cardio**: usar el score de Cooper/FC para
      programar dosis semanal de Z2/intervalos (hoy solo dispara un bloque).
- [ ] Vista lectora del export en la pestaña Datos de BodyLab (resumen del JSON
      antes de descargar).
- [ ] Correlación score muscular ↔ medidas visible en Overview y modelo 3D.

### Fase E — Plataforma pública y release engineering

- [ ] CI real verificada en cada push (GitHub Actions ci.yml + release.yml)
- [ ] `pnpm check` como gate obligatorio de PR
- [ ] Publicar TrainingLab web (una pantalla, mismo enfoque que BodyLab Pages)
- [ ] README con la historia del ciclo cerrado + cifras de confianza
- [ ] Docs site (o carpeta `docs/` publicada) para la documentación de core
- [x] **Servidor LAN de un botón (2026-09-28)** — `scripts/serve-lan.mjs` +
      `LAN Server.bat` + `pnpm lan`: compila las dos apps con `--base=./` y las sirve
      desde un puerto con página hub (`/bodylab/`, `/traininglab/`). Es la vía de
      prueba en iPhone sin Mac.
- [ ] Menu de launchers raíz (`BodyLab.bat` / `BodyLab Dev.bat`) con TrainingLab
- [ ] **QR en el hub / en la app** para abrir la URL con la cámara en vez de
      digitar IP y puerto (pequeño codificador propio; hoy solo hay copiar)
- [ ] Página de descarga para usuarios finales
- [ ] Post técnico: «un modelo de decisión local que aprende de tus series»
- [?] Donaciones/patrocinios: definir la postura por escrito en el README

### Fase F — NutriLab (congelado)

- [!] Congelado hasta: BodyLab GA + TrainingLab F2 + 4 semanas de uso real.
- [ ] Alcance mínimo definido en `docs/ECOSYSTEM_STRATEGY.md` §6 (registro +
      macros + proteína objetivo desde el peso magro de BodyLab).

---

## 3. Deuda conocida de calidad (TESTING.md open-findings)

- [ ] #2: 7 ejercicios legacy sin media + **30 nuevos sin GIF** (los nuevos son
      media-less por diseño: grabar GIFs propios con OxiHuman es proyecto de contenido)
- [ ] #3: cobertura de componentes React ≈ 0 (BodyMap, BodyViewer3D, Onboarding,
      store reducer, migraciones de db) — test-setup listo
- [ ] #4: acciones del store (happy/error) solo indirectas
- [ ] #5: UI de export/import sin test de página (roundtrip de core cubierto)
- [ ] #6: migración IndexedDB v1→v2 sin test
- [ ] #7: cero asserts de accesibilidad en BodyLab; TrainingLab ya usa `aria-label`
      y foco visible (`tl-focusable`) pero tampoco tiene asserts automáticos
- [x] #0 P0 3D engine mismatch · #1 gluteus_medius sin ejercicios (2026-09)

---

## 4. Hallazgos de esta sesión (conocimiento que no se debe perder)

1. **El generador semanal rompía la pantalla Hoy con un catálogo de casa real.**
   Reproducido en vivo: `[weekly_volume] family "chest" gets 22 sets/week, above
the intermediate maximum (18)` + `rhomboids 3 below minimum (6)` → _ningún_
   plan. Causa raíz: las ventanas semanales duras + un catálogo con muchos
   movimientos compartidos. **Decisión**: la pregunta del día («¿qué hago en 90
   minutos?») la responde `session.ts` con ledger semanal rodante y avisos, no
   el validador semanal; el generador se queda para la vista de programa.
2. **Semántica del catálogo**: 64 ejercicios eran de gimnasio completo; ninguna
   entrada de cardio pese a que BodyLab mide Cooper/FC/%grasa. Un atleta de casa
   (barra, paralelas, mancuernas) se quedaba sin press vertical (no había pike
   push-up), sin remo horizontal (no había remo invertido), sin isquios sin
   barra (no había nórdico ni RDL a una pierna) y sin bici. Corregido con 30
   ejercicios nuevos.
3. **El texto de la UI no puede vivir en core**: las razones y avisos del
   planificador se emitían como frases en inglés y se colaban en la UI española.
   Ahora core emite **códigos + parámetros** y la app los traduce
   (`lib/format.ts`).
4. **La fusión de debilidades diluía la señal**: al no haber log, «volumen 100»
   empujaba todas las familias a ~77/100 y el orden perdía significado. Ahora se
   fusionan solo las señales que existen, y «nunca entrenado» cuenta como 0
   cuando el usuario **sí** tiene datos.
5. **`tauri.conf.json` referenciaba `icons/128x128@2x.png`, que no existía**
   (bug latente); regenerar el juego con `npx tauri icon` lo ha creado.
6. **El modelo de decisión puede confundir sin contexto**: mostrar «priorizado
   por tu modelo local» es honesto; decir «por tu registro» cuando no hay
   registro no lo era. Corregido.
7. **El icono del lanzador no era un problema de iconos, era del `.lnk`.**
   `BodyLab.lnk` apuntaba al `.exe` instalado el 5-sep con `icon=,0` — es decir
   «usa el recurso del ejecutable», que era anterior al arte de marca. Y el
   `install-shortcut.ps1` original creaba el acceso con
   `IconLocation = shell32.dll,175` (un glifo de Windows). **Regla**: fijar
   siempre `IconLocation` a un `.ico` propio y explícito; nunca confiar en el
   icono embebido de un binario que puede ser viejo. Además el escritorio real
   es `%OneDrive%\Desktop`, no `%USERPROFILE%\Desktop`.
8. **Los `.ico` no necesitan herramientas externas.** Windows Vista+ acepta
   entradas PNG dentro del contenedor ICO, así que `scripts/render-brand-icons.mjs`
   genera el `.ico` multinivel (16→256) con ~40 líneas de Node, sin ImageMagick
   ni `sharp`, reutilizando el chromium de Playwright que ya estaba instalado.
9. **Una edad guardada se pudre.** `Profile.age` era un número escrito a mano:
   un perfil creado a los 30 sigue a los 30 tres cumpleaños después, y con él se
   desviaban la regresión de %grasa, la edad corporal y las tablas Cooper. Ahora
   se guarda `birthDate` y la edad se **deriva** en la frontera de la UI
   (`lib/age.ts`); core sigue recibiendo `age: number` porque es matemática pura.
10. **Los avisos de audio deben sintetizarse, no almacenarse.** Osciladores en
    tiempo de ejecución = cero assets binarios (nada que licenciar, nada que
    pueda romper el bundler), compatible con el modo offline, y ajustables
    editando números. Y las tres señales se distinguen por **forma** (campana
    larga, arpegio, fanfarria), no solo por tono: así se reconocen desde el
    altavoz de un teléfono a distancia de brazo.

### 4.1 — 2026-10-07: rediseño de interfaz «desde cero» (PC) + tres carencias del dueño

El dueño pidió **reformular toda la UI sin tocar el backend**, enfocado 100 % en PC, y
señaló tres carencias esenciales: (1) UI cómoda, (2) assets de calidad, (3) **telemetría
que se guarde de verdad entre actualizaciones y sesiones**. (1) se atacó en esta pasada;
(2) y (3) **requieren decisión y trabajo de backend**, y quedan anotados aquí:

11. **Telemetría durable entre actualizaciones — requiere backend (pendiente).** Hoy la
    persistencia es IndexedDB dentro del perfil de la WebView2: sobrevive a sesiones, pero
    **no es un almacén propio de la app** y una actualización/reinstalación limpia del
    perfil puede perderlo (TrainingLab ya tiene autobackup JSON en
    `%APPDATA%\com.traininglab.desktop\backups`, que es el precedente a seguir). Lo que
    falta para «telemetría que se guarda de verdad» es un **esquema versionado + migrações**
    y, si se quiere histórico agregado, **exportación/importación o espejo local
    (`node:sqlite`) con claves estables**. Decisión del dueño antes de construir:
    ¿qué se mide (sesiones, series, PRs, uso de pantallas?), ¿dónde vive (IndexedDB
    versionado vs SQLite en disco vía Tauri), y **nunca sale de la máquina** (modelo
    offline actual) o hay servidor. **No implementado: tocarlo cambia el backend.**
12. **Assets de calidad — requiere pipeline de assets (pendiente).** Los GIFs de
    ejercicio y la máscara corporal son el cuello de botella de la percepción de calidad.
    Queda: GIFs propios con OxiHuman para los ejercicios legacy + los 30 nuevos
    (ver backlog §6), y mantener el manifiesto auditado
    (`scripts/audit-exercise-coverage.mjs`). Es trabajo de **core/asset pipeline**, no de
    frontend, por eso no entró en esta pasada.
13. **Densidad PC a 1440 px — medido, no solo intuido.** El plan de QA del dueño
    (borrado el 2026-10-09) marcaba «la columna central parece una app móvil
    estirada». Verificado con Playwright a 1440×900: **0 rutas con overflow horizontal**
    (8 de BodyLab + 5 de TrainingLab) y el contenedor nuevo `.bl-page` (1180 px) sustituye
    al `max-w-4xl` (896 px) que dejaba ~270 px muertos por lado.
14. **Contraste de `text-slate-400` corregido en la raíz, no en 121 archivos.**
    Tailwind v4 resuelve la utilidad a `var(--color-slate-400)` (verificado en el bundle
    construido), y el valor por defecto medía **2.63:1 sobre blanco** en 121 etiquetas
    pequeñas. El token se oscurece en `:root` (`#6b7a90`) y se restaura en `.dark`
    (`#90a1b9`, donde el contraste corre al revés): una regla, todas las llamadas.
15. **La paleta de TrainingLab NO cambió.** El contrato de interfaz condiciona el cambio de
    paleta al dueño; el rediseño tocó **forma** (radios 16→18 px, elevación en capas,
    gradiente en el pill activo y en `.tl-btn-primary`, segunda luz ambiental fría,
    tipografía con tracking negativo) con el ember `#ff7300` intacto y sus ratios de
    contraste medidos siguen valiendo.

---

### 4.2 — 2026-10-08: modelo muscular por capas localizado, licenciado y abierto en Blender

- **El encargo «descarga un modelo muscular anatómico en capas y ábrelo en Blender»
  estaba más avanzado de lo que se creía:** el disco ya llevaba desde el 2026-09-07 la
  descarga oficial de **Z-Anatomy** (`fitness-ecosystem/resources/anatomy/Z-Anatomy.zip`,
  86,7 MB) con su `Startup.blend` de 306 MB y el pipeline de exportación a GLB que
  alimenta `bodylab/apps/web/public/anatomy/` (está gitignored a propósito en `.gitignore`).
- **Lo que faltaba —y ahora está— es la verificación y la licencia:**
  - **Licencia comprobada en la fuente** (README del repo `Z-Anatomy/Models-of-human-anatomy`):
    **CC BY-SA 4.0**, derivada de **BodyParts3D (CC BY-SA 2.1 JP)**, con submodelos
    sueltos **NoComercial** (oído interno CC BY-NC-SA 4.0, riñón CC BY-NC 4.0) → uso
    personal del dueño compatible; **esta carpeta nunca se redistribuye** (los que se
    envían son los GLB compilados en `public/anatomy/`). Texto completo de atribución en
    `resources/anatomy/LICENSE-Z-Anatomy.txt` y procedencia en `resources/anatomy/README.md`.
  - **Cargado en Blender 5.2.1 LTS headless (exit 0):** 7 184 objetos / 4 569 mallas /
    1 944 colecciones, con **9 capas numeradas** (`1: Skeletal system` … `4: Muscular
    system` … `9: Regions of human body`), colecciones regionales por grupo muscular y
    **~983 objetos de músculo lateralizados `.l`/`.r`** → **no es una malla monolítica**,
    es exactamente «capas con distinciones de grupos musculares». Único aviso: 1 ciclo de
    dependencia en el esófago (no bloquea la carga). Render de prueba
    `resources/anatomy/preview-blender.png` (Cycles 16 spp, sin errores).
- **Candidatos alternativos** (solo registro; no hizo falta bajar ninguno): Sketchfab
  exige cuenta para descargar, Blend Swap exige cuenta, Free3D mezcla licencias;
  Smithsonian Open Access (CC0), BODYParts3D/Anatomography y NIH 3D Print Exchange
  siguen como plan B si algún día se quiere otro estilo.
- **Esto NO cerraba por sí solo la queja del 3D («no es útil»):** el asset estaba listo;
  el flujo/valor de `BodyViewer3D` era el problema. **Resuelto en §4.3 (mismo día).**

---

### 4.3 — 2026-10-08 (b): visor 3D rediseñado + P0 de predicción y Historial + sugerencias por volumen/frecuencia

Sesión grande del dueño (lista de quejas + SPEC del 3D). Todo **sin tocar el backend**:
los cambios de núcleo son en paquetes TS puros (`analytics`, `training`),
**ningún servicio/servidor nuevo** — la única dependencia nueva es el **asset GLB del
atlas** ya presente en `apps/web/public/anatomy/` (gitignored, compilado localmente).

1. **SPEC «el 3D no es útil» → visor por grupos musculares (CERRADO, verificado en
   vivo):** `BodyView.tsx` tenía un crash real (el componente lazy pasado sin envolver a
   `useState` se ejecutaba como inicializador con `props === undefined` bajo StrictMode);
   arreglado. Ahora el modo 3D (rayos X) carga el atlas Z-Anatomy y ofrece el panel
   **GRUPOS MUSCULARES**: 9 grupos con conteo (Pecho 16 · Espalda 92 · Hombros 28 ·
   Brazos 190 · Core 48 · Glúteos 42 · Piernas 194 · Cuello 185 · Tejidos 117),
   **aislar/foco** («7 en foco», `Ver todo`), **ojo de visibilidad** por grupo y
   **insignias de relevancia con los datos del dueño** (p. ej. `Pecho 96,0 cm (−9,0)`,
   `Bíceps 32,0 cm · Antebrazo 28,0 cm`) calculadas de sus mediciones vs referencia.
   Nuevos módulos: `bodylab/apps/web/src/lib/muscle-groups.ts` (clasificación +
   `computeMuscleRelevance`), `lib/anatomy-loader.ts` (etiquetado de grupos del atlas,
   visibilidad y tinte por grupo). Capturas + evaluación en vivo hechas; e2e
   `anatomy-xray.spec.ts` en verde (EN y ES).
2. **P0 «pecho >600 cm» (predicción inflada) → arreglado con modelo tortuga:**
   `bodylab/core/analytics/src/index.ts` `predictProgress` regresaba contra el **índice
   de muestra** (un import el mismo día explotaba → 681 cm de pecho); ahora usa el
   **eje de días real**, **tope `MAX_MONTHLY_RATE = 0.06`** (6 cm/mes) y **proyección
   de Zenón/media vida de 30 días** (`gain = s30/ln2 × (1 − 0.5^(t/30))`): la ganancia
   mensual **se reduce a la mitad cada mes** al acercarse al techo — la ley «Hércules /
   tortuga» que pidió el dueño. Tests nuevos de realismo en
   `tests/adversarial/test_analytics_adversarial.test.ts` (29/29).
3. **P0 «Agregar solo en Vista General» (Historial) → arreglado:** el panel flotante
   de lectura rápida vivía dentro de `renderOverview` y se desmontaba al cambiar de
   pestaña; movido al nivel de página en `Measurements.tsx` + botón «+» junto a cada
   valor existente en Longitudes/Anchuras/Composición. **Todas las medidas dictadas
   por el dueño quedaron registradas por UI** (estatura sentado 89 · envergadura 185 ·
   pierna 90 · brazo 33 · antebrazo 28 · mano 21.5 · muslo 40 · pantorrilla 55 · pie
   26.5 · biacromial 50 · anchuras 6/23/14/10 · grasa 17 % · muñeca 16.5).
4. **Sugerencias por volumen/semanal (docs de volumen-frecuencia):** `core/training/decision.ts`
   gana el rasgo **`consistencia`** (rasgo 3 de 8; pesos anteriores se **reinician
   automáticamente** en `normalizeModel` al cambiar la longitud — migración automática,
   sin dato corrupto) y `traininglab/lib/plan.ts` registra `lastDays` por familia +
   objetivo semanal **10/12/15** (banda 12–20, Baz-Valle 2022 en `lib/volume-target.ts`).
   Objetivo: **subir la probabilidad de repetición semanal** de las rutinas estables
   (no rotar cientos de ejercicios: sin repetición no hay sobrecarga progresiva).
   Tests: `tests/training/test_plan_consistency.test.ts` 8/8; suite training 327/327.
5. **Rediseños de interfaz:** **Ejercicios (TrainingLab)** reagrupada por familia con
   cabeceras fijas, **medidor de 5 puntos «Dificultad»** sustituyendo el «Nivel n"
   incomprensible + leyenda; **Progreso (BodyLab)** gana la tarjeta **Somatotipo**
   (ectomorfo/endomorfo/mesonormofobia Heath-Carter oficial: dueño **2.3-5.8-1.8 →
   mesomorfo dominante**, con las adaptaciones declaradas en la propia tarjeta); y
   **Ajustes → Objetivos (TrainingLab)** reagrupados V-taper/Brazos/Piernas con su
   ratio áureo visible y botón «Rellenar vacíos con la proporción áurea» (13 metas
   rellenadas al probar con su cintura 80).
6. **Verificación de la sesión:** `pnpm lint` 0/0 · `tsc -b` 0 en ambas apps · web
   **167/167 (11 archivos)** · root **1062/1062 (70 archivos)** · `pnpm check` EXIT 0
   con **21/21 e2e**. **Pendientes grandes** (no autorizados aún): rediseño completo de
   Progreso, semana editable por el dueño con estrés estimado (nunca alterar contenido
   del usuario sin autorización), sincronización entre dispositivos (requiere backend —
   ver decisión abierta §5), modelos/formulas 3D y de composición validados para
   mujeres, y respuesta LLM a preguntas de genética (el puente LLM local opcional ya
   existe; falta definir herramientas de respuesta).

---

### 4.4 — 2026-10-08 (c): Semana editable con estrés estimado + Progreso rediseñado

1. **Semana editable por el dueño — su contenido nunca se toca sin su acción
   (CERRADO, verificado en vivo):** `settings.weekOverrides` guarda un día
   autorado por índice (lunes = 0) que se superpone sobre el plan generado en
   `lib/week-stress.ts` (`applyWeekOverrides`): los días automáticos salen
   intactos — **regenerar solo rehace los automáticos** —, «Restaurar día del
   planificador» es la única vía de borrado (y es su pulsación), y hasta un día
   a medias (entrenar sin familias) se conserva como borrador en vez de
   borrarlo. Un día suyo de entrenamiento es además el **enfoque automático de
   Hoy** (la selección manual del día sigue ganando). UI en `WeekScreen`:
   botón Editar por día, chips de las 13 familias, insignia **Tuyo** en la fila
   y en la tira, aviso junto a Regenerar («Tus días son tuyos…»).
2. **Estrés estimado de su diseño (nuevo módulo puro `lib/week-stress.ts`):**
   puntuación 0–10 por día = `0.40·volumen + 0.30·articular + 0.20·densidad +
   0.10·duración` (volumen = series del día tope 24; articular = media
   `jointStress`/`spineLoad` (1–3) del catálogo por familia; densidad = días
   vecinos que también entrenan; duración = min/90), **+1 si la semana no
   tiene descanso y +1 si alguna familia se pasa de la banda 12–20**
   (`DEFAULT_WEEKLY_BAND`, Baz-Valle). Avisos: `no_rest_week`, `dense_day`
   (>5 familias), `back_to_back`, `family_over`, `family_zero`. Las series de
   un día suyo son **estimación declarada** (4 series/familia-día, la mitad de
   la banda sobre 4 días) — etiquetada como «estimado» en la UI, nunca se
   registra. Tests nuevos `tests/training/test_week_stress.test.ts` **14/14**.
3. **Progreso de BodyLab rediseñado para legibilidad (todo el contenido
   conservado):** `pages/Progress.tsx` pasa de un pilón de tarjetas a dos
   regiones con el ritmo editorial del design system — **«DÓNDE ESTÁS → Tu
   cuerpo hoy»** (meta áurea + tira de stats + Condición física ∥ Somatotipo
   en grid 2 columnas a ≥1024 px) y **«CÓMO EVOLUCIONA → Tu progreso en el
   tiempo»** (las 4 pestañas con su contenido). El somatotipo deja de ser un
   muro de texto: tres fichas (valor · banda · barra) y la honestidad del
   método plegada en `Adaptaciones del método` (sigue íntegra). Nada eliminado:
   GoalPanel, stats, condición, somatotipo, timeline, valores, comparación e
   historial siguen todos.
4. **Verificación de la pasada:** `pnpm lint` 0/0 · `tsc -b` exit 0 (ambas
   apps) · root **1076/1076 (71 archivos)** · web **167/167 (11)** ·
   `pnpm check` exit 0 con **21/21 e2e** · verificación en vivo en los dos dev
   servers (autorar descanso en Viernes → regenerar → el suyo intacto con
   insignia Tuyo → recarga → persiste → restaurar; Progreso con la rejilla
   `546px 546px` medida en DOM). REGLA DE CIERRE: instaladores construidos y
   copiados al escritorio real a las **15:04** (TrainingLab exit 0, 16.54 MiB ·
   BodyLab bundle 24.19 MiB con el código 1 esperado de firma), cadenas nuevas
   verificadas en `dist/assets` («Tus días son tuyos», «Restaurar día del
   planificador», «Dónde estás», «Adaptaciones del método»).

---

## 5. Decisiones abiertas

- [ ] §7.1 Repeticiones: rangos (implementado) vs fijos → cerrado a favor de rangos.
- [ ] §7.2 Progresión: ¿auto-escribir la carga sugerida al registrar la serie?
      (hoy se sugiere y el usuario teclea; `+incremento` al tocar el techo).
- [ ] §7.3 Captura de RPE/RIR en el log (alimenta al modelo de decisión).
- [ ] §7.4 ¿El LLM ajusta por sesión o solo el plan? → resuelto: **solo cuando el
      usuario lo pide**; el determinista es el suelo.
- [ ] §7.5 Nivel: auto-estimado por PRs vs pregunta inicial → hoy pregunta (y se
      puede ajustar en Preferencias).
- [ ] **¿Multi-perfil de equipamiento (casa/gimnasio)?** — sí, decidido: entra en F2.
- [ ] **¿Cuántos ejercicios por sesión quiere ver el owner en 90 min?** —
      el motor calcula 4-6; validar con uso real.
- [ ] **¿NutriLab** con la misma estética negro/naranja o paleta propia (verde)? —
      decidir cuando se descongele.
- [ ] **[BACKEND] Telemetría durable entre actualizaciones (2026-10-07)** — ¿qué se
      mide, dónde vive (IndexedDB versionado vs `node:sqlite` local vía Tauri) y si
      alguna vez sale de la máquina? Es requisito explícito del dueño y **no se puede
      construir en el frontend**; ver hallazgo 11 de §4.1.
- [ ] **[BACKEND] Assets de calidad (2026-10-07)** — pipeline de GIFs propios
      (OxiHuman) para los ejercicios que aún no tienen; ver hallazgo 12 de §4.1 y §6.

---

## 6. Backlog de contenido

- [ ] GIFs propios con OxiHuman: 7 legacy + 30 nuevos (incluye bici/escaleras,
      que quizá se resuelven con un icono/ilustración en vez de GIF).
- [ ] Guía de medición: tutoriales por zona (hoy texto + SVG).
- [ ] Fichas educativas nuevas para los 30 ejercicios (por qué, error común,
      cómo progresar en casa sin cargar más peso).
- [ ] Programa de ejemplo de 4 semanas con el equipamiento del owner (bici +
      barra + mancuernas) como contenido de arranque.

---

## 7. Historial de sesiones (1 línea)

- **2026-09-27 (a)** — Conditioning core completo (Cooper/FC/%BF/pliegues + J-P),
  somatotipo, Navy + guías ilustradas, tab Condición, export v2, panel de
  condición en Progreso.
- **2026-09-27 (b)** — J-P femenino corregido a la ecuación publicada JPW 1980,
  formulario Navy E2E, sitios ilustrados ♀/♂, página Measurements a `/history`.
- **2026-09-27 (c)** — Análisis de madurez (Beta pública, ~2 semanas a GA),
  T1 (validator de core/training, 36 tests), beta.4 de escritorio + smoke PASS,
  este ROADMAP creado.
- **2026-09-28 (a)** — BL-MEAS-005 cerrado; TrainingLab **F1** (pantalla Hoy,
  negro+naranja, adaptador v2 con 3 bugs reales corregidos); investigación
  Qwen3-4B + arquitecturas de mundo latente; estrategia y branding.
- **2026-09-28 (c)** — **Icono real en el lanzador** (`.ico` multinivel propio +
  accesos `BodyLab` / `BodyLab Dev` / `TrainingLab` / `LAN Server` con
  `IconLocation` explícito, y `TrainingLab.bat` + `serve-lan --open`); **Born
  Date** sustituye a Edad (migración automática, 20 tests nuevos); **3 avisos
  sonoros** sintetizados + banner de celebración; **notificaciones locales** del
  descanso con permiso bajo demanda; **752 root · 102 web · lint 0/0 ·
  TrainingLab typecheck + build OK**.
- **2026-09-29** — **Primera publicación pública** de `SCP-00/Fitness`: release con
  **los dos instaladores** (BodyLab beta.6 y TrainingLab 0.1.0, alias estables para
  los links del README), vitrina con capturas generadas y **Pages sirviendo ambas
  apps**; TrainingLab pasa a ser **app de escritorio** con su propio shell Tauri 2;
  **historial compartido por LAN con SQLite** (login no estricto, aviso de que no
  es privado) y su cliente en la app; los workflows se mueven a la raíz del repo
  (ahora CI y Pages **sí corren**); `corpus/` fuera del workspace pnpm (rompía el
  `--frozen-lockfile` de cualquier clone); **arreglado el Historial en blanco**
  (TDZ en `Measurements.tsx`) + test de humo que monta todas las páginas.
  **775 root · 110 web · lint 0/0 · builds OK.**
- **2026-09-28 (b)** — **Catálogo a core compartido** (`@fitness/bodylab-exercises`,
  94 ejercicios con traits) + **30 ejercicios de casa/cardio**; **constructor de
  la sesión del día** (90 min + readiness + ledger semanal) que resuelve la
  regresión que rompía la pantalla Hoy; **modelo de decisión clase JEV**
  (bandit contextual explicable, 12 tests); **puente LLM local con tool calling**
  y validación dura (11 tests); **inventario de equipamiento ítem a ítem**;
  razones/avisos estructurados y traducidos; iconos maestros SVG + pipeline de
  rasterizado + iconos de launcher Tauri; JEV ≠ JEPA corregido; ROADMAP por
  fases. **708 root · 82 web · 21 e2e · lint 0/0 · builds OK.**
- **2026-09-29 (e)** — **Rediseño TrainingLab completo y Tauri 0.2.0**: app modular
  (monolito TodayPage eliminado; `app/ui/screens/features/lib`) con **rail plegable
  245↔78 px persistido**, tags de contexto, tarjetas de ejercicio colapsables y
  **mapa 2D con el dibujo anatómico del propietario** (PNG + máscara de regiones)
  y **doble lente**: estímulo de entrenamiento (1 / 0,66 / 0,33, calentamientos
  fuera) y **objetivos** (medidas de BodyLab · objetivos propios en Ajustes ·
  proporción dorada anclada a la cintura); **reps por serie configurables** por
  ejercicio (persisten en settings, fluyen a Inicio/ZEN/sugerencia); ZEN v2 como
  ruta; **TrainingLab 0.2.0**: `@tauri-apps/*` alineados a 2.12, instalador NSIS
  construido y smoke PASS. **847 root · 110 web · typecheck + builds OK.**
- **2026-10-01 (m)** — Máscara 2D refinada para cubrir compartimentos identificados de
  serrato anterior, oblicuos, abdomen bajo y cuádriceps en ambas figuras; Progreso muestra
  focos anatómicos y ejercicios marcados como objetivo primario por el catálogo. El heatmap
  permanece agregado por familia; transverso profundo y cabezas individuales del cuádriceps
  no se presentan como observaciones independientes. **26 tests focales · TrainingLab typecheck
  - Vite build OK.** Ver handoff para fuentes y límites.
- **2026-10-01 (n)** — Auditoría frontend TrainingLab PC/móvil: traducciones faltantes de
  ZEN reparadas; selector de esfuerzo queda opcional/plegado y la acción principal deja de
  taparlo en móvil; acción sticky solo al enfocar carga/reps. El auditor se alineó con seis
  rutas y breakpoints.  **97 PASS / 0 FAIL, 907 root tests; TrainingLab typecheck + build OK.**
  Responsive Chromium 320–1440 px; prueba física del teclado iOS sigue pendiente.
- **2026-10-01 (o)** — Backend: **contrato del modelo de decisión tipado (clase LAYA)** en
  `core/training/laya.ts` (estado acotado, techo de 20 opciones, `noul` descartada, salida
  como `modelScores` sobre el suelo determinista) + **tubería de entrenamiento RLCD** en
  `ml/laya/` (espejo en Python, constructor de conjuntos desde el CSV real, etiquetador
  débil, métricas publicadas, calibración de temperatura, CLI) + **fixture dorado** que
  ata los dos idiomas. **932 root · 38 pytest · lint 0/0 · typecheck + TrainingLab tsc OK.**
  Línea base medida antes de entrenar; entrenamiento real pendiente de datos. Vulkan
  descartado con evidencia (PyTorch no lo soporta; ONNX Runtime nunca lo publicó).
  Informe: `docs/LAYAS_MODELO_DECISION.md`.
- **2026-10-05 (a)** — **T1–T4 del bloque Symmetry cerrados**: 8 ejercicios nuevos en
  el catálogo (151) y mapeo a **410/425 series (96 %)**; importación ejecutada en la
  app (20 sesiones, 658 sets, **idempotente al reimportar**); tarjeta de **volumen
  semanal** en Progreso con 8 tests; **installers reconstruidos** (TrainingLab 0.2.0,
  BodyLab beta.8). **947 root · 115 web · lint 0/0**. Nuevo
  `scripts/build-owner-import.mjs` → `.cache/bodylab-owner.json`: perfil (76 kg,
  1,76 m, 28/09/2005) + 10 medidas reales importadas por la propia interfaz de
  BodyLab; 8 valores del dueño **no** caben en `MEASUREMENT_TYPES` y quedan
  reportados, nunca inventados. Handoff: `fitness-ecosystem/docs/AGENT_HANDOFF.md`.
- **2026-10-04 (a)** — **Tauri 2 a la última estable** en ambas apps (tauri 2.12.1,
  tauri-build 2.7.1, updater 2.13.1, un único CLI 2.12.1, `rust-version` 1.90) y
  **endpoint del updater** a la etiqueta explícita `v1.0.0-beta.8/latest.json`
  - **2026-10-04 (b)** — **Importador E2E de Symmetry cerrado al 100%**: 20/20 sesiones
  cuadran con la cabecera de Symmetry (425 series), convención de peso bilateral ÷2
  aplicada con crudo preservado, `location` gimnasio/casa, series con hora, dígitos
  ilegibles recuperados por re-OCR; cargado en TrainingLab con volumen semanal. Handoff:
  `fitness-ecosystem/docs/AGENT_HANDOFF.md`.
- **2026-10-08 (u)** — **Sincronización de datos del dueño + Servidor MCP local + CRUD de series y sesiones**:
  import reproducible con 36 variables del dueño regenerado (`.cache/bodylab-owner.json`, 17% BF,
  longitudes y anchuras); modal de registro en BodyLab reparado para admitir coma decimal (`16,5`)
  sin truncar en Chromium; servidor MCP local `fitness-mcp-server.mjs` con 6 herramientas operativas;
  primitivas `deleteSession`, `updateSession`, `deleteSetsMany` en `db.ts` y store; edición in-situ y
  borrado de series en `ExerciseDetailScreen.tsx`.

