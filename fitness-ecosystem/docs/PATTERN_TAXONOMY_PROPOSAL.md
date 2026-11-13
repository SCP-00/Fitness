# Taxonomía de patrones: auditoría y propuesta

> Medido el 2026-10-30 sobre el catálogo real (`ALL_EXERCISES` + `getTraits`, 152 entradas).
> **Nada de este documento está aplicado todavía**: es una propuesta con su plan de migración.
> Re-ejecutable con `.tmp-verify/patterns-by-family.mjs` y `.tmp-verify/pattern-audit-entry.ts`
> (arnés: `ENTRY=.tmp-verify/pattern-audit-entry.ts node .tmp-verify/run-qwen-live.mjs`).

## 1 · Lo que hay

28 patrones para 152 ejercicios. La distribución no es plana:

| Patrón | n | Familias que cubre |
|---|---:|---|
| `horizontal_push` | 18 | chest, triceps, shoulders |
| `horizontal_pull` | 16 | shoulders, lats, rhomboids, traps |
| `core_flexion` | 10 | core |
| `vertical_push` | 9 | shoulders, triceps |
| `elbow_flexion` | 9 | biceps |
| `elbow_extension` | 9 | triceps |
| `squat` | 8 | quadriceps |
| `cardio_interval` | 8 | quadriceps, calves, shoulders |
| `vertical_pull` | 6 | biceps, lats |
| `lunge` | 6 | quadriceps, glutes |
| `hinge` | 5 | core, hamstrings, glutes |

Familias donde **un patrón se lleva casi todo** (el síntoma que buscábamos):

| Familia | Dominante | Cuota |
|---|---|---|
| chest | `horizontal_push` | **94 %** (16 de 17) |
| biceps | `elbow_flexion` | 90 % |
| triceps | `elbow_extension` | 82 % |
| lats | `horizontal_pull` | 65 % |

Ese 94 % de pecho es exactamente el problema que ya nos costó una excepción en
`validateProposal` (2026-10-30): **15 de los 16 ejercicios de pecho son el mismo patrón**, así que
«un patrón por sesión» prohibía un día de pecho entero.

## 2 · Los tres defectos, con nombres

### a) Agrupación gruesa: un patrón que es cuatro ejercicios distintos

`horizontal_push` (18) mezcla tres mecánicas incompatibles:

- **press** (9): `barbell-bench-press`, `incline-bench-press`, `dumbbell-bench-press`,
  `machine-bench-press`, `incline-dumbbell-press`, `close-grip-bench`, `band-chest-press`,
  `dumbbell-floor-press`, `dumbbell-squeeze-press`.
- **fly / aducción** (3): `dumbbell-fly`, `cable-crossover`, `machine-chest-fly`.
- **push-up** (6): `push-ups`, `push-up-plus`, `deficit-push-up`, `decline-push-up`,
  `archer-push-up`, `pseudo-planche-push-up` (este además pertenece a *shoulders*).

`horizontal_pull` (16) mezcla **remo** (11), **deltoide posterior / face pull** (3),
**pull-apart** (1) y **encogimiento** (1: `dumbbell-shrugs`, que en realidad es elevación escapular).

Coste real hoy:
- el motor no puede programar press + fly en el mismo día sin saltarse su propia regla;
- el veto por hombro dolorido (`vetoedPatterns`) borra **los 18** de golpe, incluido el fly, que es
  justo lo que un hombro irritado tolera mejor que un press;
- al coach local se le mandan cadenas como `horizontal_push` a un modelo de 4B que no tiene forma
  de saber que ahí dentro caben tres ejercicios distintos.

### b) Asignaciones que no describen el ejercicio

| Id | Hoy | Debería ser |
|---|---|---|
| `dumbbell-shrugs` | `horizontal_pull` (traps) | elevación escapular, no un tirón horizontal |
| `box-jump` | `squat` | pliométrico (salto), no una sentadilla con carga |
| `dips` | `vertical_push` (triceps) | dip: extensión de codo + extensión de hombro |
| `hollow-rock` | `core_flexion` | anti-extensión dinámica |
| `mountain-climber` | `core_flexion` | anti-extensión + flexión de cadera (y es cardio) |
| `kettlebell-swing` | `hinge` (glutes) | bisagra **balística**; comparte patrón con un peso muerto lento |

### c) Un patrón, dos familias opuestas

`shoulder_extension` (2) contiene `dumbbell-pullover` (familia **chest**) y
`straight-arm-pulldown` (familia **lats**). Cualquier regla que razone «qué trabaja este patrón»
se equivoca en uno de los dos.

## 3 · Propuesta: dos ejes, un campo nuevo

Mantener `pattern` como **acción articular** (es lo que el motor razona: cobertura, presupuesto,
veto por articulación) y añadir `subPattern` como **mecánica del ejercicio** (lo que distingue un
press de un fly).

```
pattern     = QUÉ hace la articulación   → engine, veto, cobertura   (28 valores, se queda)
subPattern  = CÓMO se hace               → regla de sesión, coach, UI (nuevo, aditivo)
```

Por qué aditivo y no un renombrado:
1. `pattern` **no se persiste** en la base del usuario (no está en `TLSet`, ni en `Session`, ni en
   `Routine`: se deriva de `getTraits` en cada plan). Un renombrado no necesitaría migración de
   datos, pero sí tocaría **39 apariciones de `horizontal_push` repartidas en 19 ficheros de
   test**, sin ganar ni una regla nueva.
2. `subPattern` se puede introducir **sin cambiar un solo valor existente**: los tests que afirman
   `pattern === "horizontal_push"` siguen pasando el día que se añada.

### Mapa propuesto para los seis patrones gruesos

| `pattern` | `subPattern` | Ejercicios |
|---|---|---|
| `horizontal_push` | `press` | bench (barra/máquina/mancuerna), inclinado, floor, squeeze, close-grip, banda |
| | `fly` | `dumbbell-fly`, `cable-crossover`, `machine-chest-fly` |
| | `push_up` | `push-ups`, `push-up-plus`, `deficit-`, `decline-`, `archer-`, `pseudo-planche-` |
| `horizontal_pull` | `row` | barbell, seated cable, dumbbell, t-bar, inverted, table, band, renegade, chest-supported, kettlebell |
| | `rear_delt` | `face-pulls`, `band-face-pull`, `reverse-fly` |
| | `pull_apart` | `band-pull-apart` |
| | `shrug` | `dumbbell-shrugs` |
| `vertical_push` | `press` | overhead, arnold, machine, seated dumbbell, band, kettlebell push-press |
| | `handstand` | `pike-push-up`, `wall-handstand-push-up` |
| | `dip` | `dips` |
| `core_flexion` | `crunch` | crunch, decline-crunch, sit-up, cable-crunch, v-up |
| | `leg_raise` | lying, hanging, hanging-knee |
| | `dynamic` | `mountain-climber`, `hollow-rock` |
| `squat` | `bilateral` | barbell, front, leg-press, goblet, hack, sumo |
| | `unilateral` | `pistol-squat` |
| | `plyo` | `box-jump` |
| `hinge` | `deadlift` | deadlift, RDL, good-morning |
| | `unilateral` | `single-leg-rdl` |
| | `ballistic` | `kettlebell-swing` |

El resto de patrones (28 − 6) se quedan con `subPattern` igual a su `pattern`: no hay nada que
partir y no merece la pena inventarlo.

### Lo que desbloquea

1. **La regla de sesión pasa a ser `subPattern`**, no familia ni un caso especial: bench + fly es
   legal (press ≠ fly), bench + incline no (dos `press`), y nada de excepciones como la que
   acabamos de meter en `validateProposal`.
2. **El veto por dolor gana resolución**: hombro dolorido veta `press` y `handstand`, no `fly` —
   que es precisamente lo que un fisio manda hacer.
3. **El coach local recibe una cadena que un 4B puede usar** (`press` / `fly`) en vez de un cajón
   con 18 cosas dentro.
4. La UI puede etiquetar el ejercicio por lo que es («Apertura», «Press», «Remo») sin tocar el
   motor.

## 4 · Plan por fases (cada una deja la suite verde)

| Fase | Cambio | Riesgo | Qué se verifica |
|---|---|---|---|
| **1** | Añadir `subPattern` a `ExerciseTraits` (+ `getTraits`) con la tabla de arriba. `pattern` intacto. | Bajo (aditivo) | suite actual **sin cambios** + un test que exija `subPattern` en las 152 entradas y que `subPattern === pattern` fuera de los 6 gruesos |
| **2** | Corregir las 6 asignaciones de `pattern` de la sección 2b, con un test que fije la intención (un `box-jump` no es una sentadilla). | Medio (39 menciones en tests) | buscar los asserts que cambian; no hay datos que migrar |
| **3** | `validateProposal` y el coach pasan a razonar con `subPattern`; se borra la excepción de familia enfocada. | Medio | `test_coach_focus` reescrito con los mismos casos, ahora sin `focusFamilies` |
| **4** | Etiqueta de UI por `subPattern` (`i18n`) y `PATTERN_GROUPS` del motor afinado para preferir press+fly en cobertura. | Bajo | auditoría CSS + i18n coverage |

Lo que **no** propongo: renombrar los 28 valores de `pattern`, ni derivar `subPattern` en la UI
(serían dos fuentes de verdad para lo mismo).

## 5 · Decisión que necesito del dueño

**¿La regla de sesión debe ser «un ejercicio por mecánica» (`subPattern`) en lugar de «uno por
patrón con excepción en el día enfocado»?** Con la taxonomía fina, un día de pecho podría ser
press + fly + push-up (tres, misma familia, tres mecánicas distintas), que es entrenamiento
razonable; hoy lo máximo legal es dos.

Si la respuesta es sí, la fase 3 sustituye la excepción que acabo de construir por una regla que
no necesita excepciones. Si es no, las fases 1 y 2 siguen valiendo (mejor veto y mejor etiqueta)
sin tocar ninguna regla de sesión.
