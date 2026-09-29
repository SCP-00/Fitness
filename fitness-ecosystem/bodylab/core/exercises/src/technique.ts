/**
 * Technique, effort and safety — written per **movement pattern**, resolved per
 * **exercise**.
 *
 * Why not per exercise: 143 exercises × (setup + execution + mistakes + safety +
 * breathing + effort) × two languages is content nobody maintains, and it would
 * lie — the squat pattern teaches the same thing whether you hold a barbell, a
 * dumbbell or nothing. So the pattern carries the coaching, and a small override
 * table adds what is genuinely specific to a variant ("feet high on the box for
 * the decline push-up").
 *
 * Two numbers the owner asked to be explicit about:
 *   - `techniqueLevel` (1–5) is **how much skill the movement costs**, not how
 *     strong you must be — a heavy leg press is 1, a barbell snatch-style hinge
 *     is 4–5. `techniqueWhy` says where the difficulty actually lives.
 *   - `effort` is the **RIR target** (reps in reserve) with the reasoning, because
 *     "train hard" is not an instruction. It is guidance, not a law: the session
 *     planner's own prescription still wins when it disagrees.
 *
 * Pure data + a pure lookup (no DOM, no I/O): the app renders this, the local LLM
 * reads it as context, the tests check it. @module technique
 */

import type { MovementPattern, ProgressionAxis } from "./traits";
import { EXERCISE_TRAITS } from "./traits";
import { getExerciseById } from "./catalog";
import { PATTERN_DEMOS, type PatternDemo } from "./demo";

export interface Cue {
  en: string;
  es: string;
}

export interface PatternTechnique {
  /** Skill cost of the movement, 1 (nearly foolproof) to 5 (needs coaching). */
  techniqueLevel: 1 | 2 | 3 | 4 | 5;
  /** Where that difficulty actually lives. */
  techniqueWhy: Cue;
  /** Recommended tempo as eccentric–pause–concentric seconds. */
  tempo: string;
  breathing: Cue;
  setup: Cue[];
  execution: Cue[];
  mistakes: Cue[];
  safety: Cue[];
  effort: { rir: string; note: Cue };
}

const c = (en: string, es: string): Cue => ({ en, es });

export const PATTERN_TECHNIQUE: Record<MovementPattern, PatternTechnique> = {
  horizontal_push: {
    techniqueLevel: 3,
    techniqueWhy: c(
      "The shoulder pays for every mistake here: the scapula must be set before the first rep, not adjusted during it",
      "El hombro paga cada error aquí: la escápula se fija antes de la primera repetición, no se corrige durante",
    ),
    tempo: "2-1-1",
    breathing: c(
      "Inhale on the way down, brace, exhale as you push",
      "Inhala al bajar, aprieta el abdomen y exhala al empujar",
    ),
    setup: [
      c(
        "Pull the shoulder blades back and down and hold them there for the whole set",
        "Lleva las escápulas atrás y abajo y mantenlas ahí toda la serie",
      ),
      c(
        "Hands slightly wider than the elbows, wrists stacked over the forearms",
        "Manos algo más anchas que los codos, muñecas alineadas con los antebrazos",
      ),
      c(
        "Plant the feet and keep the hips on the surface — a press is a whole-body brace",
        "Apoya los pies y mantén la cadera en la superficie: un press es un bloqueo de todo el cuerpo",
      ),
    ],
    execution: [
      c(
        "Lower until the hands are level with the mid-chest, no further",
        "Baja hasta que las manos queden a la altura del pecho medio, no más",
      ),
      c(
        "Keep the elbows at roughly 45° from the torso — not flared to a T",
        "Mantén los codos a unos 45° del torso, no abiertos en T",
      ),
      c(
        "Push the surface away and finish with the shoulder blades still back",
        "Empuja la superficie lejos y termina con las escápulas todavía atrás",
      ),
    ],
    mistakes: [
      c(
        "Bouncing off the chest: it turns a chest exercise into a tendon lottery",
        "Rebotar en el pecho: convierte un ejercicio de pecho en una lotería de tendones",
      ),
      c(
        "Letting the shoulders roll forward at the top, which unloads the chest",
        "Dejar que los hombros se vayan adelante arriba, lo que descarga el pecho",
      ),
    ],
    safety: [
      c(
        "Sharp pain at the front of the shoulder means less depth or a narrower angle today",
        "Dolor punzante en la parte frontal del hombro significa menos recorrido o un ángulo más cerrado hoy",
      ),
    ],
    effort: {
      rir: "2-3",
      note: c(
        "Pressing is where form breaks first: stop the set when the last rep slows down, and save RIR 0-1 for the final set only",
        "El press es donde primero se rompe la técnica: corta la serie cuando la última repetición se ralentice y guarda el RIR 0-1 solo para la última serie",
      ),
    },
  },

  vertical_push: {
    techniqueLevel: 3,
    techniqueWhy: c(
      "Overhead work needs rib control: the lift fails when the lower back arches instead of the arm rising",
      "El trabajo por encima de la cabeza exige control de las costillas: falla cuando la lumbar se arquea en vez de subir el brazo",
    ),
    tempo: "2-0-1",
    breathing: c(
      "Brace the abdomen, exhale once the arms pass the forehead",
      "Bloquea el abdomen y exhala cuando los brazos pasen la frente",
    ),
    setup: [
      c(
        "Ribs down, glutes tight: the spine stops moving before the bar does",
        "Costillas abajo y glúteos firmes: la columna deja de moverse antes que la barra",
      ),
      c(
        "Elbows slightly in front of the hands at the start, never behind",
        "Codos ligeramente delante de las manos al inicio, nunca detrás",
      ),
      c(
        "Start with the hands at chin height — no wasted range",
        "Empieza con las manos a la altura del mentón: no gastes recorrido",
      ),
    ],
    execution: [
      c(
        "Press straight up and slightly back so the load finishes over the ears",
        "Empuja recto hacia arriba y algo atrás para terminar con la carga sobre las orejas",
      ),
      c(
        "Let the head move out of the way instead of ducking under the bar",
        "Aparta la cabeza en lugar de meterla bajo la barra",
      ),
      c(
        "Finish with the biceps beside the ears and the ribs still down",
        "Termina con los bíceps junto a las orejas y las costillas todavía abajo",
      ),
    ],
    mistakes: [
      c(
        "Leaning back to move the weight: that is a standing incline press",
        "Echarse atrás para mover el peso: eso es un press inclinado de pie",
      ),
      c(
        "Letting the elbows drift behind the body, which pinches the shoulder",
        "Dejar que los codos se vayan detrás del cuerpo, lo que pinza el hombro",
      ),
    ],
    safety: [
      c(
        "If the neck or lower back complains, lower the load before lowering the range",
        "Si se quejan el cuello o la lumbar, baja la carga antes que el recorrido",
      ),
    ],
    effort: {
      rir: "2-3",
      note: c(
        "The overhead press is unforgiving of failure — never train it to the point where the elbows drop",
        "El press por encima de la cabeza no perdona el fallo: nunca lo lleves al punto donde los codos caen",
      ),
    },
  },

  shoulder_flexion: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "Simple joint action — the only skill is refusing to swing",
      "Acción articular simple: la única destreza es no balancearse",
    ),
    tempo: "1-0-2",
    breathing: c(
      "Exhale up, inhale down",
      "Exhala al subir, inhala al bajar",
    ),
    setup: [
      c(
        "Stand tall with the ribs down; a slight elbow bend stays fixed all set",
        "De pie con las costillas abajo; una ligera flexión de codo queda fija toda la serie",
      ),
      c(
        "Grip the handle or dumbbell so the palm faces down or neutral",
        "Sujeta la mancuerna con la palma hacia abajo o neutra",
      ),
      c(
        "Start with the weight in front of the thighs, not beside them",
        "Empieza con el peso delante de los muslos, no al lado",
      ),
    ],
    execution: [
      c(
        "Raise in a straight line to shoulder height and stop there",
        "Sube en línea recta a la altura del hombro y detente ahí",
      ),
      c(
        "Keep the torso still — if it swings, the delt stopped working",
        "Mantén el torso quieto: si se balancea, el deltoides dejó de trabajar",
      ),
      c(
        "Lower over two seconds; the lowering is half the exercise",
        "Baja en dos segundos; la bajada es la mitad del ejercicio",
      ),
    ],
    mistakes: [
      c(
        "Momentum from the hips turning a raise into a throw",
        "Inercia de cadera que convierte una elevación en un lanzamiento",
      ),
      c(
        "Going above shoulder height with a heavy load",
        "Pasar de la altura del hombro con carga pesada",
      ),
    ],
    safety: [
      c(
        "Shoulder-height is a ceiling, not a challenge: above it, the joint pays",
        "La altura del hombro es un techo, no un reto: por encima, la articulación paga",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Small muscles tolerate low RIR at high reps, but keep the reps honest — no body English",
        "Los músculos pequeños toleran RIR bajo con muchas repeticiones, pero que las repeticiones sean honestas",
      ),
    },
  },

  shoulder_abduction: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "Easy to do and easy to do wrong: the classic cheat is shrugging with the traps",
      "Fácil de hacer y fácil de hacer mal: el truco clásico es encogerse con el trapecio",
    ),
    tempo: "1-1-2",
    breathing: c("Exhale up, inhale down", "Exhala al subir, inhala al bajar"),
    setup: [
      c(
        "Slight forward lean, elbows just in front of the torso",
        "Ligera inclinación al frente, codos justo delante del torso",
      ),
      c(
        "Start from the sides of the body, not from the front",
        "Empieza desde los costados del cuerpo, no desde el frente",
      ),
      c(
        "Shoulders down before the first rep; they stay down",
        "Hombros abajo antes de la primera repetición; se quedan abajo",
      ),
    ],
    execution: [
      c(
        "Lead with the elbows, not the hands — as if pouring water from a jug",
        "Guía con los codos, no con las manos: como si vertieras agua de una jarra",
      ),
      c(
        "Stop at shoulder height; going higher hands the work to the traps",
        "Detente a la altura del hombro; más arriba el trabajo pasa al trapecio",
      ),
      c(
        "Keep the hands slightly lower than the elbows throughout",
        "Mantén las manos algo más bajas que los codos todo el tiempo",
      ),
    ],
    mistakes: [
      c(
        "Shrugging the shoulders up to lift more weight",
        "Encoger los hombros para levantar más peso",
      ),
      c(
        "Using the whole body to bounce the weight up",
        "Usar todo el cuerpo para rebotar el peso hacia arriba",
      ),
    ],
    safety: [
      c(
        "If the shoulder clicks on the way up, reduce the range before reducing the weight",
        "Si el hombro chasquea al subir, reduce el recorrido antes que el peso",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Side delts respond to clean reps: RIR 1-2 with a strict tempo beats swinging to failure",
        "El deltoides lateral responde a repeticiones limpias: RIR 1-2 con tempo estricto rinde más que balancearse hasta el fallo",
      ),
    },
  },

  shoulder_extension: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "The skill is keeping the elbow locked: the moment it bends, the lats stop being the target",
      "La destreza es mantener el codo bloqueado: en cuanto se flexiona, el dorsal deja de ser el objetivo",
    ),
    tempo: "2-0-2",
    breathing: c("Exhale as the arm sweeps down", "Exhala mientras el brazo barre hacia abajo"),
    setup: [
      c(
        "Stand back from the anchor so the cable or band starts under tension",
        "Aléjate del anclaje para que la polea o la banda empiecen con tensión",
      ),
      c(
        "Hinge slightly and lock the elbow before the first rep",
        "Inclínate algo y bloquea el codo antes de la primera repetición",
      ),
      c(
        "Shoulders down; the torso stays still",
        "Hombros abajo; el torso se queda quieto",
      ),
    ],
    execution: [
      c(
        "Sweep the arms from overhead to the thighs in one long arc",
        "Barre los brazos de arriba a los muslos en un solo arco largo",
      ),
      c(
        "Feel the lat, not the triceps — if the triceps burn, the elbow bent",
        "Siente el dorsal, no el tríceps: si el tríceps arde, el codo se flexionó",
      ),
      c(
        "Return slowly until the arms are past the head",
        "Vuelve despacio hasta pasar los brazos por encima de la cabeza",
      ),
    ],
    mistakes: [
      c(
        "Turning it into a pushdown by bending the elbow",
        "Convertirlo en un jalón de tríceps flexionando el codo",
      ),
      c(
        "Leaning back and forth to move the load",
        "Balancearse adelante y atrás para mover la carga",
      ),
    ],
    safety: [
      c(
        "Overhead positions with a loaded shoulder need a warm-up set first, always",
        "Las posiciones por encima de la cabeza con el hombro cargado siempre piden una serie de calentamiento",
      ),
    ],
    effort: {
      rir: "2-3",
      note: c(
        "A great warm-up for pulling days and a poor ego lift: RIR 2-3 keeps it a lat exercise",
        "Excelente calentamiento para días de tirón y pésimo ejercicio de ego: RIR 2-3 lo mantiene como dorsal",
      ),
    },
  },

  horizontal_pull: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "Rows are cheated by the spine, not the arms: the extra inches always come from the torso",
      "Los remos se hacen trampa con la columna, no con los brazos: los centímetros extra siempre vienen del torso",
    ),
    tempo: "2-1-1",
    breathing: c(
      "Inhale as the arms extend, exhale as you pull",
      "Inhala al extender los brazos, exhala al tirar",
    ),
    setup: [
      c(
        "Set the torso angle first and keep it identical on every rep",
        "Fija el ángulo del torso primero y mantenlo idéntico en cada repetición",
      ),
      c(
        "Start with a long arm and a stretch across the shoulder blade",
        "Empieza con el brazo largo y un estiramiento en la escápula",
      ),
      c(
        "Wrists neutral, no hooking the handle",
        "Muñecas neutras, sin enganchar el agarre",
      ),
    ],
    execution: [
      c(
        "Drive the elbow back and down toward the hip, not out to the side",
        "Lleva el codo atrás y abajo hacia la cadera, no hacia un lado",
      ),
      c(
        "Finish with the shoulder blade pulled back, chest slightly turned to the working side",
        "Termina con la escápula atrás y el pecho algo girado al lado que trabaja",
      ),
      c(
        "Extend fully on the way out without letting the shoulder roll forward",
        "Extiende del todo a la vuelta sin dejar que el hombro se vaya adelante",
      ),
    ],
    mistakes: [
      c(
        "Rowing with the lower back: the torso rises and the lats relax",
        "Remar con la lumbar: el torso sube y el dorsal se relaja",
      ),
      c(
        "Cutting the range at the front, which is where the stretch lives",
        "Recortar el recorrido al frente, que es donde vive el estiramiento",
      ),
    ],
    safety: [
      c(
        "Support the free hand when the weight gets heavy — a lonely lower back is how rows end badly",
        "Apoya la mano libre cuando el peso suba: una lumbar sola es como terminan mal los remos",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Back work tolerates more volume than chest work: RIR 1-2 across sets, and add sets before adding load",
        "La espalda tolera más volumen que el pecho: RIR 1-2 en las series, y suma series antes que carga",
      ),
    },
  },

  vertical_pull: {
    techniqueLevel: 4,
    techniqueWhy: c(
      "It starts from a dead hang — a position the shoulder must be able to hold before it can pull",
      "Empieza desde un colgado relajado: una posición que el hombro debe poder sostener antes de tirar",
    ),
    tempo: "1-0-2",
    breathing: c(
      "Exhale on the way up, inhale on the way down",
      "Exhala al subir, inhala al bajar",
    ),
    setup: [
      c(
        "Hang first with the shoulders active, not slack",
        "Cuélgate primero con los hombros activos, no sueltos",
      ),
      c(
        "Grip just outside shoulder width, thumbs around the bar",
        "Agarre algo más ancho que los hombros, pulgar alrededor de la barra",
      ),
      c(
        "Cross the ankles and squeeze the legs to stop the swing",
        "Cruza los tobillos y aprieta las piernas para cortar el balanceo",
      ),
    ],
    execution: [
      c(
        "Start by pulling the shoulder blades down, then bend the elbows",
        "Empieza bajando las escápulas y luego flexiona los codos",
      ),
      c(
        "Drive the elbows toward the ribs, not the hands to the ceiling",
        "Lleva los codos hacia las costillas, no las manos al techo",
      ),
      c(
        "Keep the ribs down: kipping is a different exercise with different risks",
        "Mantén las costillas abajo: el kipping es otro ejercicio con otros riesgos",
      ),
    ],
    mistakes: [
      c(
        "Starting each rep from a slack hang, which shocks the shoulder",
        "Empezar cada repetición desde un colgado flojo, que castiga el hombro",
      ),
      c(
        "Half reps that never reach the bottom stretch",
        "Medias repeticiones que nunca llegan al estiramiento de abajo",
      ),
    ],
    safety: [
      c(
        "Elbow pain is common here: switch grip (pronated ⇄ neutral ⇄ supinated) before pushing through it",
        "El dolor de codo es común aquí: cambia el agarre (prono ⇄ neutro ⇄ supino) antes de insistir",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Bodyweight pulls fail suddenly: leave 1-2 reps in reserve, or use bands to keep the reps clean",
        "Los tirones a peso corporal fallan de golpe: deja 1-2 repeticiones en reserva o usa bandas para mantener repeticiones limpias",
      ),
    },
  },

  squat: {
    techniqueLevel: 3,
    techniqueWhy: c(
      "The skill is keeping the knees and the spine agreeing on the same path — depth without control is a lottery",
      "La destreza está en que rodillas y columna acuerden el mismo camino: profundidad sin control es una lotería",
    ),
    tempo: "2-1-1",
    breathing: c(
      "Big breath at the top, brace, exhale on the way up",
      "Respiración grande arriba, bloquea y exhala al subir",
    ),
    setup: [
      c(
        "Feet about shoulder-width, toes slightly out, whole foot planted",
        "Pies a la anchura de los hombros, puntas algo abiertas, pie completo en el suelo",
      ),
      c(
        "Brace the abdomen before you move an inch",
        "Bloquea el abdomen antes de moverte un centímetro",
      ),
      c(
        "Chest tall, gaze forward-down; the neck follows the spine",
        "Pecho alto, mirada al frente-abajo; el cuello sigue a la columna",
      ),
    ],
    execution: [
      c(
        "Sit down and back: hips and knees bend together, not in turns",
        "Siéntate atrás y abajo: cadera y rodillas se flexionan juntas, no por turnos",
      ),
      c(
        "Track the knees over the middle of the foot; let them travel forward if your ankles allow it",
        "Lleva las rodillas sobre el centro del pie; deja que avancen si el tobillo lo permite",
      ),
      c(
        "Go as deep as you can keep the heels down and the spine long — that is your depth today",
        "Baja hasta donde puedas mantener talones abajo y columna larga: esa es tu profundidad hoy",
      ),
    ],
    mistakes: [
      c(
        "Letting the knees collapse inward, which is a hip-control problem, not a knee problem",
        "Dejar que las rodillas se metan hacia dentro, que es un problema de control de cadera, no de rodilla",
      ),
      c(
        "Butt-wink at the bottom: the pelvis tucks and the spine rounds under load",
        "Retroversión abajo: la pelvis se mete y la columna se redondea con carga",
      ),
    ],
    safety: [
      c(
        "Knee pain below the kneecap usually improves with a slower descent and a slightly wider stance",
        "El dolor bajo la rótula suele mejorar con un descenso más lento y una postura algo más ancha",
      ),
    ],
    effort: {
      rir: "1-3",
      note: c(
        "Leg work is systemically expensive: 2-3 RIR on the first sets, and stop when the tempo is what fails",
        "El trabajo de pierna es caro a nivel sistémico: RIR 2-3 en las primeras series y corta cuando lo que falle sea el tempo",
      ),
    },
  },

  hinge: {
    techniqueLevel: 4,
    techniqueWhy: c(
      "It is a hip movement carrying a spine — the moment the two disagree, the lower back takes the load",
      "Es un movimiento de cadera que carga una columna: en cuanto ambos no coinciden, la lumbar se lleva la carga",
    ),
    tempo: "2-1-1",
    breathing: c(
      "Breathe at the top, hold the brace all the way down",
      "Respira arriba y mantén el bloqueo todo el descenso",
    ),
    setup: [
      c(
        "Bar or weights close to the body, shoulders slightly in front of the hips",
        "Barra o pesos cerca del cuerpo, hombros algo delante de la cadera",
      ),
      c(
        "Soften the knees and lock them there: this is a hip movement",
        "Flexiona algo las rodillas y bloquéalas: esto es un movimiento de cadera",
      ),
      c(
        "Brace as if someone were about to poke your stomach",
        "Bloquea como si alguien fuera a darte un golpe en el abdomen",
      ),
    ],
    execution: [
      c(
        "Push the hips back, not the chest down: the torso follows the hips",
        "Lleva la cadera atrás, no el pecho abajo: el torso sigue a la cadera",
      ),
      c(
        "Keep the spine long and the neck neutral throughout",
        "Mantén la columna larga y el cuello neutro todo el tiempo",
      ),
      c(
        "Finish by squeezing the glutes to stand — do not lean back past vertical",
        "Termina apretando los glúteos para subir: no te eches atrás más allá de la vertical",
      ),
    ],
    mistakes: [
      c(
        "Turning it into a squat: the knees bend more and the hips stop travelling back",
        "Convertirlo en sentadilla: las rodillas se flexionan más y la cadera deja de ir atrás",
      ),
      c(
        "Rounding the back to reach lower, which replaces hip travel with spine flexion",
        "Redondear la espalda para llegar más abajo, que sustituye el recorrido de cadera por flexión espinal",
      ),
    ],
    safety: [
      c(
        "If the lower back feels it before the hamstrings do, reduce the range and reset the brace",
        "Si la lumbar lo nota antes que los isquios, reduce el recorrido y reajusta el bloqueo",
      ),
    ],
    effort: {
      rir: "2-3",
      note: c(
        "Never hinge to failure: the last rep is exactly where the brace gives out",
        "Nunca lleves la bisagra al fallo: la última repetición es justo donde cede el bloqueo",
      ),
    },
  },

  lunge: {
    techniqueLevel: 3,
    techniqueWhy: c(
      "Two legs, two jobs, one balance: the stability demand is what makes it feel harder than the load suggests",
      "Dos piernas, dos trabajos y un equilibrio: la exigencia de estabilidad es lo que lo hace sentir más duro que la carga",
    ),
    tempo: "2-1-1",
    breathing: c(
      "Inhale down, exhale as you drive up",
      "Inhala al bajar, exhala al empujar hacia arriba",
    ),
    setup: [
      c(
        "Split the feet far enough that the back knee can reach the floor",
        "Separa los pies lo suficiente para que la rodilla de atrás llegue al suelo",
      ),
      c(
        "Front foot flat, weight through the midfoot and heel",
        "Pie delantero completo, peso en el medio y el talón",
      ),
      c(
        "Torso tall from the first rep — leaning forward turns it into a squat",
        "Tronco alto desde la primera repetición: adelantarlo lo convierte en sentadilla",
      ),
    ],
    execution: [
      c(
        "Drop the back knee straight down; the front shin stays close to vertical",
        "Baja la rodilla de atrás en vertical; la espinilla delantera se queda cerca de la vertical",
      ),
      c(
        "Push the floor away through the front foot to come up",
        "Empuja el suelo con el pie delantero para subir",
      ),
      c(
        "Keep the hips level side to side, especially on the way up",
        "Mantén la cadera nivelada de lado a lado, sobre todo al subir",
      ),
    ],
    mistakes: [
      c(
        "Short steps: the front knee then travels far past the toes under load",
        "Pasos cortos: la rodilla delantera se va muy por delante de los pies con carga",
      ),
      c(
        "Twisting the pelvis to one side to cheat depth",
        "Girar la pelvis a un lado para hacer trampa en la profundidad",
      ),
    ],
    safety: [
      c(
        "Balance wobble means lighten the load, not widen the stance into something else",
        "Si te tambaleas, baja la carga en lugar de abrir la postura hasta convertirla en otra cosa",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Asymmetric work is twice the balance cost: stopping at 1-2 RIR keeps both sides honest and even",
        "El trabajo asimétrico cuesta el doble en equilibrio: parar en RIR 1-2 mantiene los dos lados honestos y parejos",
      ),
    },
  },

  hip_extension: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "The glute is easy to miss: if the lower back arches at the top, the glute stopped working",
      "El glúteo es fácil de esquivar: si la lumbar se arquea arriba, el glúteo dejó de trabajar",
    ),
    tempo: "2-2-1",
    breathing: c(
      "Exhale as the hips rise, inhale as they lower",
      "Exhala al subir la cadera, inhala al bajarla",
    ),
    setup: [
      c(
        "Ribs down and pelvis slightly tucked before the first rep",
        "Costillas abajo y pelvis ligeramente retrovertida antes de la primera repetición",
      ),
      c(
        "Feet placed so the shins end vertical at the top",
        "Pies colocados para que las espinillas terminen verticales arriba",
      ),
      c(
        "Press through the heels, not the toes",
        "Empuja con los talones, no con las puntas",
      ),
    ],
    execution: [
      c(
        "Drive the hips up until the body is one line — no higher",
        "Sube la cadera hasta que el cuerpo forme una línea, no más",
      ),
      c(
        "Squeeze the glutes for a full second at the top",
        "Aprieta los glúteos un segundo completo arriba",
      ),
      c(
        "Lower under control; the bottom is where the stretch is",
        "Baja con control: abajo es donde está el estiramiento",
      ),
    ],
    mistakes: [
      c(
        "Arching the lower back to get higher: that is spine movement, not hip extension",
        "Arquear la lumbar para subir más: eso es movimiento de columna, no extensión de cadera",
      ),
      c(
        "Pushing through the toes, which turns it into a hamstring exercise",
        "Empujar con las puntas, lo que lo convierte en un ejercicio de isquios",
      ),
    ],
    safety: [
      c(
        "Cramping hamstrings mean the glutes are not firing: reduce the range and slow the tempo",
        "Los calambres de isquios significan que el glúteo no está trabajando: reduce el recorrido y frena el tempo",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Higher reps suit the glute: RIR 1-2 for 12-20, and stop when the squeeze disappears",
        "Las repeticiones altas le sientan bien al glúteo: RIR 1-2 para 12-20, y corta cuando desaparezca el apretón",
      ),
    },
  },

  hip_abduction: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "Small range, small muscle: the difficulty is resisting the urge to add momentum",
      "Recorrido corto, músculo pequeño: la dificultad es resistir la tentación de añadir inercia",
    ),
    tempo: "1-1-2",
    breathing: c("Exhale as the leg opens", "Exhala al abrir la pierna"),
    setup: [
      c(
        "Stand or lie so the working hip can move without the pelvis rolling",
        "Colócate de pie o tumbado para que la cadera trabaje sin que la pelvis gire",
      ),
      c(
        "Keep the supporting side quiet and the toes forward",
        "Mantén el lado de apoyo quieto y los pies al frente",
      ),
      c(
        "Start from a light tension, not from slack",
        "Empieza desde una tensión ligera, no desde el vacío",
      ),
    ],
    execution: [
      c(
        "Open the leg sideways with the pelvis level — no leaning away",
        "Abre la pierna hacia el lado con la pelvis nivelada, sin inclinarte al contrario",
      ),
      c(
        "Stop where the pelvis would start to roll",
        "Detente donde la pelvis empezaría a girar",
      ),
      c(
        "Return slowly; the eccentric is where the hip learns control",
        "Vuelve despacio: la fase excéntrica es donde la cadera aprende a controlar",
      ),
    ],
    mistakes: [
      c(
        "Leaning the torso the other way to fake range",
        "Inclinar el torso al lado contrario para fingir recorrido",
      ),
      c(
        "Rushing: with this range, speed means the hip stopped working",
        "Ir con prisa: con este recorrido, la velocidad significa que la cadera dejó de trabajar",
      ),
    ],
    safety: [
      c(
        "Sharp pain on the outside of the hip is usually tendon irritation: reduce range, not weight",
        "El dolor agudo en el lateral de la cadera suele ser irritación tendinosa: reduce el recorrido, no el peso",
      ),
    ],
    effort: {
      rir: "0-1",
      note: c(
        "Glute medius is trained best with high reps and a real squeeze: RIR 0-1 at 15-25",
        "El glúteo medio entrena mejor con repeticiones altas y apretón real: RIR 0-1 a 15-25",
      ),
    },
  },

  hip_adduction: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "The adductor is strong and often forgotten: the cue is to keep it moving under control",
      "El aductor es fuerte y suele olvidarse: la clave es mantenerlo en movimiento controlado",
    ),
    tempo: "1-1-2",
    breathing: c("Exhale as the leg closes", "Exhala al cerrar la pierna"),
    setup: [
      c(
        "Start with the leg open and the pelvis level",
        "Empieza con la pierna abierta y la pelvis nivelada",
      ),
      c(
        "Brace the abdomen so the hip does the work, not the pelvis",
        "Bloquea el abdomen para que trabaje la cadera y no la pelvis",
      ),
      c(
        "Keep the knee soft but stable",
        "Mantén la rodilla algo flexionada pero estable",
      ),
    ],
    execution: [
      c(
        "Bring the leg back across the midline slowly",
        "Lleva la pierna de vuelta cruzando la línea media despacio",
      ),
      c(
        "Keep the pelvis still; only the leg moves",
        "Mantén la pelvis quieta: solo se mueve la pierna",
      ),
      c(
        "Squeeze at the end of the range for a beat",
        "Aprieta al final del recorrido durante un instante",
      ),
    ],
    mistakes: [
      c(
        "Rotating the pelvis instead of moving the leg",
        "Rotar la pelvis en lugar de mover la pierna",
      ),
      c(
        "Working only in the short, comfortable range near the middle",
        "Trabajar solo en el rango corto y cómodo del medio",
      ),
    ],
    safety: [
      c(
        "Adductors strain easily on quick direction changes: keep this slow and controlled",
        "Los aductores se lesionan fácil con cambios bruscos: mantén esto lento y controlado",
      ),
    ],
    effort: {
      rir: "0-1",
      note: c(
        "Strong muscle, high-rep tolerance: RIR 0-1 at 12-20 is where it responds",
        "Músculo fuerte y tolerante a repeticiones altas: responde con RIR 0-1 a 12-20",
      ),
    },
  },

  knee_flexion: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "The hamstring must bend the knee without the hip doing the work — that separation is the skill",
      "El isquio debe flexionar la rodilla sin que la cadera haga el trabajo: esa separación es la destreza",
    ),
    tempo: "2-1-2",
    breathing: c(
      "Exhale as the heel comes in, inhale as it goes out",
      "Exhala al acercar el talón, inhala al alejarlo",
    ),
    setup: [
      c(
        "Align the knee with the machine's pivot or the band's anchor",
        "Alinea la rodilla con el eje de la máquina o el anclaje de la banda",
      ),
      c(
        "Set the pad on the ankle, never on the Achilles",
        "Coloca la almohadilla en el tobillo, nunca en el tendón de Aquiles",
      ),
      c(
        "Grip or brace so the hips cannot add movement",
        "Agárrate o bloquéate para que la cadera no añada movimiento",
      ),
    ],
    execution: [
      c(
        "Curl the heel toward the glute as far as it goes without the hip lifting",
        "Lleva el talón hacia el glúteo todo lo posible sin que la cadera suba",
      ),
      c(
        "Feel the hamstring, not the calf — pointing the toes removes the calf",
        "Siente el isquio, no el gemelo: con los dedos estirados el gemelo sale de la ecuación",
      ),
      c(
        "Lower over two seconds; this is where hamstrings grow",
        "Baja en dos segundos: aquí es donde crecen los isquios",
      ),
    ],
    mistakes: [
      c(
        "Lifting the hips to help the weight up",
        "Levantar la cadera para ayudar a mover el peso",
      ),
      c(
        "Snapping the knee straight at the end of the set",
        "Extender la rodilla de golpe al final de la serie",
      ),
    ],
    safety: [
      c(
        "Cramping hamstrings respond to a slower tempo and a couple of deep breaths at the bottom",
        "Los calambres de isquios responden a un tempo más lento y un par de respiraciones profundas abajo",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Leave 1-2 in reserve: the hamstring is the muscle most likely to cramp at failure",
        "Deja 1-2 en reserva: el isquio es el músculo con más probabilidad de acalambrarse al fallo",
      ),
    },
  },

  knee_extension: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "The movement is tiny and the torque at the knee is high — control is everything",
      "El movimiento es mínimo y el esfuerzo en la rodilla es alto: el control lo es todo",
    ),
    tempo: "2-1-2",
    breathing: c("Exhale as the knee straightens", "Exhala al estirar la rodilla"),
    setup: [
      c(
        "Line the knee up with the machine's axis of rotation",
        "Alinea la rodilla con el eje de rotación de la máquina",
      ),
      c(
        "Pad on the lower shin, not on the foot",
        "Almohadilla en la parte baja de la espinilla, no en el pie",
      ),
      c(
        "Hip and back flat against the pad, hands on the handles",
        "Cadera y espalda planas contra el respaldo, manos en las asas",
      ),
    ],
    execution: [
      c(
        "Straighten the knee to a full, controlled lockout",
        "Estira la rodilla hasta un bloqueo completo y controlado",
      ),
      c(
        "Pause a beat at the top to keep the quad working",
        "Pausa un instante arriba para mantener el cuádriceps trabajando",
      ),
      c(
        "Come down slowly; do not let the stack drop",
        "Baja despacio: no dejes que la placa caiga",
      ),
    ],
    mistakes: [
      c(
        "Swinging the weight up with the hips and momentum",
        "Subir el peso con la cadera y la inercia",
      ),
      c(
        "Stopping short of full extension, which skips the strongest range",
        "Detenerse antes de la extensión completa, que se salta el rango más fuerte",
      ),
    ],
    safety: [
      c(
        "If the kneecap grumbles, reduce the range rather than the load, and slow the descent",
        "Si la rótula se queja, reduce el recorrido antes que la carga y frena el descenso",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Quads respond to 1-2 RIR with a pause; going to failure adds soreness, not growth",
        "El cuádriceps responde a RIR 1-2 con pausa; llegar al fallo añade agujetas, no crecimiento",
      ),
    },
  },

  plantar_flexion: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "Simple movement; the only real skill is using the full range instead of bouncing",
      "Movimiento simple; la única destreza real es usar el rango completo en vez de rebotar",
    ),
    tempo: "1-2-1",
    breathing: c("Exhale up, inhale down", "Exhala al subir, inhala al bajar"),
    setup: [
      c(
        "Ball of the foot on the step, heel hanging free",
        "Metatarso en el escalón, talón libre colgando",
      ),
      c(
        "Hold a support with one hand if balance is uncertain",
        "Agárrate con una mano si el equilibrio no es seguro",
      ),
      c(
        "Knee straight for the gastrocnemius, bent for the soleus — pick one per set",
        "Rodilla recta para el gemelo, flexionada para el sóleo: elige una por serie",
      ),
    ],
    execution: [
      c(
        "Rise as high as possible onto the toes and pause",
        "Sube lo más alto posible sobre las puntas y pausa",
      ),
      c(
        "Lower until the heel is visibly below the step",
        "Baja hasta que el talón quede claramente bajo el escalón",
      ),
      c(
        "Keep the ankle moving straight up and down, no rolling out",
        "Mantén el tobillo subiendo y bajando recto, sin irse hacia fuera",
      ),
    ],
    mistakes: [
      c(
        "Bouncing with the Achilles tendon doing the work",
        "Rebotar dejando que el tendón de Aquiles haga el trabajo",
      ),
      c(
        "Half range: the stretch at the bottom is the exercise",
        "Medio recorrido: el estiramiento de abajo es el ejercicio",
      ),
    ],
    safety: [
      c(
        "Achilles pain in the morning deserves a deload, not a stretch",
        "El dolor de Aquiles por la mañana pide descarga, no estirar",
      ),
    ],
    effort: {
      rir: "0-2",
      note: c(
        "Calves need high reps and full range: RIR 0-2 at 12-20 beats heavy partials",
        "Los gemelos necesitan repeticiones altas y rango completo: RIR 0-2 a 12-20 gana a las parciales pesadas",
      ),
    },
  },

  tibialis: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "A tiny muscle with a short range: it is trained for resilience, not for size",
      "Un músculo pequeño con recorrido corto: se entrena por resiliencia, no por tamaño",
    ),
    tempo: "2-1-2",
    breathing: c("Exhale as the toes lift", "Exhala al levantar los dedos"),
    setup: [
      c(
        "Heel planted, toes free to move, body weight over the midfoot",
        "Talón apoyado, dedos libres para moverse, peso en el medio del pie",
      ),
      c(
        "Anchor the band or the weight over the forefoot, not the toes",
        "Ancla la banda o el peso sobre el metatarso, no sobre los dedos",
      ),
      c(
        "Keep the knee still; the ankle does all the work",
        "Mantén la rodilla quieta: el tobillo hace todo el trabajo",
      ),
    ],
    execution: [
      c(
        "Pull the toes up and in toward the shin as far as they go",
        "Lleva los dedos hacia arriba y hacia la espinilla todo lo posible",
      ),
      c(
        "Pause a second at the top",
        "Pausa un segundo arriba",
      ),
      c(
        "Lower slowly and completely before the next rep",
        "Baja despacio y del todo antes de la siguiente repetición",
      ),
    ],
    mistakes: [
      c(
        "Using the whole leg to lift the toes",
        "Usar toda la pierna para levantar los dedos",
      ),
      c(
        "Skipping it because it looks trivial — it is the cheapest shin-splint insurance there is",
        "Saltárselo porque parece trivial: es el seguro más barato contra la periostitis",
      ),
    ],
    safety: [
      c(
        "Sharp pain along the shin bone is a stress reaction, not a training cue: stop and rest",
        "El dolor agudo a lo largo de la tibia es una reacción de estrés, no una señal de entrenamiento: para y descansa",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "High reps, low load, no failure: this is prehab, not a strength lift",
        "Muchas repeticiones, poca carga y nada de fallo: esto es prevención, no un levantamiento de fuerza",
      ),
    },
  },

  elbow_flexion: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "Mechanically simple; the risk is doing it with the shoulders and hips instead of the elbow",
      "Mecánicamente simple; el riesgo es hacerlo con hombros y cadera en lugar del codo",
    ),
    tempo: "2-1-3",
    breathing: c("Exhale as you curl up", "Exhala al subir"),
    setup: [
      c(
        "Elbows pinned to the sides, shoulder blades back",
        "Codos pegados a los costados, escápulas atrás",
      ),
      c(
        "Start every rep from a full elbow extension",
        "Empieza cada repetición con el codo completamente extendido",
      ),
      c(
        "Wrists neutral — a bent wrist loads the elbow tendons",
        "Muñecas neutras: una muñeca doblada carga los tendones del codo",
      ),
    ],
    execution: [
      c(
        "Curl with the elbow only; the upper arm does not move",
        "Sube solo con el codo: el brazo no se mueve",
      ),
      c(
        "Squeeze at the top, then lower over three seconds",
        "Aprieta arriba y baja en tres segundos",
      ),
      c(
        "Supinate slightly at the top for the short head if it does not hurt",
        "Supina algo arriba para la cabeza corta si no duele",
      ),
    ],
    mistakes: [
      c(
        "Swinging the torso to start the rep",
        "Balancear el torso para arrancar la repetición",
      ),
      c(
        "Elbows drifting forward, which hands the work to the front delt",
        "Codos que se van adelante, lo que pasa el trabajo al deltoides anterior",
      ),
    ],
    safety: [
      c(
        "Elbow tendon pain: switch to neutral grip and higher reps for two weeks",
        "Dolor en el tendón del codo: cambia a agarre neutro y más repeticiones durante dos semanas",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Biceps take failure well, tendons do not: RIR 1-2 keeps the stimulus without the ache",
        "El bíceps tolera el fallo, los tendones no: RIR 1-2 da el estímulo sin el dolor",
      ),
    },
  },

  elbow_extension: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "The shoulder must stay quiet while the elbow moves — that isolation is the whole exercise",
      "El hombro debe quedarse quieto mientras el codo se mueve: ese aislamiento es todo el ejercicio",
    ),
    tempo: "2-1-2",
    breathing: c(
      "Exhale as the elbow straightens, inhale as it bends",
      "Exhala al estirar el codo, inhala al flexionarlo",
    ),
    setup: [
      c(
        "Upper arm fixed alongside the head or the torso, whichever the variant calls for",
        "Brazo fijo junto a la cabeza o al torso, según pida la variante",
      ),
      c(
        "Elbows pointing forward, not flared out",
        "Codos apuntando al frente, no abiertos",
      ),
      c(
        "Grip relaxed; a death grip moves the work to the wrist",
        "Agarre relajado: un agarre de muerte pasa el trabajo a la muñeca",
      ),
    ],
    execution: [
      c(
        "Straighten the elbow to a full lockout without moving the shoulder",
        "Estira el codo hasta el bloqueo completo sin mover el hombro",
      ),
      c(
        "Keep the wrist straight and the pinky slightly higher",
        "Mantén la muñeca recta y el meñique algo más alto",
      ),
      c(
        "Return until the elbow is fully bent and the triceps is stretched",
        "Vuelve hasta que el codo esté totalmente flexionado y el tríceps estirado",
      ),
    ],
    mistakes: [
      c(
        "Letting the elbows drift outward, which turns it into a press",
        "Dejar que los codos se abran, lo que lo convierte en un press",
      ),
      c(
        "Cutting the stretch at the bottom of each rep",
        "Recortar el estiramiento al final de cada repetición",
      ),
    ],
    safety: [
      c(
        "If the elbow hurts near the bony point, lower the weight and slow the descent",
        "Si duele el codo cerca del hueso, baja el peso y frena el descenso",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Triceps are a big muscle group: RIR 1-2 across sets works, and the overhead variants need it most",
        "El tríceps es un grupo grande: RIR 1-2 en las series funciona, y las variantes por encima de la cabeza son las que más lo necesitan",
      ),
    },
  },

  forearm_flexion: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "Tiny range, easy movement — the discipline is using the full range without letting the elbow lift",
      "Recorrido mínimo y movimiento fácil: la disciplina es usar todo el rango sin que el codo suba",
    ),
    tempo: "2-1-2",
    breathing: c("Exhale as the wrist curls", "Exhala al flexionar la muñeca"),
    setup: [
      c(
        "Forearm supported on the thigh or bench, wrist hanging past the edge",
        "Antebrazo apoyado en el muslo o el banco, muñeca fuera del borde",
      ),
      c(
        "Elbow still for the whole set",
        "Codo quieto toda la serie",
      ),
      c(
        "Grip firm but not crushing",
        "Agarre firme pero sin aplastar",
      ),
    ],
    execution: [
      c(
        "Curl the wrist up through its full range and hold a beat",
        "Sube la muñeca por todo su rango y aguanta un instante",
      ),
      c(
        "Let the wrist drop all the way down on the return — that is the growth range",
        "Deja que la muñeca baje del todo al volver: ese es el rango de crecimiento",
      ),
      c(
        "Keep the fingers wrapped; opening them turns it into a grip stunt",
        "Mantén los dedos cerrados: abrirlos lo convierte en un truco de agarre",
      ),
    ],
    mistakes: [
      c(
        "Lifting the elbow to help the weight up",
        "Levantar el codo para ayudar a subir el peso",
      ),
      c(
        "Going too heavy: the wrists cannot be loaded like the elbow flexors",
        "Poner demasiado peso: las muñecas no soportan la carga de los flexores del codo",
      ),
    ],
    safety: [
      c(
        "Wrist pain is a signal to reduce load, not to wrap it tighter",
        "El dolor de muñeca pide reducir carga, no vendar más fuerte",
      ),
    ],
    effort: {
      rir: "0-2",
      note: c(
        "Forearms want high reps: RIR 0-2 at 15-25 with a full range",
        "Los antebrazos piden repeticiones altas: RIR 0-2 a 15-25 con rango completo",
      ),
    },
  },

  forearm_extension: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "The weak side of the forearm: it is trained for tendon health more than for size",
      "El lado débil del antebrazo: se entrena por salud tendinosa más que por tamaño",
    ),
    tempo: "2-1-2",
    breathing: c("Exhale as the wrist rises", "Exhala al subir la muñeca"),
    setup: [
      c(
        "Forearm supported, palm down, wrist past the edge of the surface",
        "Antebrazo apoyado, palma hacia abajo, muñeca fuera del borde",
      ),
      c(
        "Very light load: this is the smallest muscle in the set",
        "Carga muy ligera: es el músculo más pequeño de la serie",
      ),
      c(
        "Elbow and shoulder still",
        "Codo y hombro quietos",
      ),
    ],
    execution: [
      c(
        "Raise the back of the hand as high as it goes and hold",
        "Sube el dorso de la mano todo lo posible y aguanta",
      ),
      c(
        "Lower slowly and let the wrist drop below the surface line",
        "Baja despacio y deja que la muñeca pase por debajo de la línea de apoyo",
      ),
      c(
        "Keep the fingers relaxed",
        "Mantén los dedos relajados",
      ),
    ],
    mistakes: [
      c(
        "Loading it like a wrist curl — the extensors are roughly half as strong",
        "Cargarlo como un curl de muñeca: los extensores son casi la mitad de fuertes",
      ),
      c(
        "Skipping it entirely, which is why elbows hurt in the first place",
        "Saltárselo del todo, que es la razón por la que duelen los codos",
      ),
    ],
    safety: [
      c(
        "Tennis elbow responds to this more than to anything else: high reps, no pain",
        "El codo de tenista responde a esto más que a ninguna otra cosa: muchas repeticiones, sin dolor",
      ),
    ],
    effort: {
      rir: "2-3",
      note: c(
        "Never to failure: the goal is blood flow and tendon resilience",
        "Nunca al fallo: el objetivo es riego sanguíneo y resiliencia tendinosa",
      ),
    },
  },

  core_flexion: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "The abs have to curl the pelvis, and most people only bend the hips",
      "El abdomen debe enrollar la pelvis, y la mayoría solo flexiona la cadera",
    ),
    tempo: "2-1-2",
    breathing: c(
      "Exhale hard as the ribs come toward the pelvis",
      "Exhala con fuerza mientras las costillas se acercan a la pelvis",
    ),
    setup: [
      c(
        "Start with the lower back flat and the ribs pulled down",
        "Empieza con la lumbar plana y las costillas abajo",
      ),
      c(
        "Hands supporting the head if the neck gets involved, never pulling it",
        "Manos apoyando la cabeza si el cuello entra, nunca tirando de él",
      ),
      c(
        "Legs set so the pelvis can actually move",
        "Piernas colocadas para que la pelvis pueda moverse de verdad",
      ),
    ],
    execution: [
      c(
        "Curl the pelvis toward the ribs — think of shortening the waist, not lifting the legs",
        "Enrolla la pelvis hacia las costillas: piensa en acortar la cintura, no en levantar las piernas",
      ),
      c(
        "Exhale fully at the top; the abs finish the movement",
        "Exhala del todo arriba: el abdomen termina el movimiento",
      ),
      c(
        "Lower slowly without letting the lower back arch into the surface",
        "Baja despacio sin dejar que la lumbar se arquee contra la superficie",
      ),
    ],
    mistakes: [
      c(
        "Turning it into a hip-flexor exercise by only moving the legs",
        "Convertirlo en un ejercicio de flexores de cadera moviendo solo las piernas",
      ),
      c(
        "Pulling the head with the hands and straining the neck",
        "Tirar de la cabeza con las manos y forzar el cuello",
      ),
    ],
    safety: [
      c(
        "If the lower back hurts, the movement is too heavy or too fast for today — regress, do not push",
        "Si duele la lumbar, el movimiento es demasiado pesado o rápido para hoy: regresa, no insistas",
      ),
    ],
    effort: {
      rir: "0-1",
      note: c(
        "Abs are trained with control, not with reps: RIR 0-1 while the pelvis still curls cleanly",
        "El abdomen se entrena con control, no con repeticiones: RIR 0-1 mientras la pelvis se enrolle limpia",
      ),
    },
  },

  core_anti_extension: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "Nothing moves, and that is the difficulty: the skill is resisting, not creating, motion",
      "Nada se mueve, y esa es la dificultad: la destreza es resistir el movimiento, no crearlo",
    ),
    tempo: "hold 20-60 s",
    breathing: c(
      "Short, quiet breaths into the ribs; do not lose the brace to breathe",
      "Respiraciones cortas y silenciosas hacia las costillas; no pierdas el bloqueo al respirar",
    ),
    setup: [
      c(
        "Ribs down, glutes tight, pelvis slightly tucked",
        "Costillas abajo, glúteos firmes, pelvis algo retrovertida",
      ),
      c(
        "Elbows under the shoulders (or forearms flat), hands relaxed",
        "Codos bajo los hombros (o antebrazos planos), manos relajadas",
      ),
      c(
        "One line from heels to head before the clock starts",
        "Una sola línea de talones a cabeza antes de arrancar el reloj",
      ),
    ],
    execution: [
      c(
        "Push the floor away and squeeze the glutes to stay in line",
        "Empuja el suelo y aprieta los glúteos para mantener la línea",
      ),
      c(
        "Hold the position until the hips start to sag — that rep is over",
        "Aguanta hasta que la cadera empiece a caer: esa repetición terminó",
      ),
      c(
        "Rest fully between holds; quality is the whole point",
        "Descansa del todo entre isométricos: la calidad es todo",
      ),
    ],
    mistakes: [
      c(
        "Hips sagging or piking when fatigue arrives, which trains the wrong thing",
        "Cadera que cae o se eleva al llegar la fatiga, lo que entrena lo contrario",
      ),
      c(
        "Holding your breath until you go blue",
        "Aguantar la respiración hasta ponerte morado",
      ),
    ],
    safety: [
      c(
        "If the lower back takes the hold instead of the abdomen, shorten the lever (knees down)",
        "Si la lumbar se lleva el isométrico en vez del abdomen, acorta la palanca (rodillas al suelo)",
      ),
    ],
    effort: {
      rir: "n/a (isometric)",
      note: c(
        "Isometrics are scored by time quality: stop the set when the line breaks, not at a number",
        "Los isométricos se miden por calidad de tiempo: corta cuando se rompa la línea, no en un número",
      ),
    },
  },

  core_anti_lateral: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "Resisting sideways bending is a different skill from resisting extension, and both are needed",
      "Resistir la flexión lateral es una destreza distinta a resistir la extensión, y hacen falta las dos",
    ),
    tempo: "1-2-1",
    breathing: c("Exhale as you press out", "Exhala al empujar hacia fuera"),
    setup: [
      c(
        "Stand side-on to the anchor with the feet shoulder-width",
        "Colócate de lado al anclaje con los pies a la anchura de los hombros",
      ),
      c(
        "Hands together at the sternum, elbows tucked",
        "Manos juntas al esternón, codos cerrados",
      ),
      c(
        "Ribs down and hips level before the press",
        "Costillas abajo y cadera nivelada antes de empujar",
      ),
    ],
    execution: [
      c(
        "Press straight out and refuse to rotate: the band pulls, you do not follow",
        "Empuja al frente y niégate a rotar: la banda tira, tú no la sigues",
      ),
      c(
        "Hold two seconds at full extension, still square to the front",
        "Aguanta dos segundos en extensión completa, todavía de frente",
      ),
      c(
        "Return slowly and under tension",
        "Vuelve despacio y con tensión",
      ),
    ],
    mistakes: [
      c(
        "Letting the torso twist toward the anchor",
        "Dejar que el torso gire hacia el anclaje",
      ),
      c(
        "Using a load so heavy that the shoulders shrug",
        "Usar una carga tan pesada que los hombros se encogen",
      ),
    ],
    safety: [
      c(
        "If the lower back arches while pressing, the load is over what the core can hold",
        "Si la lumbar se arquea al empujar, la carga supera lo que el core puede sostener",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Duration beats load: longer holds at RIR 1-2 teach control better than heavier bands",
        "La duración gana a la carga: isométricos más largos con RIR 1-2 enseñan más control que bandas más duras",
      ),
    },
  },

  core_rotation: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "Rotation comes from the ribcage, not the arms — swinging the arms is the standard cheat",
      "La rotación sale de la caja torácica, no de los brazos: balancearlos es la trampa habitual",
    ),
    tempo: "2-0-2",
    breathing: c(
      "Exhale as you rotate, inhale returning to centre",
      "Exhala al rotar, inhala al volver al centro",
    ),
    setup: [
      c(
        "Sit or stand tall with the pelvis stable",
        "Siéntate o ponte alto con la pelvis estable",
      ),
      c(
        "Hands together or holding one weight, arms relaxed",
        "Manos juntas o con un peso, brazos relajados",
      ),
      c(
        "Start from the centre, not from a twist",
        "Empieza desde el centro, no desde un giro",
      ),
    ],
    execution: [
      c(
        "Turn the ribs, letting the arms follow — they are cargo, not the engine",
        "Gira las costillas y deja que los brazos sigan: son carga, no el motor",
      ),
      c(
        "Keep the pelvis facing forward; only the ribcage turns",
        "Mantén la pelvis al frente: solo gira la caja torácica",
      ),
      c(
        "Control the return; do not let momentum bring you back",
        "Controla la vuelta: no dejes que la inercia te devuelva",
      ),
    ],
    mistakes: [
      c(
        "Swinging the weight from side to side at speed",
        "Balancear el peso de lado a lado con velocidad",
      ),
      c(
        "Ron the lower back instead of the obliques",
        "Rotar desde la lumbar en lugar de los oblicuos",
      ),
    ],
    safety: [
      c(
        "Loaded twisting under fatigue is a disc risk: fast and light is the only way it belongs in a session",
        "Girar con carga bajo fatiga es riesgo discal: rápido y ligero es la única forma de que entre en una sesión",
      ),
    ],
    effort: {
      rir: "1-2",
      note: c(
        "Slow and controlled at RIR 1-2; speed is what turns rotation into an injury story",
        "Lento y controlado con RIR 1-2: la velocidad es lo que convierte la rotación en una lesión",
      ),
    },
  },

  carry: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "Walking under load punishes everything at once: grip, ribs, hips and feet must all stay stacked",
      "Caminar con carga castiga todo a la vez: agarre, costillas, cadera y pies deben mantenerse apilados",
    ),
    tempo: "walk 30-60 s",
    breathing: c(
      "Breathe short and steady; the brace never disappears",
      "Respira corto y constante: el bloqueo nunca desaparece",
    ),
    setup: [
      c(
        "Stand tall, ribs down, shoulders set back and down",
        "Ponte alto, costillas abajo, hombros atrás y abajo",
      ),
      c(
        "Grip the load and take the slack out before the first step",
        "Agarra la carga y quita la holgura antes del primer paso",
      ),
      c(
        "Feet shoulder-width, weight over the midfoot",
        "Pies a la anchura de los hombros, peso en el medio del pie",
      ),
    ],
    execution: [
      c(
        "Walk with short, quiet steps — no bouncing, no leaning",
        "Camina con pasos cortos y silenciosos: sin rebotar, sin inclinarte",
      ),
      c(
        "Keep the shoulders level; a dropped shoulder means the load won",
        "Mantén los hombros nivelados: un hombro caído significa que la carga ganó",
      ),
      c(
        "Put the weight down deliberately, with a hinge, not a drop",
        "Deja el peso con intención, haciendo bisagra, no soltándolo",
      ),
    ],
    mistakes: [
      c(
        "Leaning back to counterbalance a heavy load",
        "Echarte atrás para contrapesar una carga pesada",
      ),
      c(
        "Long strides that turn walking into falling",
        "Zancadas largas que convierten caminar en caerse",
      ),
    ],
    safety: [
      c(
        "If grip fails before the distance is over, that is the exercise ending — put it down, do not chase it",
        "Si el agarre falla antes de terminar la distancia, el ejercicio terminó: suelta, no lo persigas",
      ),
    ],
    effort: {
      rir: "n/a (distance or time)",
      note: c(
        "Carries are scored by distance or time, not reps: stop when posture breaks, not when muscles burn",
        "Los acarreos se miden por distancia o tiempo, no por repeticiones: corta cuando se rompa la postura",
      ),
    },
  },

  cardio_steady: {
    techniqueLevel: 1,
    techniqueWhy: c(
      "Nothing technical: the whole skill is staying at a pace you could hold a conversation at",
      "Nada técnico: toda la destreza es mantener un ritmo al que podrías conversar",
    ),
    tempo: "20-45 min continuous",
    breathing: c(
      "Nasal breathing if you can manage it; it self-limits the intensity",
      "Respiración nasal si puedes: limita la intensidad por sí sola",
    ),
    setup: [
      c(
        "Pick a modality you can repeat without joint complaint (bike, stairs, brisk walk)",
        "Elige una modalidad repetible sin queja articular (bici, escaleras, caminata rápida)",
      ),
      c(
        "Set a target time before starting, not a target distance",
        "Fija un tiempo objetivo antes de empezar, no una distancia",
      ),
      c(
        "Start the first five minutes deliberately easy",
        "Empieza los primeros cinco minutos deliberadamente suave",
      ),
    ],
    execution: [
      c(
        "Stay at a pace where you could speak a full sentence",
        "Mantén un ritmo al que puedas decir una frase completa",
      ),
      c(
        "Keep the posture tall; slumping ends the session early",
        "Mantén la postura alta: desplomarse termina la sesión antes de tiempo",
      ),
      c(
        "Finish able to do it again tomorrow — that is the entire point",
        "Termina con la capacidad de repetirlo mañana: ese es todo el objetivo",
      ),
    ],
    mistakes: [
      c(
        "Turning base work into a race and stealing from the lifting days",
        "Convertir el trabajo base en una carrera y robarle energía a los días de pesas",
      ),
      c(
        "Skipping it because it feels too easy to count",
        "Saltárselo porque parece demasiado fácil para contar",
      ),
    ],
    safety: [
      c(
        "Chest tightness or dizziness means stop, not push through",
        "Opresión en el pecho o mareo significan parar, no seguir",
      ),
    ],
    effort: {
      rir: "n/a (pace)",
      note: c(
        "Effort is measured in breathing, not RIR: zone 2 is the pace you can hold for an hour",
        "El esfuerzo se mide en respiración, no en RIR: la zona 2 es el ritmo que aguantas una hora",
      ),
    },
  },

  cardio_interval: {
    techniqueLevel: 2,
    techniqueWhy: c(
      "Short, hard efforts require pacing discipline: going all-out in round one ruins rounds four to eight",
      "Los esfuerzos cortos y duros exigen disciplina de ritmo: salir a tope en la primera ronda arruina de la cuarta a la octava",
    ),
    tempo: "20-40 s hard, 60-120 s easy",
    breathing: c(
      "Hard efforts are mouth-breathed; recoveries must bring it back under control",
      "Los esfuerzos duros se respiran por la boca; las recuperaciones deben devolver el control",
    ),
    setup: [
      c(
        "Decide the number of rounds before you start and stick to it",
        "Decide el número de rondas antes de empezar y respétalo",
      ),
      c(
        "Warm up for five minutes, with one short effort to open up",
        "Calienta cinco minutos, con un esfuerzo corto para abrir",
      ),
      c(
        "Choose an interval length you can repeat with the same output",
        "Elige una duración de intervalo que puedas repetir con la misma potencia",
      ),
    ],
    execution: [
      c(
        "Aim for repeatable, not maximal: the last round should look like the first",
        "Busca repeticiones iguales, no máximos: la última ronda debe parecerse a la primera",
      ),
      c(
        "Recover until breathing is back under control, not until the clock says so",
        "Recupera hasta que la respiración vuelva a estar controlada, no hasta que lo diga el reloj",
      ),
      c(
        "Stop the session if output collapses — one bad round is a signal",
        "Corta la sesión si la potencia se derrumba: una ronda mala es una señal",
      ),
    ],
    mistakes: [
      c(
        "Doing intervals before lifting on the same day",
        "Hacer intervalos antes de levantar el mismo día",
      ),
      c(
        "Treating every session as a test",
        "Tratar cada sesión como un examen",
      ),
    ],
    safety: [
      c(
        "Never start intervals cold: the first effort on unprepared tissue is where strains happen",
        "Nunca empieces intervalos en frío: el primer esfuerzo sobre tejido sin preparar es donde ocurren las distensiones",
      ),
    ],
    effort: {
      rir: "n/a (intervals)",
      note: c(
        "Scored by repeatability: the last interval should match the first within a few seconds",
        "Se mide por repetibilidad: el último intervalo debe parecerse al primero con pocos segundos de diferencia",
      ),
    },
  },
};

/**
 * Exercise-specific additions on top of the pattern's coaching.
 *
 * Kept deliberately small: only what would be wrong or useless to say about the
 * whole pattern belongs here ("feet on a chair raises the shoulders: that is the
 * whole point of the decline push-up").
 */
export interface TechniqueOverride {
  setup?: Cue[];
  execution?: Cue[];
  mistakes?: Cue[];
  safety?: Cue[];
  tempo?: string;
}

export const TECHNIQUE_OVERRIDES: Record<string, TechniqueOverride> = {
  "pull-ups": {
    setup: [
      c(
        "Full hang with the shoulders set — not a dead hang",
        "Colgado completo con los hombros activos, no un colgado muerto",
      ),
    ],
    execution: [
      c(
        "Chest to bar, chin over it: the head does not pull itself up",
        "Pecho a la barra y mentón por encima: la cabeza no se sube sola",
      ),
    ],
    mistakes: [
      c(
        "A partial range that never reaches the bottom is a rep you did not earn",
        "Un rango parcial que nunca llega abajo es una repetición que no te ganaste",
      ),
    ],
  },
  "assisted-pull-up": {
    setup: [
      c(
        "Lightest band that lets you complete the reps: too much help trains nothing",
        "La banda más ligera que te permita completar las repeticiones: demasiada ayuda no entrena nada",
      ),
    ],
    execution: [
      c(
        "Pull as if the band were not there, and descend slower than it lifts you",
        "Tira como si la banda no estuviera, y baja más despacio de lo que ella te sube",
      ),
    ],
  },
  "barbell-squat": {
    setup: [
      c(
        "Bar on the upper back (not the neck), hands just outside the shoulders",
        "Barra en la espalda alta (no en el cuello), manos justo fuera de los hombros",
      ),
    ],
    execution: [
      c(
        "Stand up by pushing the floor away; the bar stays over the midfoot throughout",
        "Sube empujando el suelo lejos: la barra se mantiene sobre el mediopié todo el tiempo",
      ),
    ],
    mistakes: [
      c(
        "Standing up with the hips first, which turns the lift into a good morning",
        "Subir primero la cadera, que convierte el levantamiento en un buenos días",
      ),
    ],
  },
  "barbell-bench-press": {
    setup: [
      c(
        "Eyes under the bar, feet planted, shoulder blades pulled into the bench",
        "Ojos bajo la barra, pies apoyados, escápulas clavadas en el banco",
      ),
    ],
    execution: [
      c(
        "Bar touches the chest at the nipple line and goes back over the shoulders",
        "La barra toca el pecho a la altura del pezón y vuelve sobre los hombros",
      ),
    ],
    mistakes: [
      c(
        "Bouncing off the ribcage to get the rep moving",
        "Rebotar en las costillas para arrancar la repetición",
      ),
    ],
  },
  deadlift: {
    setup: [
      c(
        "Bar over the midfoot, shins close, hips where they need to be to keep the arms vertical",
        "Barra sobre el mediopié, espinillas cerca, cadera donde haga falta para que los brazos queden verticales",
      ),
    ],
    execution: [
      c(
        "Push the floor away and stand up in one line — do not lean back at the top",
        "Empuja el suelo y sube en una sola línea: no te eches atrás arriba",
      ),
    ],
  },
  "romanian-deadlift": {
    execution: [
      c(
        "Stop the descent at the point where the hamstrings are done, not where the back rounds",
        "Corta el descenso donde los isquios terminan, no donde la espalda se redondea",
      ),
    ],
  },
  "overhead-press": {
    mistakes: [
      c(
        "Pushing the head through happens *after* the bar passes, not before",
        "Pasar la cabeza ocurre *después* de que pase la barra, no antes",
      ),
    ],
  },
  "bulgarian-split-squat": {
    setup: [
      c(
        "Rear foot on the bench with the laces down; front foot far enough forward to reach depth",
        "Pie trasero en el banco con los cordones hacia abajo; pie delantero lo bastante adelante para llegar a fondo",
      ),
    ],
  },
  "glute-bridge": {
    execution: [
      c(
        "Push the heels down and pull them slightly toward you at the same time",
        "Empuja los talones hacia abajo y llévalos algo hacia ti a la vez",
      ),
    ],
  },
  plank: {
    mistakes: [
      c(
        "Chasing time after the line breaks: a longer bad hold is worse than a short good one",
        "Perseguir tiempo después de que se rompa la línea: un isométrico largo y malo es peor que uno corto y bueno",
      ),
    ],
  },
  dips: {
    setup: [
      c(
        "Elbows tucked at roughly 45°, shoulders pulled down before the descent",
        "Codos cerrados a unos 45°, hombros bajados antes de descender",
      ),
    ],
    safety: [
      c(
        "If the front of the shoulder hurts at the bottom, shorten the range before adding load",
        "Si duele la parte frontal del hombro abajo, acorta el recorrido antes de añadir carga",
      ),
    ],
  },
  "sissy-squat": {
    tempo: "3-1-1",
    execution: [
      c(
        "Knees travel forward over the toes while the hips stay pushed high; the thigh, not the hip, is what folds",
        "Las rodillas viajan al frente por encima de los pies mientras la cadera se mantiene arriba; lo que se pliega es el muslo, no la cadera",
      ),
    ],
    mistakes: [
      c(
        "Breaking at the hips to go deeper: that hands the stretch to the hip flexors and unloads the quad",
        "Romper en la cadera para bajar más: eso le pasa el estiramiento a los flexores de cadera y descarga el cuádriceps",
      ),
    ],
    safety: [
      c(
        "Never loaded heavy, never on a cold knee, and never on a day the tendon already hurt",
        "Nunca con carga pesada, nunca con la rodilla en frío y nunca en un día en el que el tendón ya dolía",
      ),
    ],
  },
};

/** Everything the UI (and the local LLM) needs to teach one exercise. */
export interface ExerciseTechnique extends PatternTechnique {
  exerciseId: string;
  name: Cue;
  pattern: MovementPattern;
  demo: PatternDemo;
  /** Catalog difficulty = technical difficulty, 1–5. Kept next to the pattern's. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  hypertrophy: 1 | 2 | 3 | 4 | 5;
  equipment: Cue;
  unilateral: boolean;
  jointStress: 1 | 2 | 3;
  spineLoad: 1 | 2 | 3;
  progression: ProgressionAxis[];
  /** True when this exercise carries variant-specific cues on top of the pattern. */
  hasVariantCues: boolean;
}

/**
 * Resolve the technique for one exercise: pattern coaching + variant cues.
 * Returns `null` for an unknown id (same forward-compatible contract as
 * `getExerciseById`), so a stale export can never crash the screen.
 */
export function getExerciseTechnique(
  exerciseId: string,
): ExerciseTechnique | null {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return null;
  const traits = EXERCISE_TRAITS[exerciseId];
  if (!traits) return null;
  const base = PATTERN_TECHNIQUE[traits.pattern];
  const override = TECHNIQUE_OVERRIDES[exerciseId];
  return {
    ...base,
    tempo: override?.tempo ?? base.tempo,
    setup: [...base.setup, ...(override?.setup ?? [])],
    execution: [...base.execution, ...(override?.execution ?? [])],
    mistakes: [...base.mistakes, ...(override?.mistakes ?? [])],
    safety: [...base.safety, ...(override?.safety ?? [])],
    exerciseId,
    name: exercise.name,
    pattern: traits.pattern,
    demo: PATTERN_DEMOS[traits.pattern],
    difficulty: exercise.difficulty,
    hypertrophy: exercise.hypertrophy,
    equipment: exercise.equipment,
    unilateral: traits.unilateral,
    jointStress: traits.jointStress,
    spineLoad: traits.spineLoad,
    progression: traits.progression,
    hasVariantCues: override !== undefined,
  };
}

/** Technique level in words, for the badge next to the number. */
export function techniqueLevelLabel(
  level: 1 | 2 | 3 | 4 | 5,
  lang: "en" | "es",
): string {
  const labels = {
    en: ["", "Very easy", "Easy", "Moderate", "Demanding", "Expert"],
    es: ["", "Muy fácil", "Fácil", "Moderada", "Exigente", "Experta"],
  };
  return labels[lang][level];
}

/** Joint-stress label, so "3" on screen is never a mystery. */
export function jointStressLabel(
  level: 1 | 2 | 3,
  lang: "en" | "es",
): string {
  const labels = {
    en: ["", "Gentle on the joint", "Moderate joint load", "High joint load"],
    es: ["", "Amable con la articulación", "Carga articular media", "Carga articular alta"],
  };
  return labels[lang][level];
}
