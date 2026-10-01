# ROADMAP vivo — BodyLab + TrainingLab

> **Cómo usar este archivo (regla operativa):** es la memoria de trabajo entre
> sesiones. Toda sesión nueva lo **lee al empezar** y lo **actualiza al
> terminar** (marcar hecho con fecha, añadir lo descubierto, reordenar).
> Los ítems hechos NO se borran — se marcan `[x] (fecha)` para tener historia.
>
> Marcadores: `[ ]` pendiente · `[~]` en curso · `[x]` hecho (fecha) · `[!]` bloqueado (por qué) · `[?]` decisión abierta
>
> Dirección de producto (visión, IA, branding, plataforma): `docs/ECOSYSTEM_STRATEGY.md`.
> Fases de TrainingLab: `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md`.
>
> Última actualización: **2026-10-01 (m)** (se refinaron zonas de la máscara y drilldown
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
| BodyLab desktop        | **beta.6 construida y publicada** (primera con el arreglo del Historial); iconos de launcher regenerados                                                                                                                           | 2026-09-29                                                               |
| TrainingLab            | **app de escritorio propia** (`traininglab/apps/desktop`): plan del día de 90 min, readiness, inventario de equipo, coach local opcional, modelo de decisión aprendiendo, **shell Tauri 2 + instalador NSIS publicados**           | 2026-09-29                                                               |
| Historial compartido   | **mini servidor SQLite** (`scripts/lan-store.mjs` + `lan-api.mjs`, `pnpm lan --shared`): miembros/sesiones/series/registros de salud, login no estricto en LAN, aviso de que no es privado                                         | 2026-09-29                                                               |
| Plataforma pública     | **Release en GitHub** con los dos instaladores y alias estables (`releases/latest/download/<app>-setup.exe`), **README con vitrina**, **capturas generadas** y **Pages sirviendo ambas apps**                                      | 2026-09-29                                                               |
| Catálogo de ejercicios | **paquete core compartido `@fitness/bodylab-exercises`**: 94 ejercicios + traits de equipamiento/patrón/carga/progresión                                                                                                           | 2026-09-28                                                               |
| Puente de datos        | `bodylab-traininglab-link` **v2** (+ campos aditivos: `conditioning`, `personalRecords`, `trainingLog`) — TrainingLab ya **no lo necesita** para funcionar                                                                         | 2026-09-28                                                               |
| IA local               | Determinista + **modelo de decisión clase JEV implementado** + **puente LLM llama.cpp con tool calling** (opt-in)                                                                                                                  | 2026-09-28                                                               |
| Móvil / LAN            | Ambas apps usables en teléfono (≥40 px de objetivo táctil, sin desbordes a ~320 px) + `pnpm lan` / `LAN Server.bat` sirve **las dos** desde un puerto con hub                                                                      | 2026-09-28                                                               |
| Marca                  | Iconos reales (BodyLab índigo / TrainingLab naranja) como maestros raster en `resources/brand/`, rasterizados a favicon/apple-touch/512 + launcher Tauri + **`.ico` multinivel y accesos de escritorio con `IconLocation` propio** | 2026-09-28 (c)                                                           |
| Perfil                 | **`birthDate` es el dato; la edad se deriva** (`lib/age.ts`, migración de `age` al cargar) — se acabó la edad congelada                                                                                                            | 2026-09-28 (c)                                                           |
| Feedback en el entreno | **3 avisos sonoros sintetizados** (campana fin de sesión · logro al completar series · fanfarria al batir récord) + banner visual + **notificación local** al terminar el descanso                                                 | 2026-09-28 (c)                                                           |
| Estrategia             | `docs/ECOSYSTEM_STRATEGY.md` (JEV = producto de terceros, «clase JEV» = lo nuestro; JEV ≠ JEPA; arquitectura IA, branding, plataforma pública)                                                                                     | 2026-09-28                                                               |

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
- [ ] **Historial por ejercicio** (series, volumen, PR, tendencia) — hoy la
      tarjeta muestra la última sesión.
- [ ] **Editar/borrar una serie y una sesión completa + E2E** (criterio de
      salida T3: registrar→ver→editar→borrar).
- [ ] Biblioteca con filtros (músculo/equipo/patrón/nivel) + favoritos.
- [ ] Plantillas manuales (PPL, Upper/Lower, Full body) como datos editables.
- [ ] **Multi-perfil de equipamiento**: «casa» vs. «gimnasio» (hoy hay un único
      inventario; el owner quiere poder alternar).

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
