# Las 34 herramientas del MCP `fitness` — guía de uso para el coach local

Este fichero es para el modelo que actúa como coach (Qwen u otro) cuando habla con
TrainingLab por el servidor MCP (`scripts/fitness-mcp-server.mjs`). No es
documentación de arquitectura: es la **forma correcta de usarlas**, escrita para
un modelo pequeño. Los hechos del catálogo están en `EXERCISES.md` y
`knowledge.json`; esto es cómo se piden y qué significan las respuestas.

---

## 0. La regla de oro

> **El modelo propone; la app dispone.** Ninguna acción tuya toca los datos: se
> escribe un fichero de acciones, TrainingLab lo valida con **las mismas reglas
> que su interfaz** y contesta con un acuse. Si el acuse no dice `applied`, no ha
> pasado nada.

Cuatro verdades que gobiernan todo lo demás:

1. **Lee antes de actuar.** `read_current_state` es la primera llamada de
   cualquier conversación útil. Sin ella no sabes qué material tiene, qué se
   está recuperando ni qué casillas hay hoy.
2. **Los acuses son la verdad.** `status: "applied"` = hecho (y con
   `undoToken`). `rejected` = no se hizo, con la regla que lo frenó. `pending` =
   la app está cerrada, la acción está en el fichero y se aplicará al abrir.
   Nunca digas "registrado" si el status es `pending`; di "queda pendiente de
   que abras TrainingLab".
3. **No inventes identificadores.** Todo `exercise_id` sale del catálogo
   (`EXERCISES.md`, `knowledge.json`). Un id inventado devuelve
   `rule: unknown_exercise` y no registra nada.
4. **El historial no se edita.** No existe ninguna herramienta que cambie una
   serie ya registrada ni una sesión cerrada. Sí existe **una** que borra una
   sesión entera (`delete_session`, exige `confirm: true`) y solo si el usuario
   te lo pide en voz alta; el usuario puede deshacerla desde Ajustes. Las series
   de días pasados no se tocan nunca.

---

## 1. Lecturas (8) — el estado del mundo

| Herramienta | Para qué | Argumentos |
|---|---|---|
| `read_current_state` | Estado completo: series de hoy, familias ya trabajadas, material, objetivo, nivel, presupuesto, **tu parte de hoy** y las casillas del plan de hoy. | — |
| `read_recovery` | Familias que NO se deben entrenar hoy, con horas desde su última serie y la ventana aplicada. | — |
| `read_weekly_volume` | Series directas por familia en la ventana (por defecto 7 días) frente a la banda 12-20 (Baz-Valle 2022). Lo que no aparece en `rows` es lo **no entrenado**. | `days` |
| `read_progression` | Veredicto por ejercicio: `raise` (con el peso exacto), `repeat`, `reduce` o `escalate` a otra variante. Trae la evidencia numérica. | `exercise_id`, `goal` |
| `read_exercise_history` | Día a día de UN ejercicio: series, peso tope, reps, segundos, mejor e1RM, series al fallo. | `exercise_id` |
| `read_history` | Sesiones cerradas (paginado), con su **id** (lo necesita `delete_session`). Volumen, series, marcas (W/D/F). | `limit`, `before` |
| `read_training_stats` | Totales del registro + la ventana de recuperación + las últimas series. | `limit` |
| `read_body_stats` | Espejo de BodyLab: perfil y última medición de cada tipo. | — |

Detalles que importan al responder:

- `read_current_state.todayPlan.source` dice de dónde sale el plan:
  - `app (...)` → **son las casillas reales de la app**; úsalas tal cual.
  - `recomputed (...)` → es una reconstrucción con lo que hay en el espejo;
    puede diferir de lo que el usuario ve (sin enlace de BodyLab, sin molestias
    del día). Dilo si vas a hablar de casillas concretas.
- `read_recovery.readinessUsed` dice si el parte del día salió del espejo de la
  app o si se usó el valor neutro 3/3/3. Si es neutro, **no** afirmes que la
  ventana está adaptada a cómo se siente hoy.
- Las series de calentamiento (`warmup: true`) no cuentan como trabajo en
  ninguna parte del sistema: ni volumen, ni recuperación, ni récords, ni semana.

## 2. Explicar (1) — solo material publicado

`explain_biomechanics` tiene **dos temas**: `calves` (inserción del tendón de
Aquiles y longitud del vientre) y `limb_lengths` (palancas por longitudes
segmentarias). Si la pregunta no es de esos dos, devuelve
`status: "not_covered"` con `explanation: null`.

- Con `not_covered` **no respondas tú de memoria**: di que no hay material
  publicado y ofrece lo que sí sale del registro (`read_progression`,
  `read_recovery`). Nunca inventes anatomía, ni mezcles temas.

## 3. Proponer (1) — el conjunto fundamentado, no la prescripción

`propose_training_session` (`time_budget_min`, `focus_family` opcional) devuelve
los ejercicios que **tu registro y tu material permiten hoy**: excluye familias
en su ventana de recuperación, exige el material declarado y deja **uno por
patrón de movimiento**. Son candidatos: series, reps y descansos los calcula la
app contra tu presupuesto.

Úsala cuando el usuario pregunta «¿qué hago hoy?». Preséntale los elegidos con
su razón (recuperación, patrón, dificultad) y no prometas números que la
herramienta no ha devuelto.

## 4. Acciones (23) — con acuse y deshacer

| Herramienta | Qué hace | Claves |
|---|---|---|
| `log_training_set` | Registra UNA serie en la sesión de hoy. | `exercise_id` (obligatorio), `weight_kg`, `reps` **o** `duration_sec`, `effort` (`D` cerca del fallo, `F` al fallo), `warmup`, `notes` (≤280), `idempotency_key` |
| `set_readiness` | Escribe el parte de hoy: `energy`, `motivation`, `soreness` (1-5, al menos uno). **Ojo con la tercera: `soreness` es *frescura*, y 5 = sin agujetas** — es la escala del motor (`bodylab/core/training/src/session.ts`), la misma que la etiqueta de la app («Frescura (5 = sin agujetas)»). | `idempotency_key` |
| `configure_training` | Cambia el sobre de planificación: `goal` (`hypertrophy`/`strength`/`recomposition`), `level`, `time_budget_min` (10-300), `inventory` (reemplaza la lista entera). | `idempotency_key` |
| `swap_exercise` | Cambia una casilla del plan de hoy por otra: mismo patrón, mismo tipo de carga, con material y que no esté ya en la sesión. | `exercise_id`, `replacement_id`, `idempotency_key` |
| `finish_session` | Cierra la sesión de hoy y la pasa al historial. **Exige `confirm: true`.** | `confirm`, `idempotency_key` |
| `add_exercise` | Añade un ejercicio al plan de HOY (una casilla más, no un re-plan). | `exercise_id` (obligatorio), `sets` (0-12; 0 = sin prescripción), `position` (`start`/`end`), `idempotency_key` |
| `set_day_focus` | Enfoque de HOY: `"auto"`, `"push"`, `"pull"`, `"legs"`, `"core"`, o un array de familias. | `focus`, `idempotency_key` |
| `set_week_override` | Escribe UN día de su semana: `rest: true`, `families: [...]`, o `families: []` para devolverlo al planificador. | `weekday` (0 = lunes), `rest`, `families`, `idempotency_key` |
| `delete_session` | **Borra una sesión cerrada del registro.** Destructiva: **exige `confirm: true`** y que el usuario lo haya pedido. | `session_id` (de `read_history`), `delete_sets`, `confirm`, `idempotency_key` |
| `set_set_time` | Corrige la hora de una serie registrada HOY. | `set_id`, `occurred_at` (ISO de hoy), `idempotency_key` |
| `reorder_today` | Mueve una fila de la sesión de HOY a una posición 1-based (el arrastre de Entrenamiento). | `exercise_id`, `position`, `idempotency_key` |
| `set_exercise_state` | Marca una fila de hoy como `active`, `skipped` o `postponed`; no cambia la prescripción. | `exercise_id`, `state`, `idempotency_key` |
| `reset_today_order` | Devuelve la sesión de hoy al orden del planificador (falla si no hay orden propio). | `idempotency_key` |
| `swap_week_days` | Intercambia dos días efectivos de la semana (0 = lunes … 6 = domingo), como el arrastre de Semana. | `from_weekday`, `to_weekday`, `idempotency_key` |
| `undo_action` | **Deshace UNA acción tuya ya aplicada** por su `undoToken` (el del acuse en `read_receipts`). Solo deshace las tuyas (mismo `origin`); no deshace `finish_session` ni `delete_session` (abrir/restaurar el historial es cosa del usuario desde Ajustes). Un undo no es deshacible: el bucle se cierra una vez. | `undo_token`, `idempotency_key` |
| `save_routine` | Crea o reescribe una plantilla de rutina del usuario. Los números fuera de rango se **rechazan** (no se recortan): sets 1-12, reps 1-30, descanso 15-600 s, rir 0-5, máx. 24 ejercicios, uno por ejercicio. | `name`, `items` (obligatorio), `routine_id` (para reescribir), `notes`, `idempotency_key` |
| `apply_routine` | Vierte una plantilla en la sesión de HOY (como el botón «Usar hoy»). Los ejercicios ya presentes se omiten; si no cabe ninguno, se rechaza. | `routine_id`, `idempotency_key` |
| `delete_routine` | **Borra una plantilla del usuario.** Destructiva: **exige `confirm: true`** y que él lo pida; el acuse trae deshacer. | `routine_id`, `confirm`, `idempotency_key` |
| `set_language` | Idioma de la interfaz (`en`/`es`). Solo presentación. | `language`, `idempotency_key` |
| `set_sound` | Activa/calla los avisos de sonido y/o fija el volumen maestro (0-1). Solo presentación. | `enabled`, `volume`, `idempotency_key` |
| `reset_decision_model` | Reinicia el modelo local (los pesos aprendidos). **Exige `confirm: true`.** Vuelve a aprender de los próximos registros; el deshacer restaura el modelo de ese instante. | `confirm`, `idempotency_key` |
| `regenerate_week` | Regenera la semana del planificador (botón «Regenerar»). Tus días autorizados a mano se conservan. Deshacer = la semana anterior exacta. | `idempotency_key` |
| `log_body_measurement` | Escribe en el **espejo local de análisis**, NO en BodyLab (esa app no tiene canal todavía). Sin acuse ni deshacer. | `type`, `value`, `unit`, `notes` |

Reglas de uso (aprendidas de verdad, no teóricas):

1. **Una serie, una llamada.** `reps` es 1-50; para trabajo cronometrado usa
   `duration_sec` (1-7200) y omite `reps`.
2. **`D` significa cerca del fallo** (1-2 repeticiones en reserva), no drop set.
   `F` es al fallo. `warmup: true` es aproximación y no cuenta como trabajo.
3. **Manda `idempotency_key`** cuando el usuario pueda pedir lo mismo dos veces o
   cuando reintentes tras un timeout: la app responde con el acuse original y
   nunca registra la serie dos veces.
4. **El peso está limitado por tu material declarado**: por encima del tope del
   material, `weight_exceeds_inventory`. Si no hay material para el ejercicio,
   `gear_mismatch` (y te dice qué falta, p. ej. «barbell + rack»).
5. **`configure_training` con varias claves son varias acciones**, cada una con
   su acuse y su deshacer. Si el usuario no lo ha pedido, no toques su
   configuración para "encajar" una sesión: propón, no mutiles.
6. **`finish_session` solo si el usuario dice que ha terminado.** Cerrar la
   sesión la manda al historial (inmutable para ti) y ajusta el modelo local.
7. **`swap_exercise`, `add_exercise` y `set_day_focus` son transitorios**: viven
   en la sesión de hoy y se pierden al reiniciar la app. Son para «hoy no puedo
   con esto» o «hoy toca abdomen», no para cambiar el plan de la semana. Lo que
   sí escribe ajustes es `set_week_override`.
8. **`add_exercise` no replanifica**: añade una casilla al final (o al
   principio) del plan de hoy. Si el ejercicio ya está en la sesión, la app
   responde `already_in_session`; si el material no lo permite, `gear_mismatch`.
   No inventes series: sin `sets` la fila queda **sin prescripción**, que es lo
   honesto cuando nadie las ha dicho.
9. **`set_set_time` y `occurred_at` solo valen para HOY.** Un instante de otro
   día devuelve `occurred_at_not_today`: la serie saldría de la sesión de hoy y
   el historial no se toca. Si el usuario quiere corregir un día pasado, tiene
   que hacerlo desde la app.
10. **`delete_session` es la única acción destructiva del historial.** Antes de
    llamarla, dile al usuario qué sesión es (fecha y series) y pídele un sí
    claro; y avísale de que puede deshacerla en **Ajustes → Acciones de
    agentes**. Si solo quiere quitar el cierre de hoy, **no** uses esto: eso es
    deshacer `finish_session`, que se hace desde esa misma lista.
11. **`log_body_measurement` no llega a BodyLab.** Si el usuario quiere una
    medida en su app, díselo claro: tiene que introducirla él. No la presentes
    como registrada en BodyLab.
12. **`undo_action` es tu deshacer, no el de todos.** Solo puedes deshacer tus
    propias acciones (mismo `origin`), y un undo no se deshace. Para abrir o
    restaurar una sesión cerrada, díle al usuario que lo pulse en **Ajustes →
    Acciones de agentes**.
13. **Las rutinas son plantillas, no la sesión.** `save_routine` escribe en la
    pestaña Rutinas (sobrevive a reinicios); `apply_routine` vierte una en HOY
    (se pierde al reiniciar). Si el usuario dice «guárdame esto como rutina»,
    usa la primera; si dice «haz esta hoy», la segunda. Los números fuera de
    rango se rechazan con `routine_value_out_of_range`: no los recortes tú
    tampoco, pídele el correcto.
14. **`set_language` y `set_sound` no tocan datos.** Son ajustes de presentación
    que la app ya permite cambiar a mano; pedírselos por chat es válido («pásame
    el idioma a inglés»), pero nunca las uses para «arreglar» una sesión.
15. **`regenerate_week` no borra lo que el usuario escribió.** Regenera el plan
    del planificador; sus días autorizados en Semana se conservan. Y
    `reset_decision_model` borra lo aprendido: pide `confirm: true` y solo si
    él lo pide.

## 5. Comprobar (1) — el acuse, después

`read_receipts` (`id`, `limit`): todos los acuses o el de una acción concreta.
Úsala cuando una acción devolvió `pending`, o para explicar qué pasó con un id
concreto. Cada acuse trae `status`, el `detail` bilingüe, la `rule` que frenó el
rechazo, el `origin` (`mcp:<agente>`) y —si se puede deshacer— su `undoToken`.
El usuario ve lo mismo en **Ajustes → Acciones de agentes**, con un botón
*Deshacer*. Tú no tienes herramienta de deshacer: pide al usuario que pulse ese
botón.

## 6. El flujo bueno (de principio a fin)

Mensaje del usuario: *«me duelen los hombros, quiero entrenar pero no sé qué».*

1. `read_current_state` → material, objetivo, presupuesto, parte de hoy y casillas.
2. `read_recovery` → qué familias están dentro de su ventana (hombro incluido).
3. `read_weekly_volume` → qué va corto esta semana (lo que sí se puede tocar).
4. `propose_training_session { focus_family: "quadriceps", time_budget_min: 45 }`
   → candidatos que respetan la recuperación y el material.
5. Se lo cuentas al usuario con la razón de cada ejercicio, **sin inventar series**.
6. Si dice «vale», registras lo que hace con `log_training_set` (una llamada por
   serie, `idempotency_key` por serie).
7. Si registra algo con esfuerzo, marca `D`/`F`: es lo que alimenta la
   progresión y la recuperación de mañana.
8. Al terminar, `finish_session { confirm: true }`.
9. Si algo no cuadra (`rejected`), lee la `rule` y explícala en español normal.

## 7. Códigos de regla que verás

| Código | Significa | Qué hacer |
|---|---|---|
| `unknown_exercise` | El id no está en el catálogo. | Busca el id real en `EXERCISES.md`. |
| `gear_mismatch` | Falta material (te dice cuál). | Propón una alternativa del pool. |
| `weight_exceeds_inventory` | El peso supera el tope del material. | Baja la carga. |
| `reps_out_of_range` / `duration_out_of_range` | Fuera de 1-50 / 1-7200. | Corrige el número. |
| `effort_invalid` | Marca distinta de `D`/`F`. | Usa `D`, `F` o `warmup: true`. |
| `confirm_required` | `finish_session` sin `confirm: true`. | Añádelo solo si el usuario lo pidió. |
| `already_finished` / `nothing_to_finish` | La sesión de hoy ya está cerrada o está vacía. | No insistas; cuéntaselo. |
| `not_in_plan` / `pattern_mismatch` / `load_type_mismatch` | El cambio de casilla no conserva patrón y carga, o esa casilla no existe hoy. | Mira `read_current_state.todayPlan`. |
| `already_in_session` | Ese ejercicio ya está en la sesión de hoy. | Un ejercicio por patrón. |
| `readiness_required` / `readiness_out_of_range` | Falta el nivel o es <1 o >5. | Manda los que tengas, 1-5. |
| `time_budget_out_of_range` | Fuera de 10-300 minutos. | Ajusta. |
| `sets_out_of_range` / `position_invalid` | La prescripción o la posición de `add_exercise` no son válidas. | `sets` 0-12; `position` `start`/`end`. |
| `unknown_focus` | Ese enfoque no es un preset (`auto`/`push`/`pull`/`legs`/`core`). | Usa el preset o un array de familias. |
| `unknown_family` | La familia muscular no existe. | Mira las familias reales del catálogo. |
| `weekday_out_of_range` / `week_override_params_required` | Día fuera de 0-6 o no dijiste ni descanso ni familias. | `weekday` 0-6 (0 = lunes) y `rest` o `families`. |
| `session_required` / `unknown_session` | Falta el id de la sesión o no está en el registro. | Sácalo de `read_history`. |
| `delete_sets_invalid` | `delete_sets` no es true/false. | Corrígelo. |
| `set_required` / `set_not_found` | Falta el id de la serie o no es de hoy. | Solo se corrige la hora de series de HOY. |
| `occurred_at_invalid` / `occurred_at_not_today` / `occurred_at_required` | La hora no es ISO válido, no es de hoy, o no la enviaste. | Manda la hora en ISO y del día de hoy. |
| `unknown_preset` / `inventory_row_invalid` | Material mal especificado. | Usa `{ presetId: "..." }` o label + capabilities. |
| `expired` | La acción caducó antes de que la app abriera. | Vuelve a proponerla. |
| `undo_token_required` / `undo_token_unknown` | Falta el `undo_token` o ese id no está aplicado y deshacible. | Míralo en `read_receipts` (campo `undoToken`). |
| `undo_not_yours` | Esa acción la pidió otro agente. | No es tuya: no la deshagas. |
| `undo_session_closed` | El token es un `finish_session` o `delete_session`. | Eso lo deshace el usuario desde Ajustes. |
| `routine_name_required` / `routine_name_too_long` / `routine_items_required` / `routine_items_too_many` | La plantilla no tiene nombre, es larga, no tiene items o pasa de 24. | Corrige la forma. |
| `routine_value_out_of_range` / `routine_duplicate_exercise` | Un número de `items` está fuera de rango o un ejercicio se repite. | Corrige el número; uno por ejercicio. |
| `routine_required` / `unknown_routine` | Falta `routine_id` o esa plantilla no existe. | Sácalo de `read_current_state` o de la app. |
| `language_invalid` | Idioma distinto de `en`/`es`. | Usa uno de los dos. |
| `sound_params_required` / `enabled_invalid` / `volume_out_of_range` | Sin parámetros, `enabled` no es boolean o `volume` fuera de 0-1. | Corrige. |

## 8. Lo que NO debes hacer

- **No afirmes que algo se guardó** sin un acuse `applied`.
- **No digas que has leído el historial** para editarlo: no puedes.
- **No respondas biomecánica fuera de los dos temas** del punto 2.
- **No cambies el material ni el presupuesto** para que «quepa» una sesión.
- **No mezcles series de calentamiento con trabajo real** al hablar de volumen.
- **No prometas cifras** (series, minutos, pesos) que no vengan de una
  herramienta; los números que enseña el usuario y los que calcula la app
  mandan sobre tu texto.
