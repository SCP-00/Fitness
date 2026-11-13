# Fitness UX/UI — decisiones consolidadas (2026-11-07)

> **Autoridad única de diseño y experiencia.** Sustituye a `REDESIGN_STORM.md`,
> `UI_DESIGN.md`, `TRAININGLAB_UI_PLAN.md`, `plan_evaluacion_qa_ui_ux.md`,
> `INTERFACE_REPORT_2026-10-16.md`, `FRONTEND_UX_PLAN_2026-11-06.md` y `REPORTE.md`, retirados el
> 2026-11-07 por orden del dueño. No sustituye a `ARCHITECTURE.md`, `PRODUCT_SPEC.md`,
> `BUFFY_IMPLEMENTATION_BRIEF.md`, `DECISIONS_2026-10-19.md`, `MCP_TOOL_SURFACE.md`
> ni al log `AGENT_HANDOFF.md`.
>
> **Alcance:** TrainingLab como foco; BodyLab como mitad de medición del mismo
> ecosistema. La paleta, el mapa muscular y la puerta de referencia externa de fuerza
> siguen bajo las decisiones ya tomadas: no se reabren por una referenciavisual.
>
> **Estado de esta ronda:** documentación consolidada y siete especificaciones
> retiradas. **D3, D4 y D5 implementados el 2026-11-09**: Hoy en tres bloques con
> `Ajustar hoy`, ZEN móvil con registro primero y resumen con todas las series.
> El detalle de código, tests e instaladores está en `AGENT_HANDOFF.md`.

---

## 0. Qué se decidió en una página

1. **Un solo producto visual.** TrainingLab deja de tener dos lenguajes: el shell,
   el topbar, las tarjetas, los botones y los campos salen de un único sistema.
   Se termina la migración de las pantallas que aún viven dentro de `Legacy`.
2. **Una acción primaria por pantalla.** Hoy no puede competir consigo misma:
   `Empezar/Continuar` manda; todo lo demás (añadir, rutina, coach, enfoque, notas)
   vive en `Ajustar hoy`.
3. **En móvil, registrar primero.** ZEN pone la tabla de series y el campo de la
   serie siguiente antes que el GIF, la técnica y el calentamiento. La imagen sigue
   a un toque, no desaparece.
4. **Cerrar el ciclo.** El resumen de sesión muestra todas las series, no sólo la
   mejor por ejercicio; el historial permite volver al detalle sin buscar.
5. **Nada inventado.** Se mantienen separadas condición física, exposición,
   objetivos antropométricos y fuerza contra referencia externa. Sin fuente, se dice
   «sin referencia».
6. **Sin nutrición, sin cuentas, sin nube, sin paywall y sin telemetría.** BWS+ es
   una referencia de producto, no una autorización para cambiar el alcance.
7. **El coach propone; el motor dispone.** No se convierte la app en un chat ni se
   le da al modelo la capacidad de escribir un plan sin validación y deshacer.
8. **La mejora se entrega por pantallas, con criterio de aceptación y artefacto.**
   Nada de «rediseño entero» sin pruebas, capturas y el instalador de la misma ronda.

---

## 1. Método y evidencia

### 1.1 Qué se miró de verdad

- **Código actual de TrainingLab:** shell (`app/App.tsx`, `nav.ts`, `router.ts`),
  Hoy (`TodayScreen.tsx`, 1.010 líneas), ZEN (`features/today/ZenSession.tsx`,
  1.717), resumen (`SessionSummaryScreen.tsx`, 257), cola (`TrainingScreen.tsx`,
  1.084), Semana (531), Rutinas (1.454), Ejercicios (413), Historial (484),
  Progreso (644), Ajustes (935) y Coach (345).
- **Dos hojas de estilo conviviendo:** `mockup.css` (2.961 líneas, el lenguaje que
  usan Hoy/Entrenamiento/ZEN/Rutinas) y `index.css` (2.337, el lenguaje `tl-*` que
  siguen Ejercicios/Historial/Semana/Progreso/Ajustes).
- **Aplicaciones reales:** Hevy (web de escritorio y app Android), Strong, Fitbod,
  Jefit, Symmetry y Built With Science+ (BWS+), con capturas locales en
  `docs/reference/benchmark-2026-11-06/` (gitignored). Symmetry no se pudo ejecutar
  en qemu; BWS+ se instaló pero su APK es arm64 y el AVD es x86_64. Cuando no hubo
  UI nativa, se usó la ficha oficial y se dijo.
- **Historial de decisiones:** `AGENT_HANDOFF.md`, `DECISIONS_2026-10-19.md`,
  `RESEARCH_FEATURE_VALIDATION.md`, `BUFFY_IMPLEMENTATION_BRIEF.md` y
  `ARCHITECTURE.md`.

### 1.2 Límites de esta evidencia

- No hubo una prueba con usuarios reales; esto es auditoría heurística + código +
  benchmark de producto. No se debe presentar como «testeado con usuarios».
- Las capturas de las apps competidoras son referencias locales, no material para
  publicar ni para copiar píxeles.
- Los conteos de tests y los estados de pantalla cambian; la fuente viva es el
  código y el handoff, no este documento.

---

## 2. Comparativa: qué funciona y qué no se debe copiar

### 2.1 Las apps, una por una

| App          | Lo que funciona                                                                                                                                                                                                                         | Lo que cambiaría / no copiaría                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hevy**     | Un CTA primario para empezar; dentro de la sesión, `Add Exercise` es la acción clara y las métricas (tiempo, volumen, series) están arriba. La lista de ejercicios es escaneable y el descanso no estorba.                              | Su web no es responsive; el producto vive de cuentas, nube y capa social. La app nativa es la referencia, no su web. No copiar la densidad de feeds ni el modelo de suscripción.                              |
| **Strong**   | `Quick start` + cuadrícula de plantillas reduce el arranque en frío; la sesión activa se minimiza a una barra inferior persistente y se recupera sin perder el hilo; los controles son densos pero legibles.                            | No copiar la acumulación de plantillas de ejemplo ni la dependencia de suscripción. La barra persistente sí es un patrón que TrainingLab ya adoptó.                                                           |
| **Fitbod**   | La hoja de foco muscular antes de generar la sesión explica qué va a trabajar; el plan se siente guiado y el equipamiento es parte de la decisión.                                                                                      | El flujo observado termina en un paywall anual (COP 174.900) antes de entrenar. No copiar el muro, la opacidad del algoritmo ni el vocabulario de «optimización» sin evidencia.                               |
| **Jefit**    | Plan adaptativo y una semana visible; el reto/streak da un gancho de continuidad.                                                                                                                                                       | La home y el plan empujan a Elite/retos; demasiado ruido promocional para una app local-first. No copiar el paywall ni la gamificación forzada.                                                               |
| **Symmetry** | La tabla de series (`SET · PREVIOUS · KG · REPS`) está inmediatamente bajo el ejercicio; el descanso es persistente; el detalle de entrenamiento lista todas las series y marcas F/D. Es el mejor ejemplo de «registrar sin ceremonia». | No se pudo ejecutar en este AVD (qemu muere después de `MainActivity`). No copiar su falta de planificación/educación; TrainingLab debe conservar el ciclo completo.                                          |
| **BWS+**     | Entrenamiento + nutrición en una sola app, con un check-in como eje, educación contextual, recetas, escáner de comidas y un coach; la marca se siente coherente.                                                                        | Es de suscripción, su APK es arm64-only y la nutrición es un producto enorme. No copiar el escáner IA, el muro de pago ni la fusión de dominios; sirve para entender la categoría, no para reabrir nutrición. |

### 2.2 Los patrones que sí importan

1. **La sesión es el producto.** Todas las apps buenas reducen el registro a
   «ejercicio actual → peso/reps → registrar → descanso». La planificación y el
   análisis no deben meterse en ese camino.
2. **Una acción primaria.** Hevy y Strong tienen una entrada clara; las apps que
   compiten con varias acciones del mismo peso se sienten más lentas.
3. **La sesión activa no se pierde.** Strong la minimiza; TrainingLab ya tiene la
   barra global. Es un patrón correcto y hay que conservarlo.
4. **El cierre importa.** Symmetry muestra todas las series; TrainingLab ya tiene
   resumen, pero le falta la lista completa.
5. **Las plantillas reducen el arranque en frío.** Strong y las rutinas de
   TrainingLab lo confirman; la diferencia es que TrainingLab no debe guardar pesos
   dentro de la plantilla (segunda fuente de verdad).
6. **La educación va en contexto.** BWS+ y Symmetry explican sin bloquear; un muro
   de texto antes de registrar es un error.
7. **El equipamiento es una decisión de primera clase.** Fitbod y la cola de
   TrainingLab lo demuestran: «¿qué máquina necesito y está libre?» es parte del
   entrenamiento real.
8. **La confianza se gana con honestidad.** Una duración inventada, un PR falso o un
   mapa que pinta fuerza donde sólo hay volumen destruyen más confianza que una
   pantalla fea.

### 2.3 Lo que se rechaza explícitamente

- Cuentas, nube, telemetría, feed social y rankings: contradicen el modelo local.
- Paywall, prueba que se activa sola y gamificación que castiga faltar.
- Copiar la estética, el copy o los datos de otra app.
- Escáner de comidas, macros y nutrición dentro de TrainingLab en esta fase.
- Convertir el coach en un chat que decide el plan sin validación determinista.
- Inventar una referencia de fuerza por músculo cuando no hay norma aplicable.

---

## 3. Diagnóstico de TrainingLab (código actual)

### 3.1 Lo que ya funciona y no se toca

- **Motor determinista y datos honestos:** `session.ts`, `validator.ts`,
  `progression`, readiness, ventana de recuperación, presupuesto de tiempo y
  catálogo de 152 ejercicios con `traits`, equipo y técnica.
- **Registro rico:** calentamiento guiado, RIR, marcas D/F, progresión explicada,
  descanso persistente, saltar/posponer/cambiar y deshacer.
- **Continuidad:** barra de sesión en curso en el shell, resumen al terminar y
  tarjeta de cierre en Hoy.
- **Planificación elástica:** cola ordenable, alternativas legales, Semana con
  drag, rutinas, «desde mi historial», perfiles de equipo y `weekOverrides`.
- **Local-first:** IndexedDB, export/import, backups, sin backend ni cuentas.
- **Superficie MCP:** acciones con validación, recibo, regla y deshacer; el agente
  no puede borrar historial ni saltarse el motor.
- **Accesibilidad ya trabajada:** navegación móvil 4 + «Más», foco, `aria-live`,
  objetivos de 44 px en la barra y pruebas de clases CSS.

### 3.2 Los problemas que justifican esta ronda

| #   | Problema                                                                  | Evidencia actual                                                                                                                                                                         | Consecuencia                                                                                 |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | **Dos lenguajes visuales**                                                | `App.tsx` envuelve Ejercicios, Historial, Semana, Progreso y Ajustes en `Legacy`; usan `.tl-page`/`.tl-topbar` mientras Hoy/Entrenamiento/ZEN/Rutinas usan `.topbar`/`.content`/`.card`. | La app se siente como dos productos y cada pantalla nueva duplica decisiones.                |
| 2   | **Hoy compite consigo misma**                                             | La pantalla apila sesión, `ResumeRow`, tarjeta de resumen, enfoque, dos botones, coach, notas, recuperación y readiness.                                                                 | El usuario tiene que leer y elegir antes de la única acción que importa: empezar.            |
| 3   | **ZEN móvil no pone el registro primero**                                 | En `ZenSession.tsx` el orden es media/técnica → entrada de serie → tabla; el GIF ocupa la primera pantalla.                                                                              | En el gimnasio, con prisa, hay que hacer scroll antes de teclear la serie.                   |
| 4   | **El resumen no lista todas las series**                                  | `SessionSummaryScreen.tsx` muestra KPIs y la mejor serie por ejercicio; no el detalle serie a serie.                                                                                     | Se pierde el «qué hice exactamente», que es lo que Symmetry resuelve bien.                   |
| 5   | **Historial/Progreso/Ejercicios/Semana/Ajustes siguen en el shell viejo** | Los cinco están bajo `Legacy`; el CSS `tl-*` y el `mockup.css` no comparten primitivas.                                                                                                  | Deuda visual y de comportamiento; migrar una pantalla no arregla las otras.                  |
| 6   | **Rutinas es potente pero enorme**                                        | `RoutinesScreen.tsx` tiene 1.454 líneas y mezcla biblioteca, constructor, plantillas, historial y vista previa.                                                                          | Alta carga cognitiva; el usuario no ve un camino claro «elegir → ajustar → usar».            |
| 7   | **El coach tiene demasiadas puertas**                                     | Hoy tiene un botón propio, Ajustes un panel y existe `#/coach`.                                                                                                                          | Compite con «Empezar» y no queda claro cuándo es una ayuda contextual.                       |
| 8   | **La semántica de Progreso es delicada**                                  | Condición física, exposición, objetivos y fuerza externa conviven cerca; el gate del mapa sigue cerrado.                                                                                 | Riesgo de que el usuario lea un dato como otro; la UI debe separarlos con etiquetas y texto. |
| 9   | **El sistema visual está en dos capas**                                   | Tokens duplicados en `mockup.css` e `index.css`, estilos inline en pantallas grandes, gradientes decorativos aunque la regla dice «sin gradientes».                                      | Deriva visual y difícil mantenimiento.                                                       |
| 10  | **La navegación ya es buena, pero el contenido no siempre lo es**         | 8 destinos en escritorio; 4 + «Más» en móvil; el rail y la barra están probados.                                                                                                         | No hay que rehacer la navegación; hay que hacer que cada destino tenga una jerarquía clara.  |

### 3.3 Escenarios que deben seguir funcionando

Estos ocho casos son la prueba de regresión, no «personas» de marketing:

1. **Marta (gym, 45 min):** saber qué máquina usar y reordenar si está ocupada.
2. **Diego (casa, mancuernas):** progresar cuando no puede subir más peso.
3. **Nuria (calistenia):** reps/segundos, progresiones y equipo de parque.
4. **Lucía (yoga/movilidad):** secuencias, temporizador y lenguaje sin kilos.
5. **Ramiro (principiante):** una sesión clara, enseñanza y lenguaje llano.
6. **Sofía (interrupciones):** reanudar, mover la sesión y no sentir culpa.
7. **Álex (powerlifter):** % de 1RM, discos, aproximaciones y e1RM.
8. **El dueño:** una app que diga qué tocar, registre en dos toques y explique por qué.

---

## 4. Principios de interfaz (invariantes)

Cada pantalla nueva cumple estos puntos o no se publica.

1. **Un shell, un lenguaje.** Un topbar, un `content`, una tarjeta, un botón
   primario. Nada de `Legacy` ni de `tl-*` en pantallas migradas.
2. **Una decisión primaria por pantalla.** Las acciones secundarias se agrupan en
   `Ajustar` o en un menú contextual; no compiten con la principal.
3. **En móvil, el registro vive donde llega el pulgar.** Tabla y campos antes de
   la educación; técnica/GIF a un toque, no como peaje.
4. **La sesión no se pierde.** Si hay series, la barra de sesión está en cualquier
   destino y vuelve a ZEN; ningún flujo la esconde.
5. **El plan es elástico.** Saltar, posponer, cambiar, reordenar, mover la semana
   y deshacer caben; el usuario nunca queda atrapado en un orden rígido.
6. **Nada sin imagen, pero la imagen no bloquea.** Donde hay ejercicio hay GIF,
   still o un marcador honesto; en móvil puede estar plegada.
7. **Nada inventado.** Cada número tiene fuente, unidad y estado; «sin datos» no
   es cero y «sin referencia» no es rojo.
8. **Las métricas no se mezclan.** Condición física, exposición, objetivos
   antropométricos y fuerza externa son lentes distintas, con etiquetas distintas.
9. **Local-first y privacidad por construcción.** Sin cuentas, nube, telemetría,
   paywall ni descargas en segundo plano.
10. **El coach propone; el motor dispone.** Toda propuesta se valida, se explica y
    se puede deshacer; nunca escribe historial sin el humano.
11. **Máximo tres bloques en Hoy.** Lo demás se pliega, se mueve a otra pantalla o
    se convierte en una acción contextual.
12. **44 px, 16 px y cero scroll horizontal.** Objetivos táctiles, inputs que no
    hacen zoom en iOS, safe areas y foco visible; se verifica a 320/360/390/414 px.

---

## 5. Decisiones por pantalla

### D1 · Shell y sistema visual

**Decisión:** terminar la migración a un único shell. Las cinco pantallas que aún
usan `Legacy` se migran una por ronda a `.topbar`/`.content`/`.card`; se retira el
wrapper y se deja de usar `tl-*` para layout. Los tokens se mantienen en un solo
sitio y se importan en las dos hojas mientras dure la transición.

**Por qué:** el usuario no debe notar que una pantalla es «vieja». La duplicación
ya produjo dos tipografías, dos paddings y dos formas de topbar.

**Criterio de aceptación:**

- `App.tsx` no envuelve ninguna pantalla en `Legacy`.
- Las cinco pantallas migradas comparten topbar, `.content`, `.card`, `.btn`,
  `.field` y `.badge`.
- `pnpm audit:css` sigue en 0 incidencias.
- Captura 390×844 y 1440×900 de cada pantalla migrada; sin overflow horizontal.

**Orden:** Historial → Ejercicios → Semana → Progreso → Ajustes. Una por ronda.

### D2 · Navegación

**Decisión:** conservar los ocho destinos de escritorio y la barra móvil
`Hoy · Entrenamiento · Historial · Progreso` + `Más` (`Ejercicios · Semana ·
Rutinas · Ajustes`). `ZEN`, `Resumen` y `Coach` no son destinos primarios: se abren
desde el flujo.

**Por qué:** la navegación ya está medida, probada y resuelve el problema de los
41 px y el scroll horizontal. No es la deuda actual.

**Criterio:** los ocho destinos aparecen exactamente una vez; la pestaña activa es
legible; la barra mide 56 px; `test_mobile_nav.test.ts` sigue verde.

### D3 · Hoy: tres bloques y un `Ajustar`

**Decisión:** Hoy queda en tres bloques:

1. **Hoy toca** — sesión, duración, familias y equipamiento; `Empezar` o
   `Continuar` como única acción primaria.
2. **Cómo estás** — energía, motivación y molestias en una tarjeta compacta,
   plegable; el detalle de familias doloridas se abre dentro.
3. **Ajustar hoy** — un único botón/hoja con `Añadir ejercicio`, `Desde rutina`,
   `Enfoque de hoy`, `Coach` y notas del plan.

La tarjeta de sesión completada aparece **sólo** cuando hay una sesión cerrada y
lleva al resumen; no es un bloque permanente. `ResumeRow` aparece sólo si hay algo
que reanudar o una última sesión que recordar. La nota de recuperación se integra
en la tarjeta de sesión como una línea, no como párrafo suelto.

**Por qué:** ahora hay hasta nueve elementos apilados y tres CTAs del mismo peso.
El usuario cansado necesita una sola decisión.

**Criterio:** en 390×844, antes de hacer scroll se ve la sesión y `Empezar`; el
segundo bloque es `Cómo estás`; `Ajustar` abre una hoja con las cinco acciones y
ninguna de ellas vive suelta en la pantalla. No se pierde ninguna función.

**Implementado 2026-11-09:** `TodayScreen.tsx` queda en sesión → `Estado de hoy`
→ `Ajustar hoy`; la tarjeta de cierre sigue siendo condicional y `ResumeRow` sólo
aparece si hay algo que reanudar o recordar. La hoja contiene enfoque, añadir,
rutina, coach y notas; el CTA primario sigue siendo sólo `Empezar/Continuar`.
Playwright a 390×844: sin overflow horizontal; la hoja mide `305.4–844` y Escape
la cierra. La recuperación ahora es una línea dentro de la tarjeta de sesión.

**Ajuste 2026-11-09 (c):** en ≤900 px la topbar de Hoy gana un acceso secundario
a la **misma** hoja (`adjust-today-top`), porque la tarjeta de sesión puede dejar
el tercer bloque a más de 1.600 px del inicio. No añade una acción ni compite con
`Empezar`: la topbar usa dos filas, fecha + ajuste y el CTA primario a ancho
completo. En escritorio el acceso desaparece y el tercer bloque sigue siendo la
puerta visible.

### D4 · ZEN: registrar primero en móvil

**Decisión:** en `<900 px`, el orden de la pantalla es:

1. Topbar compacto: ejercicio actual, siguiente, progreso `2/4`, salir.
2. **Tabla de series de hoy** (serie, peso, reps, RIR, F/D, anterior).
3. **Entrada de la serie siguiente** con peso/reps/RIR y `Registrar` grande.
4. **Descanso persistente** y recomendación de progresión.
5. Técnica/GIF/calentamiento en un `details` o botón `Técnica` (no elimina la
   imagen; la hace contextual).

En escritorio se conserva la composición en dos columnas: media/técnica a la
izquierda, entrada y tabla a la derecha. No se toca la lógica de warm-up, RIR,
marcas ni progresión.

**Por qué:** el benchmark y el uso real coinciden: en el gimnasio se viene a
registrar. El GIF es útil, pero no puede ser el peaje de la primera pantalla.

**Criterio:** a 390×844, sin scroll, se ve al menos la tabla y el campo de peso de
la serie siguiente; el botón `Registrar` está a un pulgar; no hay scroll horizontal;
la técnica sigue a un toque; el flujo de teclado de escritorio no cambia.

**Implementado 2026-11-09:** `ZenSession.tsx` ordena en móvil con `order`
(`log 1`, `entrada 2`, `media 3`) y conserva la composición de escritorio.
`Registrar` es el mismo botón y el mismo handler, en un CTA fijo sobre la barra
inferior. Playwright a 390×844 midió tabla `135.6–414.8`, peso `536.2–580.2`,
CTA `716–768`, nav `777–844`, sin scroll horizontal; registrar una serie pasó el
progreso a `1/20`.

**Edición de serie añadida 2026-11-12:** cada fila registrada de `.zen-sets`
tiene un botón `Editar serie N`; abre peso, reps y D/F en la misma tabla. Guarda
por `editSet` con `setEditPatch`, así que conserva el Deshacer global de 20 s y
no abre ventana si no cambia nada. Escape cancela la edición sin salir de ZEN y
el foco vuelve al botón de la fila. No se tocó el motor ni la lógica de datos.

### D5 · Resumen de sesión

**Decisión:** el resumen lista **todas las series** de cada ejercicio (peso, reps,
RIR, F/D, calentamiento), agrupadas por ejercicio y en el orden de la sesión. Los
calentamientos se marcan y no cuentan volumen. Se mantienen los KPIs, la duración
sólo si es fiable y la mejor serie; se añade una acción `Volver a hoy` y otra
`Ver historial`.

**Por qué:** Symmetry hace visible el detalle y el usuario lo usa para comparar; el
resumen actual se queda en totales.

**Criterio:** una sesión con 4 ejercicios × 4 series muestra 16 filas; los
calentamientos aparecen marcados; no se inventa un peso para bodyweight; los tests
de `session-summary` cubren el caso.

**Implementado 2026-11-09:** `summary.exercises[].entries` expone cada serie con
peso, reps, duración, esfuerzo y marca D/F; la pantalla las agrupa por ejercicio y
las pinta en una tabla. En el ejemplo real de 6 ejercicios se mostraron **21 filas**
(1 calentamiento), sin overflow a 390×844. La columna se llama **Esfuerzo**, no RIR:
el logger persiste `TLSet.rpe` (1–5) y no existe un RIR por serie; etiquetarlo como
RIR sería inventar una escala. Los calentamientos se marcan y siguen fuera del
volumen.

### D6 · Entrenamiento (cola del día)

**Decisión:** conservar la cola, el drag, las alternativas y las vistas
`Mi orden · Equipo · Músculo`. Simplificar la jerarquía: el título y el resumen
arriba; la lista es el contenido; `Añadir varios`, `Desde rutina` y `Coach` se
agrupan en un solo `Añadir / ajustar` para no dejar tres botones sueltos. El pie
de tiempo/series se queda, pero sin competir con `Empezar`.

**Por qué:** la funcionalidad es buena; el problema es la acumulación de controles
y textos explicativos.

**Criterio:** una sola acción primaria (`Empezar`); `Añadir / ajustar` abre las
opciones; el orden y las alternativas siguen funcionando; el test de drag y la
auditoría CSS siguen verdes.

### D7 · Semana

**Decisión:** conservar la rejilla de siete días, el arrastre y la edición por día.
Migrar al shell único; el pasado muestra lo hecho, el futuro lo previsto y el
descanso se distingue sin color solo. `Regenerar semana` y `Ajustar semana` viven
en un menú, no como botones permanentes.

**Por qué:** la semana ya resuelve el problema real (mover la sesión cuando la vida
se cruza); su deuda es visual y de ruido.

**Criterio:** arrastrar un día intercambia los planes; el volumen se recalcula;
no se pierde `weekOverrides`; 390 px sin overflow.

### D8 · Rutinas

**Decisión:** reducir la pantalla a tres zonas:

1. **Mis rutinas** — tarjetas con nombre, días, duración y equipo; `Usar hoy`,
   `Editar`, `Duplicar`.
2. **Biblioteca** — búsqueda/filtros y añadir uno o varios.
3. **Constructor** — la rutina en edición, con prescripción inline y un resumen
   de equipo/tiempo.

Las plantillas y `Desde mi historial` son entradas, no secciones permanentes. La
rutina nunca guarda un peso: la carga se deriva del historial al aplicarla.

**Por qué:** 1.454 líneas y cinco modos en una sola pantalla no son un flujo; son
un panel de administración.

**Criterio:** crear una rutina de 5 ejercicios requiere ≤3 decisiones visibles;
`Usar hoy` no duplica la sesión; el equipo requerido se calcula de la lista.

### D9 · Ejercicios

**Decisión:** migrar al shell único; buscador y filtros arriba; tarjetas con
miniatura, familia y equipo; ficha con `Guía · Resumen · Historial` y acciones
`Usar hoy`/`Añadir a rutina`. El selector de ejercicios es un modal reutilizable
para Hoy/Entrenamiento/Rutinas, con búsqueda, filtros, favoritos y «sólo mi equipo».

**Por qué:** el catálogo es una fortaleza; la UI vieja lo esconde y cada pantalla
repite su propio selector.

**Criterio:** un solo `ExercisePicker`; filtros activos removibles; favoritos
persistentes; la ficha conserva la técnica y el historial.

**Estado 2026-11-11 (a): D9 cerrado.** `features/exercises/ExercisePicker.tsx`
es el único selector: Hoy abre en modo una fila, Entrenamiento en modo múltiple
con su prescripción común y Rutinas en modo múltiple sobre el borrador. Comparte
búsqueda, filtros de familia, favoritos y «sólo mi equipo»; los filtros activos
se pueden quitar. La lista y la ficha ya usan `topbar` + `content`, y la ficha
añade `Usar hoy`/`Añadir a rutina` sin inventar prescripción. Cada pantalla sigue
escribiendo por su verbo de datos (`addExerciseToToday` o `routineItemFor`).

### D10 · Historial

**Decisión:** migrar al shell único; tarjetas de sesión con fecha, volumen, series
y duración fiable; detalle con todas las series; edición/borrado con confirmación
y deshacer; filtros por fecha/ejercicio. No mostrar duración cuando el dato no es
fiable.

**Por qué:** es el archivo de confianza del usuario; debe verse como parte del
mismo producto, no como una tabla heredada.

**Criterio:** una sesión importada sin duración no imprime «1 min»; el detalle
lista todas las series; editar una serie actualiza el volumen; no se borra sin
confirmación.

**Implementado 2026-11-10 (a):** `HistoryScreen` usa el mismo `topbar` +
`content` + `card` que las demás pantallas portadas. Las tarjetas conservan fecha,
series, volumen y duración sólo cuando es fiable; el detalle abre la sesión con
**todas** las series mediante `summariseSession` (22 filas en el ejemplo real) y
mantiene renombrar/borrar con confirmación y Deshacer. Se añadieron filtros por
periodo (`Todo · 30 días · 90 días`) y búsqueda por ejercicio o nombre, con
«Quitar filtros» cuando no hay coincidencias; un helper puro los cubre con 5 tests.
**Edición de serie añadida 2026-11-10 (b):** cada fila del detalle abre peso,
reps y marca D/F; `set-edit` comparte con la ficha el parseo de coma decimal y
los vacíos, y el guardado pasa por `editSet`, con el Deshacer global de 20 s.
Guardar sin cambios no abre undo. Preview 390×844: sin overflow, toolbar y
tarjetas en una columna; 1440×900: dos columnas de tarjetas y ningún desbordamiento.

### D11 · Progreso

**Decisión:** una sola pantalla con tres lentes explícitas y separadas:

1. **Exposición de entrenamiento** — series de trabajo por familia, periodo y
   tendencia; calentamientos fuera.
2. **Objetivos antropométricos** — medidas y objetivos del usuario, sin mezclarlos
   con fuerza.
3. **Fuerza vs. referencia externa** — sólo si hay norma publicada aplicable y
   relación defendible; si no, «sin referencia comparable». El gate del mapa
   muscular sigue cerrado.

`Condición física` sigue siendo una tarjeta de cuerpo completo y no se presenta
como fuerza por músculo. La adherencia, PRs y volumen semanal se quedan, pero con
etiquetas que digan qué son.

**Por qué:** la interfaz puede convertir una métrica correcta en una afirmación
falsa si las lentes se mezclan.

**Criterio:** cada tarjeta declara su fuente y su límite; el mapa no es la única
forma de leer un dato; sin datos no se pinta rojo; el modo fuerza no se activa sin
aprobación explícita.

### D12 · Ajustes

**Decisión:** agrupar en seis secciones: **Perfil**, **Entrenamiento**, **Equipo**,
**Datos**, **Coach** y **Acerca de**. Las acciones destructivas van al final, con
confirmación. Los perfiles de equipo se explican como «estacionar el inventario»,
no como borrar el anterior. No hay sección de nutrición.

**Por qué:** 935 líneas y muchos paneles seguidos hacen que el usuario no encuentre
lo que busca; la configuración no es el producto.

**Criterio:** cada sección se abre/cierra sin perder estado; cambiar de perfil no
borra el inventario anterior; exportar/importar sigue funcionando; no se pide
permiso de notificaciones sin clic.

### D13 · Coach

**Decisión:** el coach deja de ser un destino primario visible. Se abre desde
`Ajustar hoy` y desde Ajustes; la pantalla `#/coach` sigue existiendo para el
contrato de copiar/pegar y para el modelo local. La propuesta muestra la regla, los
números, el botón `Aplicar` y `Deshacer`; no hay chat libre como interfaz principal.
El modelo sigue siendo opcional y local.

**Por qué:** el coach es una ayuda, no la acción principal; tres puertas para la
misma función compiten con `Empezar`.

**Criterio:** `Empezar` sigue siendo el único CTA primario de Hoy; una propuesta se
puede rechazar sin efectos; el agente no puede cerrar/borrar sesiones; el flujo
MCP y el botón humano comparten `applyUndoOp`.

### D14 · Sistema visual

**Decisión:** mantener la paleta oscura y el acento naranja, pero formalizar:

- **Tipografía:** escala 12/14/16/20/25/31 px; no usar 11 px para información
  esencial; números tabulares en pesos, reps y tiempo.
- **Espaciado:** base 8 px; tarjetas con padding 16/20; no mezclar 12/14/18 px sin
  token.
- **Radios:** 8/10/14; un solo radio por tipo de superficie.
- **Botones:** primario (acción única), secundario (apoyo), ghost (navegación),
  danger (destructivo). Un solo primario por vista.
- **Superficies:** planas; retirar los gradientes radiales decorativos del fondo y
  cualquier glow. El estado se comunica con color + texto/icono.
- **Tokens:** una fuente; `mockup.css` e `index.css` comparten los mismos valores
  durante la transición.

**Por qué:** la app ya tiene una identidad; el problema es la deriva y la
duplicación, no la falta de personalidad.

**Criterio:** no aparecen nuevos colores fuera de tokens; el contraste AA se
mantiene; el modo claro/oscuro de BodyLab no se toca (es otro producto).

### D15 · Móvil, teclado y accesibilidad

**Decisión:** tratar 390×844 como el caso principal de ZEN y 1440×900 como el de
planificación. Reglas:

- 44×44 px mínimo; inputs de 16 px; safe areas en la barra inferior.
- La acción primaria de ZEN queda visible con el teclado abierto.
- Nada de scroll horizontal; las tablas se adaptan o se convierten en tarjetas.
- Foco visible, `aria-pressed`/`aria-expanded`, `aria-live` para reordenar y
  guardar; `prefers-reduced-motion`.
- Probar 320, 360, 390, 414, 768, 1024 y 1440 px; iPhone/Safari por LAN cuando se
  pueda, no sólo Chromium.

**Por qué:** el usuario entrena con una mano y el móvil es el dispositivo real.

**Criterio:** ZEN a 390 px se registra sin scroll horizontal; la tabla no tapa el
botón; el foco se ve; el teclado no esconde `Registrar`.

### D16 · Ecosistema BodyLab ↔ TrainingLab

**Decisión:** mantener dos apps y un contrato, no fusionarlas en una sola navegación.
BodyLab mide y analiza; TrainingLab planifica y registra. El intercambio sigue siendo
el export/import v2 y el perfil; no se añade un destino «Nutrición» ni se toca la
paleta de BodyLab. La integración de fuerza por músculo sigue bajo su gate.

**Por qué:** el usuario ya tiene dos productos con propósitos distintos; unificarlos
por estética rompería BodyLab y la separación de métricas.

**Criterio:** el flujo de medidas → plan y de log → revisión sigue documentado; no
se duplica el perfil; no se mezclan mapas.

### D17 · Nutrición

**Decisión:** **no se implementa** en esta fase. BWS+ demuestra que se puede hacer,
pero el dueño decidió en 2026-10-05 no añadir módulo nutricional y
`RESEARCH_FEATURE_VALIDATION.md` lo marca **NO POR AHORA** (fase F congelada, XL).
Si se reabre, será una fase de producto separada con alcance, datos, privacidad y
presupuesto propios; no una tarjeta en Hoy.

**Criterio:** ninguna cadena, tabla, permiso ni dependencia de nutrición entra en
TrainingLab sin una decisión explícita nueva.

### D18 · Lo que se rechaza

- 3D, avatares, escáner corporal y AR.
- Cuentas, nube, social, rankings, telemetría y wearables obligatorios.
- Paywall, trials automáticos y gamificación que castiga.
- Copiar UI/copy de Hevy, Strong, Fitbod, Jefit, Symmetry o BWS+.
- MRV/MEV como regla dura sin fuente y contexto.
- Referencia de fuerza inventada o ajuste de estatura no validado.
- Chat como interfaz principal del coach.

---

## 6. Mapa objetivo de pantallas

| Pantalla          | Pregunta que responde             | Acción primaria       | Estructura objetivo                                  |
| ----------------- | --------------------------------- | --------------------- | ---------------------------------------------------- |
| **Hoy**           | ¿Entreno hoy y qué toca?          | `Empezar/Continuar`   | 3 bloques + `Ajustar hoy`                            |
| **Entrenamiento** | ¿En qué orden y con qué?          | `Empezar`             | Cola + vistas + `Añadir/ajustar`                     |
| **ZEN**           | ¿Qué registro ahora?              | `Registrar`           | Tabla + entrada + descanso; técnica plegada en móvil |
| **Resumen**       | ¿Qué hice?                        | `Volver a hoy`        | KPIs + todas las series + enlaces                    |
| **Historial**     | ¿Qué pasó antes?                  | Abrir sesión          | Tarjetas + detalle + editar/deshacer                 |
| **Progreso**      | ¿Voy a mejor y cubro todo?        | Cambiar lente/periodo | Exposición + objetivos + fuerza (gate)               |
| **Ejercicios**    | ¿Cómo se hace y con qué?          | Abrir ficha           | Buscador/filtros + ficha + usar                      |
| **Semana**        | ¿Qué me tocó y dónde lo muevo?    | Abrir día             | Rejilla 7 días + drag                                |
| **Rutinas**       | ¿Cómo construyo mi plan?          | `Usar hoy`            | Mis rutinas + biblioteca + constructor               |
| **Ajustes**       | ¿Con qué entreno y qué datos hay? | Guardar               | 6 secciones                                          |
| **Coach**         | ¿Qué me propone y por qué?        | `Aplicar`/`Descartar` | Propuesta + regla + undo                             |

---

## 7. Orden de ejecución

### P0 — el flujo que se usa con el teléfono en la mano

1. **ZEN móvil: registro primero.** **Hecho 2026-11-09.** Orden responsive,
   tabla y entrada antes de media/técnica, CTA fijo, aceptación a 390×844. No se
   tocó la lógica de warm-up/RIR/progresión.
2. **Hoy: tres bloques + `Ajustar hoy`.** **Hecho 2026-11-09.** Enfoque, añadir,
   rutina, coach y notas viven en una hoja; `Empezar/Continuar` es el único CTA
   primario; la tarjeta de cierre sólo aparece con sesión cerrada.
3. **Resumen: todas las series.** **Hecho 2026-11-09.** `session-summary` expone
   las entradas serie a serie y la pantalla las pinta; tests puros añadidos; sin
   inventar peso/duración ni etiquetar el esfuerzo como RIR.
4. **Historial al shell único.** **Hecho 2026-11-10 (a).** Es la pantalla de
   consulta más usada después de entrenar; la migración elimina la mitad del
   `Legacy`, añade filtros y detalle serie a serie sin tocar el log.

**Criterio de ronda P0:** las cuatro piezas pasan typecheck, tests, lint,
`audit:css`, build Vite y `pnpm tauri build`; capturas 390/1440; el instalador
incluye las cadenas nuevas; no hay regresión de datos.

### P1 — coherencia y planificación

5. Migrar **Ejercicios** y crear el `ExercisePicker` único. **Hecho 2026-11-11
   (a): lista, ficha y selector único en Hoy/Entrenamiento/Rutinas.**
6. Migrar **Semana**; conservar drag, overrides y edición por día.
7. Migrar **Progreso**; separar lentes y revisar la tarjeta de condición.
8. Migrar **Ajustes**; agrupar en seis secciones y mover destructivos al final.
9. Simplificar **Rutinas** en tres zonas; plantillas e historial como entradas.
10. Edición de serie en ZEN e historial con deshacer; el mismo patrón.
    **Hecho 2026-11-12:** Historial desde 2026-11-10 (b); ZEN añade ahora la
    edición por fila con `setEditPatch` y el mismo `editSet`/Deshacer de 20 s.
11. Coach contextual: una sola puerta desde Hoy/Ajustes; medir uso antes de añadir
    más IA.

### P2 — sólo con evidencia y decisión

12. Fuerza vs. referencia externa por músculo: sólo si hay fuente aplicable,
    relación ejercicio→región y aprobación del dueño.
13. Nutrición/NutriLab: sólo si el dueño reabre la fase; alcance separado.
14. Voz/STT: la decisión B de `DECISIONS_2026-10-19.md` sigue deferred.
15. Calculadora de discos, export compartible y otras mejoras: después de P0/P1.

### Lo que no se hace en P0/P1

- Rehacer la navegación que ya funciona.
- Añadir una dependencia de UI o un router.
- Tocar BodyLab, el mapa muscular o la paleta de BodyLab.
- Introducir cuentas, nube, telemetría o nutrición.
- Prometer una referencia de fuerza que no exista.

---

## 8. Criterios de aceptación y verificación

### 8.1 Por cambio

- **Lógica pura:** tests en `tests/training/` antes de la UI cuando cambie el
  contrato (resumen, orden, semanas, rutinas).
- **UI:** typecheck de la app (`npx tsc -b`), `pnpm lint`, `pnpm audit:css`.
- **Visual:** captura 390×844 y 1440×900 de la pantalla tocada; sin overflow,
  texto cortado, foco tapado ni CTA duplicado.
- **Cierre:** `pnpm tauri build` desde el mismo commit; instalador nuevo en el
  escritorio real; comprobar que la cadena nueva está en `dist/assets`.
- **Datos:** recarga, IndexedDB, export/import y una sesión real; no se declara
  «guardado» si falla la escritura.

### 8.2 Por ronda

- `pnpm test` (raíz) con el conteo real.
- `pnpm typecheck` / `npx tsc -b` de TrainingLab.
- `pnpm lint` 0/0.
- `pnpm audit:css` 0.
- `pnpm vite build`.
- `pnpm tauri build` + instalador.
- Handoff con comandos, resultados, capturas y bloqueos.

### 8.3 Qué no se puede afirmar

- «Testeado con usuarios» si no hubo usuarios.
- «Funciona en iPhone» si sólo se miró Chromium.
- «Listo» si el instalador es de la ronda anterior.
- «Sin regresiones» si no se corrió la suite afectada.

---

## 9. Decisiones abiertas (dueño)

1. **Nutrición:** ¿se queda cerrada o se abre una fase separada? Hasta respuesta,
   no se implementa.
2. **Fuerza vs. referencia externa:** ¿se acepta la limitación de las normas
   disponibles o se espera a una fuente que soporte estatura? El gate sigue cerrado.
3. **BodyLab ↔ TrainingLab:** ¿basta el export/import v2 o se quiere un flujo de
   perfil compartido? No se toca BodyLab sin respuesta.
4. **Voz:** la decisión B (whisper.cpp local, opt-in) sigue deferred; no se instala.
5. **Plantillas:** ¿se priorizan PPL/Upper-Lower/Full-body o «desde mi historial»?
   Ya existe «desde mi historial»; la decisión es de orden, no de código.

---

## 10. Documentos retirados y conservados

### Retirados el 2026-11-07

| Documento                        | Motivo                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `UI_DESIGN.md`                   | Reglas de interfaz de la app anterior; sustituido por este documento.                                         |
| `TRAININGLAB_UI_PLAN.md`         | Plan v2 de septiembre; solapado y obsoleto.                                                                   |
| `plan_evaluacion_qa_ui_ux.md`    | Auditoría de un plan que ya no existe; sus hallazgos útiles están aquí.                                       |
| `REDESIGN_STORM.md`              | Contrato de 8 pantallas/personas; reemplazado por este documento.                                             |
| `INTERFACE_REPORT_2026-10-16.md` | Informe de estado de esa fecha; el estado vivo es el handoff/código.                                          |
| `FRONTEND_UX_PLAN_2026-11-06.md` | Plan de benchmark reemplazado por la sección 2 y el roadmap de este documento.                                |
| `REPORTE.md`                     | Informe UI/UX del 2026-10-01 y plan de mejora; reemplazado por el diagnóstico y el roadmap de este documento. |

### Conservados a propósito

- `ARCHITECTURE.md`, `PRODUCT_SPEC.md`, `TESTING.md`, `MCP_TOOL_SURFACE.md`.
- `BUFFY_IMPLEMENTATION_BRIEF.md` (ejecución y puertas, no diseño).
- `DECISIONS_2026-10-19.md` (navegación, drag, MCP, STT).
- `AGENT_HANDOFF.md` (log append-only; conserva referencias históricas).
- `ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md`, `RESEARCH_*`, `EXERCISE_DATA_AUDIT.md`,
  `LAYAS_MODELO_DECISION.md`, `REMOVED_3D_MODEL.md`.
- `docs/reference/` y `docs/screenshots/` (evidencia local; no se publican).

---

## 11. Referencias de código

- Shell/nav: `traininglab/apps/desktop/src/app/{App.tsx,nav.ts,router.ts}`.
- Hoy: `screens/TodayScreen.tsx`.
- ZEN: `features/today/ZenSession.tsx`, `screens/SessionScreen.tsx`.
- Resumen: `screens/SessionSummaryScreen.tsx`, `lib/session-summary.ts`.
- Cola: `screens/TrainingScreen.tsx`, `lib/day-view.ts`.
- Semana: `screens/WeekScreen.tsx`, `lib/week-swap.ts`.
- Rutinas: `screens/RoutinesScreen.tsx`, `lib/routine-continuity.ts`.
- Ejercicios: `screens/ExercisesScreen.tsx`, `screens/ExerciseDetailScreen.tsx`.
- Historial/Progreso/Ajustes: `screens/HistoryScreen.tsx`,
  `screens/ProgressScreen.tsx`, `screens/SettingsScreen.tsx`.
- Estilos: `mockup.css`, `index.css`.
- Pruebas: `tests/training/test_mobile_nav.test.ts`,
  `test_drag_reorder.test.ts`, `test_session_summary.test.ts`,
  `test_css_class_audit.test.ts`.
