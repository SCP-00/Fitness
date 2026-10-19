# TrainingLab — la tormenta de ideas y el nuevo contrato de interfaz

**Estado (2026-10-19): el mockup es el frente de producción desde 2026-10-14.** Las páginas
Hoy, Entrenamiento, Historial, Rutinas y ZEN están portadas; la navegación móvil y el
arrastre de R3/R4 ya están implementados (ver §4 y `docs/DECISIONS_2026-10-19.md`). Lo que
sigue abajo se conserva como el contrato que esas pantallas cumplen.

Esto **sustituye** a `UI_DESIGN.md`, `TRAININGLAB_UI_PLAN.md` y `plan_evaluacion_qa_ui_ux.md`,
que se borraron el 2026-10-09 por orden del dueño («todos los diseños, planes deben ser
eliminados»). Es el documento de diseño vivo de TrainingLab hasta que exista otro.

La **paleta no se toca**: `#080B0E` fondo · `#10151A` superficie · `#151B21` control ·
`#29313A` borde · `#F3F5F7` texto · `#8B96A1` texto apagado · `#FF7300` acento ·
`#39D98A`/`#FFC857`/`#FF4F4F` éxito/aviso/peligro. Densidad sobria, radios `2xl`, sombras
suaves, sin degradados ni cristal. Lo que cambia es **qué se puede hacer y dónde está cada
cosa**, no el aspecto.

---

## 0. Por qué este documento existe

El dueño lo dijo sin rodeos y con razón:

> «Hay muchos problemas en la aplicación, no me refiero a que tenga bugs ni que sea lenta o
> funcione mal, es que no es práctica, está mal diseñada, muy buena calidad técnica pero la
> calidad de vida está por los suelos.»

Su lista de quejas concretas, traducida a requisitos con criterio de aceptación, es §1. Las
personas que esas quejas representan son §2. Lo que todas comparten son los invariantes de
§3 — y esos invariantes son el contrato: **una pantalla nueva que los rompa está mal, por muy
bonita que sea**. Las ocho pantallas son §4 y los prompts de mockup, §5.

---

## 1. Lo que el dueño pidió, traducido a requisitos

Cada fila es un requisito verificable: si no se puede comprobar con el dedo, no es un requisito.

| # | Lo que dijo | Requisito | Criterio de aceptación |
|---|---|---|---|
| R1 | «Entrenar no tiene los ejercicios recomendados» | La pantalla de Entrenar **es** la sesión de hoy: los ejercicios ya elegidos, con su prescripción | Al abrir Entrenar hay 5-7 ejercicios con series×reps y descanso, sin configurar nada |
| R2 | «En Semana no me deja cambiar entre días para saber qué me tocó antes y qué me tocará después» | Semana es una rejilla de 7 días navegable; un día pasado muestra lo **hecho**, uno futuro lo **previsto** | Un toque en cualquier día abre su detalle; los pasados muestran series/peso reales |
| R3 | «Tal vez el usuario desee reorganizar su semana» | Mover, duplicar, copiar, borrar y reordenar sesiones dentro de la semana | Arrastrar una sesión de jueves a sábado la mueve y el volumen semanal se recalcula |
| R4 | «Ni en Entrenamiento ni en Semana la opción de agregar tus propios ejercicios en el orden que el usuario desee» | Cualquier lista de ejercicios es ordenable por el usuario (arrastrar + botones subir/bajar) | Reordenar y que el orden persista al cerrar la app |
| R5 | «Ni la opción 1 a 1 ni la de añadir varios a la vez» | Dos entradas: **uno a uno** desde la biblioteca y **añadir varios** en bloque | Añadir 4 ejercicios de golpe marcándolos en una lista |
| R6 | «Y la cantidad de series y repeticiones por adelantado» | Al añadir se fija series · reps · descanso (y RIR), para uno o para los marcados | Campo «aplicar a los 3 seleccionados: 3×10-12 · 90 s» |
| R7 | «Poder añadir el peso con el mouse y teclado digitando el número» | El peso y las reps son **campos editables**: clic y a escribir; ± para ajustar | Hacer clic en «0 kg» y teclear «26» registra 26 kg |
| R8 | «Estos botones deberían de ser interactivos con el mouse» | Los ± responden a clic, rueda, flechas y pulsación mantenida | Cada interacción cambia el valor y se ve |
| R9 | «El registro de series está demasiado pequeño y sería mejor estar debajo del registro y no al lateral» | El registro de series vive **debajo** de la entrada, a todo lo ancho; el lateral es consejo | En la pantalla de sesión no hay ninguna tabla de series en el lateral |
| R10 | «En el lateral solo las recomendaciones, Guía» | Lateral derecho = recomendación de progresión + guía de técnica + temporizador | Esas tres cosas y nada más |
| R11 | «En el centro superior la imagen referencia» | El GIF/imagen del ejercicio está en el centro-arriba, **siempre** | También en ZEN, también en móvil, también en pausa |
| R12 | «No puedo ver ni qué ejercicio sigue» | Barra «ahora / siguiente» siempre visible, con el siguiente ejercicio y su equipamiento | Se ve el siguiente sin abrir nada |
| R13 | «Ni cambiar su orden… si una máquina está ocupada» | Saltar, posponer al final, subir/bajar y cambiar por un equivalente, en un toque | «Máquina ocupada» → mover al final o cambiar, con deshacer |
| R14 | «Que máquinas necesito para los ejercicios para organizar mejor cómo y dónde empezar» | Cada ejercicio declara su equipamiento; la sesión se puede ordenar por equipamiento/zona | Chips por ejercicio y «ordenar por: equipamiento» → ruta del gimnasio |
| R15 | (implícito) Que la app le diga qué toca | El coach y el planificador deben poder **aplicar** la propuesta a la sesión, no sólo sugerirla | «Aplicar a hoy» deja la sesión lista para registrar |
| R16 | «Sigo registrando mis entrenamientos en Symmetry» | Importar Symmetry y exportar sin fricción; registrar debe ser más rápido que la app que usa hoy | Pegar/importar un CSV y ver 400 series en Progreso |
| R17 | (implícito) Yoga, calistenia, sin equipo, sólo mancuernas | El plan y la biblioteca se adaptan a tipo de sesión (fuerza · movilidad · cardio · skill) y a equipamiento declarado | Con inventario «sin equipo» no aparece ni una barra |
| R18 | (implícito) No quiere números inventados | Ninguna cifra sin fuente: si no hay estándar, se dice «no disponible» | El coach cita la regla y los números que usó |

---

## 2. La tormenta: ocho personas que tienen que poder usar esto

Método: cada persona es **un trabajo por hacer** (jobs-to-be-done) encarnado. No son «targets»
de marketing: son la prueba de la interfaz. Si Marta no puede reordenar y Ramiro no entiende
una frase, la pantalla falla aunque pase los tipos.

### P1 · Marta, 34 — gimnasio comercial, 45 minutos, 4 días
- **Su día:** sale del trabajo a las 19:40, el gym está lleno, tiene 45 min contados.
- **Qué quiere:** tono y fuerza sin pensar; saber **qué máquina necesita y en qué orden**
  para no dar vueltas; que si la prensa está ocupada pueda seguir con otra cosa y volver.
- **Qué le frustra hoy:** no ve qué sigue, no puede reordenar, el registro está en un lateral
  pequeño que no acierta con el dedo, y saltarse un ejercicio no está.
- **Qué NO quiere:** un plan que la obligue a un orden rígido, ni perder el hilo si se salta uno.

### P2 · Diego, 29 — casa, mancuernas ajustables hasta 24 kg + banco
- **Su día:** entrena en el salón a las 22:00, 60 min, 5 días.
- **Qué quiere:** progresar **cuando ya no puede subir más peso** (tempo, pausa, unilateral,
  rango, volumen) y que la app se lo diga sin pedirle discos que no tiene.
- **Qué le frustra hoy:** la app sugiere cargas imposibles con su material y no hay dónde
  apuntar segundos, tempo ni pausas.
- **Qué NO quiere:** que «no subir peso» se lea como estancamiento.

### P3 · Nuria, 22 — calistenia en el parque: barra, paralelas, anillas
- **Su día:** 40 min al aire libre, 4 días, según el tiempo.
- **Qué quiere:** **árboles de progresión** por habilidad (dominada → lastrada; flexión → pino;
  remo austral → front lever), registrar **reps y segundos**, y que el lenguaje sea suyo.
- **Qué le frustra hoy:** la app habla de barra, rack y discos; no hay sitio para «asistidas»
  ni para «hold».
- **Qué NO quiere:** que le cuente el peso corporal mal.

### P4 · Lucía, 41 — yoga y movilidad en casa, 20-30 min, 4 días
- **Su día:** por la mañana antes del trabajo, manta y esterilla.
- **Qué quiere:** **secuencias** con temporizador por postura y por lado, respiración, y ver la
  postura **siempre** delante.
- **Qué le frustra hoy:** todo se mide en series, kilos y PRs; no hay forma de construir un flujo.
- **Qué NO quiere:** que la app la empuje a levantar peso ni a «batir récords».

### P5 · Ramiro, 55 — nunca entrenó, casa, sin ningún equipo
- **Su día:** 20 min, 3 días, espalda sensible y presión alta controlada.
- **Qué quiere:** que le digan **exactamente qué hacer hoy**, con el movimiento enseñado
  (vídeo/GIF) y en lenguaje llano; saber que lo está haciendo bien.
- **Qué le frustra hoy:** jerga («RIR», «patrón de empuje horizontal»), planes de 7 ejercicios
  raros y miedo a hacerse daño.
- **Qué NO quiere:** sentirse vigilado ni medido; ni que le propongan algo que no entiende.

### P6 · Sofía, 38 — madre, gym y casa mezclados, 25 min, semanas irregulares
- **Su día:** entrena cuando puede, a veces la llaman a mitad de sesión.
- **Qué quiere:** **reanudar** donde lo dejó, arrastrar la sesión de ayer a hoy, y que faltar un
  día no le rompa la semana.
- **Qué le frustra hoy:** una sesión interrumpida se pierde; la semana se descuadra y no hay
  forma de recolocarla.
- **Qué NO quiere:** culpa ni rachas rotas.

### P7 · Álex, 26 — powerlifter, gimnasio, 3 básicos + accesorios
- **Su día:** 90 min, 4 días, mesociclos, % de 1RM y RPE.
- **Qué quiere:** prescribir **por porcentaje**, calculadora de discos, series de aproximación
  automáticas y ver la evolución del e1RM.
- **Qué le frustra hoy:** no hay % ni calculadora, y el calentamiento lo tiene que inventar.
- **Qué NO quiere:** que le suavicen el plan ni que le oculten los números.

### P8 · Tú, el dueño — Jr dev, casa y gym, hoy registra en Symmetry
- **Tu día:** entrenas cuando el trabajo deja; miras la app y no te dice qué toca; abres
  Symmetry y registras allí.
- **Qué quieres:** que **una app** te diga qué entrenar hoy, te cuadre el volumen por músculo,
  te deje registrar en dos toques y te explique **por qué** sin inventarse nada; y que un día
  puedas meterle tu historial de Symmetry.
- **Qué te frustra hoy:** tener que preguntarle a un LLM lo que la app debería saber sola.
- **Qué NO quieres:** documentación bonita que no se pueda usar con el dedo.

---

## 3. Los invariantes (el contrato de la interfaz)

Lo que se repite en las ocho personas. Cualquier pantalla nueva los cumple o no se publica.

1. **Nada sin imagen.** Donde haya un ejercicio, hay GIF o imagen — también en ZEN, en pausa y
   en móvil. Si el medio falta, se muestra un marcador honesto, nunca un hueco.
2. **Todo se reordena.** Toda lista de ejercicios admite arrastrar **y** botones subir/bajar
   (dedos sudados, guantes, ratón). El orden es del usuario y se guarda.
3. **Ningún número exige el ratón.** Todo campo numérico se teclea y se ajusta con ±, rueda y
   flechas. Ningún teclado se abre solo; ninguno se cierra con un toque fuera.
4. **El registro vive donde llega el pulgar** (abajo, a todo lo ancho). El lateral es consejo,
   guía y reloj — nunca captura de datos.
5. **El equipamiento es contexto de primer nivel.** Cada ejercicio declara lo que necesita; cada
   ubicación (Casa · Gym · Parque) tiene su inventario; hay una vista «ordenar por equipo/zona»,
   que es la ruta real del gimnasio.
6. **El plan no se rompe cuando la vida se cruza.** Saltar, posponer, cambiar (máquina ocupada),
   añadir sobre la marcha: todo cabe, todo se deshace, siempre con un equivalente disponible.
7. **Nada inventado.** Si no hay fuente, se dice «no disponible» y por qué. El coach declara su
   regla y sus números; el determinista manda.
8. **La semana es elástica.** Mover, duplicar, copiar la anterior, marcar descanso, reubicar lo
   saltado. Faltar no rompe nada; el volumen se recalcula.
9. **Reanudar siempre.** Sesión interrumpida, app cerrada, cambio de dispositivo (LAN): lo
   registrado está, y se sigue donde se dejó.
10. **Todo acuse es trazable y reversible.** Lo que escriba un agente dice quién, cuándo y con
    qué regla, y lleva Deshacer. La app **nunca** borra historial sin que el humano lo pida.

Dos reglas de casa, además: **toda acción del día a día cuesta 1 toque, como mucho 2**; y
**ninguna pantalla abre con más de tres bloques grandes** (la Inicio actual incumple esto).

---

## 4. Las ocho pantallas (máximo ocho, incluida la sesión en vivo)

Numeración = orden de las pestañas. «En sesión» es una **vista de foco** del mismo destino
Entrenar, no una novena pantalla.

### PÁGINA 1 · **Hoy** (antes: Inicio)
Responde: *¿entreno hoy?, ¿qué me toca?, ¿cómo voy?* Máximo tres bloques.

> **Orden del dueño (2026-10-16):** Hoy se queda **solo con Hoy**. La columna derecha que la
> página dibuja (resumen, anillos de progreso, semana, coach) **se elimina** — esos datos viven en
> Semana, Progreso y la propia pantalla del coach. Se quedan la **nota de recuperación** (explica
> el plan de hoy) y **Estado de hoy** (la readiness, que es una entrada del plan, no un readout).
> La app ya no dibuja esa columna: `screens/TodayScreen.tsx`, 2026-10-16.
- Cabecera: fecha, ubicación activa (Casa · Gym · Parque) y botón «¿Entreno hoy?».
- **Bloque 1 — Hoy toca:** la sesión recomendada ya resuelta (nombre, 6 ejercicios, ~57 min,
  músculos diana) + **«Empezar»** y «Ajustar». Debajo, en una línea, *por qué*: ventana de
  recuperación, banda de volumen, equipamiento disponible.
- **Bloque 2 — Cómo estás:** energía · motivación · molestias (1-5), tres controles táctiles.
- **Bloque 3 — Semana:** siete mini-celdas (hecho / previsto / descanso) y una frase de volumen
  («te faltan 2 sesiones de pantorrilla para tu banda»). Toque → Página 4.
- Si hay sesión a medias: **banner Reanudar** por encima de todo.
- Coach: dock abajo-derecha, una propuesta con su regla visible, botón «aplicar» (R15).

### PÁGINA 2 · **Entrenar** (la cola del día)
Responde: *¿en qué orden lo hago y con qué?*
- Columna central: lista **ordenable** de los ejercicios de hoy. Cada fila: miniatura/GIF,
  nombre, `4 × 8-12 · RIR 2 · 120 s`, **chips de equipamiento** (mancuernas 24 kg · banco ·
  barra dominadas) y acciones: *empezar aquí · subir · bajar · cambiar · quitar*.
- Barra de orden: «mi orden · por equipamiento · por músculo · por dificultad» (R14).
- **+ Añadir ejercicio** con dos caminos: **uno a uno** (biblioteca) y **añadir varios**
  (multiselección + series · reps · descanso · RIR aplicados a todos) (R5, R6).
- **+ Desde mi rutina**: traer una plantilla entera y reordenarla.
- Pie: `57 min de 60 · 6 ejercicios · 22 series`, y aviso de huecos («sin pantorrilla»).
- Lateral: «¿por qué estos?» con las reglas y los números que las aplican.
- En móvil: misma lista, acciones en un menú por fila; el FAB sigue siendo «Empezar».
- **Hecho 2026-10-19:** la fila se arrastra por un asa explícita (ratón, dedo y teclado),
  con vista previa local y una sola escritura al soltar. Los botones subir/bajar siguen
  siendo el camino accesible. MCP: `reorder_today`, `set_exercise_state`, `reset_today_order`.

### PÁGINA 3 · **En sesión** (modo ZEN — la pantalla que más importa)
Responde: *¿qué hago ahora mismo y qué registro?*
- **Centro-arriba:** GIF/imagen grande del ejercicio **siempre** (R11), con botones «técnica»
  y «músculos».
- **Centro:** `Serie 2 de 4` · **peso** (número editable, clic para teclear, ± a los lados,
  rueda/flechas) · **reps** · RIR · botón grande **Registrar** (R7, R8).
- **Debajo (a todo lo ancho):** el **registro de series** de hoy para este ejercicio — tabla
  compacta *serie · peso · reps · marca · anterior*, con edición en línea y deshacer. Nunca en
  el lateral (R9).
- **Lateral derecho:** recomendación de progresión con su cálculo («hoy 12 reps con 24 kg →
  sube a 26»), guía de técnica en tres puntos y **temporizador de descanso** (R10).
- **Barra superior:** `ahora: Sentadilla copa · siguiente: Zancadas` + saltar · posponer ·
  cambiar (equivalente del mismo patrón y equipo) — la respuesta a «máquina ocupada» (R12, R13).
- **Barra inferior (móvil):** teclado numérico y ± a un pulgar de distancia.
- ZEN es esto **sin nada más**: sin menús, sin cabeceras decorativas — pero nunca sin imagen.

### PÁGINA 4 · **Semana** (el planificador elástico)
Responde: *¿qué me tocó, qué me toca y dónde lo puedo recolocar?*
- Rejilla de 7 columnas (L-D). Sesión pasada = hecha (series, volumen, duración reales);
  futura = prevista; descanso = descanso (R2).
- Un toque en un día abre su detalle con el **mismo editor de la cola** (Página 2).
- Acciones: **arrastrar entre días**, duplicar, copiar la semana anterior, marcar descanso,
  «esta semana entreno 4 días» (recalcula), reubicar lo saltado (R3).
- **Hecho 2026-10-19:** arrastrar un día sobre otro intercambia sus planes efectivos y se
  guarda en `weekOverrides`; si el destino es descanso, la sesión se mueve y el origen
  descansa. Teclado: ←/→ sobre el asa. MCP: `swap_week_days`.
- Cabecera: nº de semana, total previsto vs banda de volumen, aviso de huecos.
- Pestaña **Antes / Después** para comparar con semanas anteriores.

### PÁGINA 5 · **Rutinas** (el constructor)
Responde: *quiero mi propio plan, en mi orden, con mis series.*
- Izquierda: biblioteca con buscador y filtros (grupo, patrón, equipamiento, «sólo lo que
  puedo hacer con mi equipo»).
- Derecha: la rutina en construcción — filas ordenables con **series · reps · descanso** en
  línea, agrupables en bloques (A, B, superserie), y **añadir varios** con valores por defecto
  (R4, R5, R6).
- Cabecera: nombre, objetivo, duración estimada, *equipamiento requerido* calculado de la lista.
- Pie: **Usar hoy** · **Usar esta semana** · Guardar como plantilla (Casa · Gym · Parque).

### PÁGINA 6 · **Ejercicios** (biblioteca y creación propia)
Responde: *¿cómo se hace, con qué, y puedo crear el mío?*
- Buscador + chips de filtro; tarjetas con **GIF animado**, músculos, equipamiento y acciones
  (ficha · añadir a hoy · añadir a rutina · favorito).
- Ficha: GIF grande, técnica numerada, errores comunes, músculos implicados, **progresiones y
  regresiones**, tu historial (mejor serie, e1RM) y «usar hoy».
- **+ Crear ejercicio propio**: nombre, imagen/GIF, músculos, equipamiento, patrón, unidad
  (kg · reps · segundos). El ejercicio propio se comporta como cualquier otro del catálogo.

### PÁGINA 7 · **Progreso**
Responde: *¿voy a mejor y estoy cubriendo todo?*
- Serie por grupo muscular vs **banda publicada** (barras con la banda sombreada, huecos en
  rojo), PRs recientes, e1RM por levantamiento, adherencia y duración media.
- Mapa corporal con **dos lentes explícitas**: cobertura de entrenamiento (hecho) y fuerza vs
  referencia externa publicada (con la fuente y sus límites escritos). Sigue bajo el gate del
  dueño: no se activa como vista principal sin su aprobación.
- Historial de sesiones (lo cerrado es inmutable) y export CSV.

### PÁGINA 8 · **Ajustes** (equipo, coach, datos)
Responde: *¿con qué entreno, quién me aconseja y qué hace con mis datos?*
- **Perfil y ubicaciones:** Casa · Gym · Parque, cada una con su inventario en chips (mancuernas
  hasta 24 kg, barra + discos, rack, banco, polea, bandas, barra de dominadas…).
- **Entrenamiento:** objetivo, nivel, días/semana, duración por defecto, unidad de progresión.
- **Coach IA local:** estado del modelo, endpoint loopback, herramientas permitidas,
  «el coach propone, las reglas disponen», historial de propuestas y sus reglas.
- **Acciones de agentes:** recibos (quién, cuándo, regla, números) con **Deshacer**.
- **Datos:** exportar/importar JSON y Symmetry, copia automática, restaurar historial.
- **Apariencia:** paleta actual (fija), densidad. **Acerca de:** sin telemetría, sin descargas.

---

## 5. Los ocho prompts de mockup (para generar imágenes)

**Prompt 0 — estilo (prepéndelo a cada uno).**
> UI mockup, high-fidelity product design shot of a desktop training app called TrainingLab,
> dark warm theme: background #080B0E, cards #10151A, controls #151B21, borders #29313A,
> text #F3F5F7, muted text #8B96A1, one single amber accent #FF7300 (plus #39D98A / #FFC857 /
> #FF4F4F for state only), geometric sans (Inter-like), 8-pt spacing grid, rounded-2xl cards,
> 1-px soft borders, no gradients, no glassmorphism, no glow, no neon; flat vector UI, crisp
> typography, realistic Spanish UI copy and realistic training data (kg, reps, RIR, series,
> seconds) — never lorem ipsum; show it inside a 1440-px browser window on a dark desk scene,
> plus a small phone frame of the same screen beside it; product screenshot, dribbble quality.

**Prompt 1 — Hoy.**
> Page "Hoy": header with date, active location chip (Casa · Gym · Parque) and a big
> "Empezar" button. Card 1 "Hoy toca": one-line session summary (6 ejercicios · 57 min ·
> piernas y trapecios) with a small equipment row of chips (mancuernas 24 kg, banco) and a
> one-line "por qué" (ventana de recuperación 54 h · banda de volumen · equipo disponible).
> Card 2 "Cómo estás": three 1-5 sliders (energía · motivación · molestias). Card 3 "Semana":
> seven mini day cells (hecho / previsto / descanso) with one volume sentence ("te faltan 2
> series de pantorrilla"). A slim "Reanudar sesión de ayer" banner on top. A small coach dock
> bottom-right with a concrete proposal and the rule it used. Only three big blocks; calm, breathable.

**Prompt 2 — Entrenar (cola del día).**
> Page "Entrenar": center column is an orderable list of today's six exercises. Each row:
> small animated-GIF thumbnail, name, prescription "4 × 8-12 · RIR 2 · 120 s", equipment
> chips (mancuernas 24 kg · banco · barra de dominadas) and row actions (empezar · subir ·
> bajar · cambiar · quitar) with drag handles. Above the list an order bar: "mi orden ·
> por equipamiento · por músculo" (por equipamiento selected). Below it two buttons: "+ Añadir
> ejercicio" and "+ Desde mi rutina". A side sheet is open showing **añadir varios**: a
> checkbox list of 4 selected exercises with editable columns series/reps/descanso and one
> shared field "aplicar a los 3 seleccionados: 3 · 10-12 · 90 s". Footer strip "57 min de 60 ·
> 6 ejercicios · 22 series · sin pantorrilla". Right rail: "¿por qué estos?" with the rules and numbers.

**Prompt 3 — En sesión (ZEN).**
> Focus session screen, three zones. Top-center: large clean animated GIF of a goblet squat
> with "técnica" and "músculos" buttons. Center: "Serie 2 de 4", a big editable weight field
> showing "0 kg" **being typed as "26"** with a visible text cursor, minus and plus buttons on
> each side, a reps field, an RIR selector and a huge "Registrar" button. Below, full width: the
> set log table of today for this exercise — serie · peso · reps · marca · anterior, four rows
> with one row being edited inline, and an "deshacer" affordance. Right rail: progression
> recommendation with its arithmetic, three technique cues, and a resting timer ring. Top bar:
> "ahora: Sentadilla copa · siguiente: Zancadas" with saltar / posponer / cambiar actions.
> Bottom on the phone frame: numeric keypad and ± for one thumb. Minimal chrome, image never missing.

**Prompt 4 — Semana (planificador elástico).**
> Page "Semana": seven-column week grid, Monday to Sunday, each day a card with session name,
> exercise count, estimated duration, muscle tags and a volume/load badge; past days show real
> numbers (series hechas, volumen, duración), future days show the plan, rest days show
> "descanso". One card is mid-drag from Thursday to Saturday with a visible drop placeholder.
> The right panel shows the selected past day open in detail: what was actually done, set by
> set. Header: "Semana 41 · previsto 18 series vs banda 12-20 · 2 huecos" plus tabs
> "Antes | Después". Buttons: duplicar · copiar semana anterior · marcar descanso · reubicar lo saltado.

**Prompt 5 — Rutinas (constructor).**
> Page "Rutinas": two columns. Left, the exercise library with search input, filter chips
> (músculo, patrón, equipamiento, "sólo mi equipo") and result rows with thumbnails. Right, the
> routine being built: an ordered, drag-handled list where each row has inline editable
> "series · reps · descanso" number fields, groupable into blocks labeled A and B (superserie),
> with a "añadir varios" control active — three exercises selected with a shared field
> "series 3 · reps 10-12 · descanso 90 s". Header: routine name "Casa · pierna y core", goal,
> estimated duration 55 min, and computed required equipment chips (mancuernas 24 kg · banco).
> Footer: "Usar hoy" · "Usar esta semana" · "Guardar como plantilla".

**Prompt 6 — Ejercicios (biblioteca + crear propio).**
> Page "Ejercicios": search bar, filter chips including "sólo lo que puedo hacer con mi
> equipo (mancuernas + banco)" applied, and a grid of exercise cards each with an animated GIF,
> Spanish name, muscles line, equipment chips and quick actions (ficha · añadir a hoy · añadir
> a rutina · favorito). A detail panel on the right shows one exercise: big GIF, numbered
> technique steps, common mistakes, muscles worked, progression and regression options, personal
> history (best set, e1RM) and a "usar hoy" button. A "+ Crear ejercicio propio" modal form is
> visible with fields: nombre, imagen/GIF, músculos, equipamiento, patrón, unidad (kg / reps /
> segundos).

**Prompt 7 — Progreso.**
> Page "Progreso": top range selector (7 d · 30 d · todo). Cards: sets per muscle group versus
> a shaded published band, with two red "below band" gaps; recent PRs list; e1RM line chart for
> two lifts; weekly adherence strip. A body map with an explicit lens switch labeled
> "cobertura de entrenamiento" and (disabled, grayed) "fuerza vs referencia externa publicada —
> fuente y límites". Below, session history list with volume and duration per date, and an
> "Exportar CSV" button.

**Prompt 8 — Ajustes (equipo, coach, datos).**
> Page "Ajustes": stacked sections. "Perfil y ubicaciones" with three location tabs (Casa ·
> Gym · Parque) and each inventory as removable chips (mancuernas ajustables hasta 24 kg ·
> banco plegable · barra de dominadas · bandas). "Entrenamiento": objetivo, nivel, días/semana,
> duración por defecto. "Coach IA local": model status, loopback endpoint, allowed tools, and
> the sentence "el coach propone, las reglas disponen", plus a proposal history with the rule
> each one used. "Acciones de agentes": receipt rows with who, when, rule and numbers, and a
> "Deshacer" button on one of them. "Datos": export/import JSON and Symmetry, automatic backup,
> "Restaurar mi historial". "Apariencia": current palette (locked) and density. "Acerca de": no
> telemetry, no background downloads.

---

## 6. Componentes nuevos que estas ocho pantallas exigen

Cada uno es una pieza reutilizable del design system (`src/ui/`), con su test puro cuando la
lógica no sea de React:

| Componente | Para qué | Nota de implementación |
|---|---|---|
| `NumberField` (editable + ± + rueda + flechas) | R7, R8 | Un solo componente para peso, reps, series, descanso, segundos |
| `ReorderList` (arrastrar + subir/bajar) | R4, R13 | Mismo orden en Entrenar, Rutinas, Semana y bloques |
| `EquipmentChips` | R14 | Lee `traits.ts` + inventario de la ubicación |
| `ExerciseMedia` | R11 | GIF si existe; si no, marcador honesto («sin demostración») |
| `ExercisePicker` (uno a uno) y `BulkAddSheet` (varios + valores por defecto) | R5, R6 | Comparten búsqueda y filtros |
| `WeekGrid` + `SessionDragCard` | R2, R3, R8 | Pasado = hechos; futuro = plan |
| `UpNextBar` | R12, R13 | Ahora · siguiente · saltar · posponer · cambiar |
| `ResumeBanner` | Invariante 9 | Aparece en cualquier pantalla si hay sesión abierta |
| `CoachDock` | R15 | Propuesta + regla + «aplicar» + Deshacer |
| `UndoToast` | Invariante 10 | Un solo mecanismo de deshacer en toda la app |
| `VolumeBandBars` | R18 | Banda publicada, huecos visibles, sin inventar |
| `NumericKeypad` (móvil) | R7 | Un pulgar, sin abrir el teclado del sistema por sorpresa |

---

## 7. Trabajo pendiente heredado (no se pierde nada útil)

Los documentos borrados contenían trabajo vivo; queda recogido aquí y en
`docs/AGENT_HANDOFF.md`:

1. **`apply_plan`** en el canal MCP: que el coach pueda **aplicar** su propuesta a las casillas
   de hoy, con validación determinista y deshacer (habilita R15). Hoy sólo existe
   `swap_exercise`; falta crear la cola desde una propuesta.
2. **`undo_action`** como herramienta MCP: los acuses ya traen `undoToken` y la app sabe
   deshacer, pero un modelo depende de que el humano pulse el botón.
3. **Decisión del dueño:** `windowFactor` (`lib/recovery.ts`) estrecha la ventana con molestia
   alta y la ensancha con molestia baja, al revés de lo que dice su propio comentario. O el
   código o el comentario están invertidos. No se toca sin su palabra.
4. **Coach local Qwen** (nivel 3): pruebas con 8k/12k de contexto y las herramientas nuevas.
5. **CSV → `node:sqlite` → CLI de datos**: el export CSV existe; el espejo y la CLI no.
6. **Datos de prueba en el registro del dueño** (2026-10-09): la serie `goblet-squat 24 × 12` y
   la sesión cerrada de esa noche son de mis pruebas. Se quitan en Ajustes → *Acciones de
   agentes* → Deshacer (`buffy-finish-1`, `buffy-e2e-set-1`, `buffy-readiness-1`). La app no
   permite que un agente borre historial: por diseño, sólo el humano deshace.
7. **Paridad MCP restante** (2026-10-19): `undo_action` (el acuse ya trae `undoToken`),
   rutinas (`save/apply/delete`) y ajustes que no tocan datos de entrenamiento. Ver
   `docs/MCP_TOOL_SURFACE.md` §11.
8. **STT durante la sesión** (sugerencia del dueño, 2026-10-19, **no aprobada**): registrar
   por voz sin parar el entrenamiento. Antes de implementar hay que medir latencia, calidad
   ES/EN, consumo y privacidad; la opción debe ser local y opcional, nunca un servicio
   obligatorio. No se añadió ninguna dependencia en esta ronda.

---

## 8. Cómo se trabajará de aquí en adelante

1. **Los ocho mockups se generan y se revisan** con el dueño: se descartan, se corrigen o se
   aprueban **antes** de tocar código. Los prompts de §5 son el punto de partida, no la verdad.
2. **Una página por ronda.** Se implementa, se prueba con los criterios de §1 y se enseña en el
   navegador. Nada de «rediseño entero».
3. **Los invariantes son tests.** Los que se pueden comprobar con un navegador (reordenar
   persiste, el peso se teclea, hay imagen, la semana se mueve) se convierten en pruebas
   Playwright de la app real.
4. **Cierre con artefacto.** Toda ronda de UI acaba en `pnpm tauri build` + los dos
   instaladores en el escritorio real, con el contenido del bundle comprobado (no sólo que el
   `.exe` exista).
5. **Nada se documenta dos veces.** Cuando una página esté terminada, aquí se anota «hecho» con
   la fecha; lo demás vive en el código y en `AGENT_HANDOFF.md`.

---

### Anexo · Qué documentación se borró (2026-10-09, orden del dueño)

| Borrado | Por qué |
|---|---|
| `UI_DESIGN.md` | Reglas de interfaz caducadas: diseñaban la app que no funciona |
| `TRAININGLAB_UI_PLAN.md` | Contrato de diseño v2 del rediseño de septiembre, hoy obsoleto |
| `plan_evaluacion_qa_ui_ux.md` | Auditoría UX de la app a rehacer |
| `plan_optimizacion_ecosistema.md` | Plan de limpieza/estructura ya ejecutado en su mayor parte |
| `PLAN_CSV_SQLITE_CLI.md` | Plan de datos; lo pendiente queda en §7.5 |
| `plan_ejecucion_llm_coach_qwen.md` | Plan del coach; lo pendiente queda en §7.4 |

**Conservado a propósito** (es conocimiento, no diseño): `ANTHROPOMETRY_MEASUREMENT_PROTOCOL`,
`plan_hipertrofia_abdomen`, `RESEARCH_FEATURE_VALIDATION`, `RESEARCH_IDEALS_BY_SPORT`,
`RESEARCH_PROTEIN_FFM_ENERGY_RESTRICTION`, `EXERCISE_DATA_AUDIT`, `LAYAS_MODELO_DECISION`
(documenta un modelo implementado y probado), `ARCHITECTURE`, `PRODUCT_SPEC`, `TESTING`,
`MCP_TOOL_SURFACE`, `BUFFY_IMPLEMENTATION_BRIEF` y el log `AGENT_HANDOFF`.
BodyLab queda **congelado**: ni su paleta, ni su código, ni sus docs se tocan; sólo se sigue
leyendo su export v2.
