/**
 * TrainingLab i18n — minimal EN/ES dictionary (same convention as BodyLab).
 *
 * UI copy is Spanish-first (the owner's language) with a full English mirror.
 *
 * @module lib/i18n
 */

let current: "en" | "es" = "es";

export function setLanguage(lang: "en" | "es"): void {
  current = lang;
}

export function getLanguage(): "en" | "es" {
  return current;
}

const DICT: Record<string, { en: string; es: string }> = {
  "app.title": { en: "TrainingLab", es: "TrainingLab" },
  "app.tagline": {
    en: "Log today. Plan from your body.",
    es: "Registra hoy. Planifica desde tu cuerpo.",
  },
  "today.source": { en: "Source", es: "Fuente" },
  "today.noSource": {
    en: "No BodyLab import",
    es: "Sin importación de BodyLab",
  },
  "lang.toggle": { en: "ES", es: "EN" },
  "settings.menu": {
    en: "Settings & connections",
    es: "Ajustes y conexiones",
  },
  "settings.menuHint": {
    en: "Coach, BodyLab data, household history and phone — all optional.",
    es: "Coach, datos de BodyLab, historial de casa y móvil — todo opcional.",
  },
  "settings.lanSwitch": { en: "Household network", es: "Red de casa" },
  "settings.lanSwitchHint": {
    en: "Sync sets with the shared history over Wi-Fi, on/off, right now",
    es: "Sincroniza series con el historial compartido por Wi-Fi, sí/no, al instante",
  },
  "settings.lanOff": { en: "Off", es: "Apagado" },
  "settings.lanOn": { en: "On", es: "Encendido" },

  // ── Week (horizontalised plan) ───────────────────────────────────────
  "week.hintCollapsed": {
    en: "How the volume is spread across the week.",
    es: "Cómo se reparte el volumen en la semana.",
  },
  "week.title": { en: "This week", es: "Esta semana" },
  "week.hint": {
    en: "Volume spread across {n} days — weakest muscles first, 48 h between hits.",
    es: "Volumen repartido en {n} días — débiles primero, 48 h entre golpes.",
  },
  "week.rest": { en: "Rest", es: "Descanso" },
  "week.today": { en: "Today", es: "Hoy" },
  "week.sets": { en: "{n} sets", es: "{n} series" },
  "week.families": { en: "Families", es: "Familias" },
  "week.regenerate": {
    en: "Regenerate week",
    es: "Regenerar semana",
  },
  "week.summary": {
    en: "{sets} sets · {min} min/week",
    es: "{sets} series · {min} min/semana",
  },
  "week.uncovered": {
    en: "Not scheduled: {fams}",
    es: "Sin programar: {fams}",
  },

  // ── ZEN session ──────────────────────────────────────────────────────
  "zen.title": { en: "ZEN session", es: "Sesión ZEN" },
  "zen.progress": {
    en: "{done} / {total} working sets",
    es: "{done} / {total} series de trabajo",
  },
  "zen.exit": { en: "Exit ZEN", es: "Salir de ZEN" },
  "zen.setOf": {
    en: "Set {done} of {total}",
    es: "Serie {done} de {total}",
  },
  "zen.warmup": { en: "Warm-up", es: "Calentamiento" },
  "zen.emptyBar": {
    en: "Empty bar",
    es: "Barra vacía",
  },
  "zen.mobilityLine": {
    en: "Mobility",
    es: "Movilidad",
  },
  "zen.warmupReps": {
    en: "{reps} reps · {w} {unit}",
    es: "{reps} reps · {w} {unit}",
  },
  "zen.doneWarmup": {
    en: "Warm-up done",
    es: "Calentamiento hecho",
  },
  "zen.logSet": { en: "Log set", es: "Registrar serie" },
  // The page's own label for the button that opens the guide
  // (`mockup/03-sesion.html` line 51), not the old "How to do it" wording.
  "zen.guide": { en: "Technique", es: "Técnica" },
  "zen.log": { en: "Set log", es: "Registro de series" },
  // Session stage, ported from the owner's mockup `03-sesion.html` (2026-10-11):
  // the log lives below the stage, and what comes next is a list you can jump to.
  "zen.logToday": { en: "Today's log", es: "Registro de hoy" },
  "zen.after": { en: "After this set", es: "Después de esta serie" },
  // The sequence is the user's to change (2026-10-11): drag the grip or use the
  // arrows, and the order survives the re-plan and the restart.
  "zen.orderHint": {
    en: "Tap to jump · drag to reorder",
    es: "Toca para ir · arrastra para ordenar",
  },
  "zen.dragHint": { en: "Drag to reorder", es: "Arrastra para ordenar" },
  "zen.moveUp": { en: "Move up", es: "Subir" },
  "zen.moveDown": { en: "Move down", es: "Bajar" },
  "zen.orderRestore": {
    en: "Restore plan order",
    es: "Restaurar orden del plan",
  },
  "zen.orderRestoreHint": {
    en: "Go back to the order the plan proposed",
    es: "Volver al orden que propuso el plan",
  },
  "zen.jumpHint": { en: "Go to this exercise", es: "Ir a este ejercicio" },
  "zen.entryHint": {
    en: "Type the number or use − / +",
    es: "Escribe el número o usa − / +",
  },
  "zen.nextSet": { en: "Next set:", es: "Siguiente serie:" },
  "zen.stepSign": { en: "±{step} per tap", es: "±{step} por toque" },
  "zen.repTarget": { en: "target {min}–{max}", es: "objetivo {min}–{max}" },
  "zen.moreReps": { en: "One more rep", es: "Una repetición más" },
  "zen.lessReps": { en: "One fewer rep", es: "Una repetición menos" },
  "zen.summary": { en: "Exercise summary", es: "Resumen del ejercicio" },
  "zen.summary.sets": { en: "sets", es: "series" },
  "zen.summary.reps": { en: "reps", es: "reps" },
  "zen.summary.rest": { en: "rest", es: "descanso" },
  "zen.summary.muscles": { en: "muscles", es: "músculos" },
  "zen.progression": {
    en: "Recommended progression",
    es: "Progresión recomendada",
  },
  "zen.suggestedNext": {
    en: "Suggested load (next set)",
    es: "Peso sugerido (próxima serie)",
  },
  "zen.seeFull": { en: "Full technique", es: "Técnica completa" },
  "zen.sessionRunning": {
    en: "Session in progress",
    es: "Sesión en curso",
  },
  "zen.step1": { en: "Set the load", es: "Ajusta la carga" },
  "zen.step1b": {
    en: "Use a comfortable starting load",
    es: "Elige una carga inicial cómoda",
  },
  "zen.step2": { en: "Perform the movement", es: "Realiza el movimiento" },
  "zen.step3": { en: "Log the set", es: "Registra la serie" },
  "zen.step3b": {
    en: "Rest, then continue when you are ready",
    es: "Descansa y continúa cuando estés listo",
  },
  "zen.tempo": {
    en: "Tempo {tempo} · leave {rir} reps in reserve",
    es: "Ritmo {tempo} · deja {rir} repeticiones en reserva",
  },
  "zen.col.set": { en: "Set", es: "Serie" },
  "zen.col.kg": { en: "Load", es: "Carga" },
  "zen.col.previous": { en: "Previous", es: "Anterior" },
  "zen.fatigue": {
    en: "How hard was that set?",
    es: "¿Qué tan duro fue esa serie?",
  },
  "zen.fatigueOptional": {
    en: "Effort (optional)",
    es: "Esfuerzo (opcional)",
  },
  "zen.fatigueHint": {
    en: "1 easy · 5 at the limit — one tap, no numbers to type",
    es: "1 fácil · 5 al límite — un toque, sin escribir números",
  },
  // D/F badges (owner's own vocabulary, see `lib/effort.ts`). The letter and its
  // name stay together so a badge never reads as an unexplained initial.
  "effort.mark": { en: "Set mark", es: "Marca de la serie" },
  "effort.markHint": {
    en: "One tap: the set is logged with that mark",
    es: "Un toque: la serie queda registrada con esa marca",
  },
  "zen.less": { en: "Less weight", es: "Menos peso" },
  "zen.more": { en: "More weight", es: "Más peso" },
  "zen.next": {
    en: "Next: {name}",
    es: "Siguiente: {name}",
  },
  "zen.upNext": { en: "Up next", es: "Después va" },
  "zen.finish": { en: "Finish session", es: "Terminar sesión" },
  "zen.start": {
    en: "Start ZEN",
    es: "Empezar ZEN",
  },
  // ── Session page (`mockup/03-sesion.html`, ported 2026-10-14) ─────────
  "zen.now": { en: "Now:", es: "Ahora:" },
  "zen.nextUp": { en: "Next:", es: "Siguiente:" },
  "zen.cues": { en: "Technique cues", es: "Cues de técnica" },
  "zen.muscles": { en: "Muscles", es: "Músculos" },
  "zen.mediaNote": {
    en: "Technique reference · compare it with your own positions",
    es: "Referencia de técnica · compárala con tus posiciones",
  },
  /**
   * The unit of the load fields, interpolated: the log is always kg, the screen
   * shows the owner's choice, so a hard-coded `(kg)` label would lie to an lb
   * reader — and it already did, twice on one screen, before 2026-10-14.
   */
  "zen.weightUnit": { en: "Weight ({u})", es: "Peso ({u})" },
  // The hero's pill (mockup 03): it names the media the frame is showing.
  "zen.mediaPill": { en: "Reference GIF", es: "GIF de referencia" },
  "zen.completed": { en: "Completed", es: "Completada" },
  "zen.col.mark": { en: "Mark", es: "Marca" },
  "zen.repeatPrev": {
    en: "Use the previous set's numbers",
    es: "Usar los números de la serie anterior",
  },
  "zen.current": { en: "in progress", es: "en curso" },
  "zen.fatigueField": { en: "Effort", es: "Esfuerzo" },
  "zen.fatigueScale": {
    en: "1 easy · 5 at the limit",
    es: "1 fácil · 5 al límite",
  },
  "zen.warmupHint": {
    en: "Warm-up ramp: it does not count as a working set",
    es: "Rampa de calentamiento: no cuenta como serie de trabajo",
  },
  "zen.restNone": {
    en: "No rest running — it starts when you log a set",
    es: "Sin descanso en curso — empieza al registrar una serie",
  },
  "zen.swapHint": {
    en: "Same movement pattern and loading style, with the gear you own.",
    es: "Misma mecánica y mismo tipo de carga, con tu equipamiento.",
  },
  "zen.rowWeight": { en: "Weight of set {n}", es: "Peso de la serie {n}" },
  "zen.rowReps": { en: "Reps of set {n}", es: "Reps de la serie {n}" },
  /*
   * The session's two escape hatches (mockup 03's top bar, wired 2026-10-15).
   * Each is a toggle, so each needs both faces: doing it, and taking it back.
   */
  "zen.skip": { en: "Skip", es: "Saltar" },
  "zen.unskip": { en: "Resume", es: "Reanudar" },
  "zen.postpone": { en: "Postpone", es: "Posponer" },
  "zen.unpostpone": { en: "Bring back", es: "Traer de vuelta" },
  "zen.skipped": { en: "Set aside", es: "Saltado" },
  "zen.postponed": { en: "Moved to the end", es: "Al final" },
  "zen.skipHint": {
    en: "Out of the way for the rest of today — it stays in the plan",
    es: "Fuera de tu camino por hoy — sigue en el plan",
  },
  "zen.postponeHint": {
    en: "Send it to the end of today's session",
    es: "Lo manda al final de la sesión de hoy",
  },
  "zen.asideNote": { en: "Set aside today:", es: "Apartados hoy:" },
  "zen.asideUndoSkip": {
    en: "Bring {name} back into the session",
    es: "Devolver {name} a la sesión",
  },
  "zen.asideUndoPostpone": {
    en: "Undo the postponement of {name}",
    es: "Deshacer el aplazamiento de {name}",
  },

  // ── Units ────────────────────────────────────────────────────────────
  "settings.unit": { en: "Weight unit", es: "Unidad de peso" },
  "settings.unitHint": {
    en: "Storage stays kg; the screen shows your choice. Exact: 1 kg = 2.2046226218488 lb",
    es: "El almacenaje sigue en kg; la pantalla muestra tu elección. Exacto: 1 kg = 2.2046226218488 lb",
  },
  "settings.daysPerWeek": {
    en: "Training days per week",
    es: "Días de entrenamiento por semana",
  },
  "settings.daysPerWeekHint": {
    en: "Rebuilds the weekly plan with this frequency",
    es: "Regenera el plan semanal con esta frecuencia",
  },

  // ── Setup / BodyLab link ──────────────────────────────────────────────────
  "setup.title": {
    en: "Connect your BodyLab data (optional)",
    es: "Conecta tus datos de BodyLab (opcional)",
  },
  "setup.hint": {
    en: "TrainingLab works on its own. Import the BodyLab export to personalise the plan with your real measurements (Data → Export). 100% local.",
    es: "TrainingLab funciona por sí sola. Importa el export de BodyLab para personalizar el plan con tus medidas reales (Datos → Exportar). 100% local.",
  },
  "setup.chooseFile": {
    en: "Load bodylab-traininglab.json",
    es: "Cargar bodylab-traininglab.json",
  },
  "setup.loaded": { en: "Loaded", es: "Cargado" },
  "setup.loadError": {
    en: "Not a valid BodyLab TrainingLab export (v2).",
    es: "No es un export de BodyLab válido (v2).",
  },
  "setup.goal": { en: "Goal", es: "Objetivo" },
  "setup.level": { en: "Level", es: "Nivel" },
  "data.title": { en: "My data", es: "Mis datos" },
  "data.exportCsv": { en: "Export CSV", es: "Exportar CSV" },
  "data.exportHint": {
    en: "Your logged sets as CSV — opens in Excel and any local assistant can read it. Nothing leaves the device.",
    es: "Tus series registradas en CSV: se abre en Excel y cualquier asistente local puede leerlo. Nada sale del dispositivo.",
  },
  "data.setsCount": { en: "{n} sets logged", es: "{n} series registradas" },
  "backup.export": {
    en: "Download full backup (JSON)",
    es: "Descargar copia completa (JSON)",
  },
  "backup.restore": { en: "Restore backup", es: "Restaurar copia" },
  "backup.hint": {
    en: "Series, sessions, health records, settings and the local model. Restoring merges by id — it never deletes what is already here.",
    es: "Series, sesiones, salud, ajustes y modelo local. Restaurar fusiona por id: nunca borra lo que ya tienes.",
  },
  "backup.restored": {
    en: "Backup read: {n} sets merged.",
    es: "Copia leída: {n} series fusionadas.",
  },
  "backup.error.app": {
    en: "That file is not a TrainingLab backup.",
    es: "Ese archivo no es una copia de TrainingLab.",
  },
  "backup.error.version": {
    en: "That backup was made by a newer version of the app.",
    es: "Esa copia la hizo una versión más nueva de la app.",
  },
  "backup.error.invalid": {
    en: "The backup file is not readable.",
    es: "La copia no se puede leer.",
  },
  "setup.budget": {
    en: "Minutes available today",
    es: "Minutos disponibles hoy",
  },
  "goal.hypertrophy": { en: "Hypertrophy", es: "Hipertrofia" },
  "goal.strength": { en: "Strength", es: "Fuerza" },
  "goal.recomposition": { en: "Recomposition", es: "Recomposición" },
  "level.beginner": { en: "Beginner", es: "Principiante" },
  "level.intermediate": { en: "Intermediate", es: "Intermedio" },
  "level.advanced": { en: "Advanced", es: "Avanzado" },

  // ── Today summary ─────────────────────────────────────────────────────────
  "stats.budget": { en: "Time budget", es: "Tiempo disponible" },
  "stats.planned": { en: "Session planned", es: "Sesión planificada" },
  "stats.setsToday": { en: "Sets today", es: "Series hoy" },
  "stats.volumeToday": { en: "Volume / reps", es: "Volumen / reps" },
  "stats.exercises": { en: "{n} exercises", es: "{n} ejercicios" },
  "stats.ofBudget": { en: "of {n} min", es: "de {n} min" },
  "stats.plannedSets": {
    en: "{n} working sets planned",
    es: "{n} series de trabajo planificadas",
  },

  // ── Readiness ─────────────────────────────────────────────────────────────
  "readiness.title": {
    en: "How do you feel today?",
    es: "¿Cómo te sientes hoy?",
  },
  // The rail is 245 px wide: the full question does not fit a collapsed summary
  // there, and truncating it ("¿Cómo te sientes h…") looks broken.
  "readiness.titleShort": { en: "Today's shape", es: "Estado de hoy" },
  "readiness.hint": {
    en: "This changes today’s volume, rest and exercise choice — not your plan.",
    es: "Esto cambia el volumen, el descanso y la elección de ejercicios de hoy — no tu plan.",
  },
  "readiness.energy": { en: "Energy", es: "Energía" },
  "readiness.motivation": { en: "Motivation", es: "Motivación" },
  "readiness.soreness": {
    en: "Freshness (5 = no soreness)",
    es: "Frescura (5 = sin agujetas)",
  },
  "readiness.low": { en: "Empty", es: "Vacío" },
  "readiness.high": { en: "Great", es: "Genial" },
  "readiness.soreFamilies": { en: "Still sore", es: "Aún con agujetas" },
  "readiness.volumeCut": {
    en: "Volume today: {n}%",
    es: "Volumen de hoy: {n}%",
  },

  // ── Recovery window (derived from the log, not from a checkbox) ──────────
  "recovery.title": { en: "Still recovering", es: "Aún recuperando" },
  "recovery.line": {
    en: "{families} — trained {hours} h ago, inside the {window} h recovery window.",
    es: "{families} — entrenado hace {hours} h, dentro de la ventana de recuperación de {window} h.",
  },
  "recovery.hint": {
    en: "The window comes from your own log (48 h after a real session) and shortens when you report feeling fresh. An explicit focus of the day overrides it.",
    es: "La ventana sale de tu propio registro (48 h tras una sesión real) y se acorta si reportas estar fresco. Un enfoque de hoy elegido por ti la anula.",
  },

  // ── Gear inventory ────────────────────────────────────────────────────────
  "gear.title": { en: "My equipment", es: "Mi equipamiento" },
  "gear.hint": {
    en: "Add what you actually own, one item at a time. The plan can only prescribe what you have.",
    es: "Añade lo que realmente tienes, elemento a elemento. El plan solo puede prescribir lo que tienes.",
  },
  "gear.add": { en: "Add equipment", es: "Añadir equipamiento" },
  "gear.empty": {
    en: "No equipment yet — the plan will be bodyweight only.",
    es: "Sin equipamiento todavía — el plan será solo con tu peso.",
  },
  "gear.maxLoad": { en: "Max load (kg)", es: "Carga máx. (kg)" },
  "gear.increment": { en: "Increment (kg)", es: "Incremento (kg)" },
  "gear.setup": { en: "{n} min setup", es: "{n} min de montaje" },
  "gear.available": {
    en: "{n} of {total} exercises available",
    es: "{n} de {total} ejercicios disponibles",
  },
  // ── Gear profiles: one inventory per room (2026-10-20) ───────────────────
  "gear.profiles.hint": {
    en: "Home and the gym are different gear. Each profile keeps its own list, and switching never deletes the other one.",
    es: "Casa y gimnasio son equipos distintos. Cada perfil guarda su propia lista, y cambiar de perfil nunca borra la otra.",
  },
  "gear.profiles.active": {
    en: "In use: {name}",
    es: "En uso: {name}",
  },
  "gear.profiles.none": {
    en: "No profile yet — this is your only list.",
    es: "Sin perfil todavía — esta es tu única lista.",
  },
  "gear.profiles.save": {
    en: "Save as profile",
    es: "Guardar como perfil",
  },
  "gear.profiles.new": { en: "New profile", es: "Nuevo perfil" },
  "gear.profiles.namePlaceholder": {
    en: "Profile name (e.g. Home)",
    es: "Nombre del perfil (p. ej. Casa)",
  },
  "gear.profiles.defaultName": { en: "Home", es: "Casa" },
  "gear.profiles.suggestedNew": { en: "Gym", es: "Gimnasio" },
  "gear.profiles.switchTitle": {
    en: "Switch to «{name}»? Today’s plan will be recalculated with that gear. Nothing you logged, ordered or authored changes.",
    es: "¿Cambiar a «{name}»? El plan de hoy se recalculará con ese equipo. Lo que has registrado, ordenado o diseñado no cambia.",
  },
  "gear.profiles.switch": { en: "Switch", es: "Cambiar" },
  // Renaming any setup, live or parked (2026-10-22).
  "gear.profiles.rename": { en: "Rename", es: "Renombrar" },
  "gear.profiles.renameActive": {
    en: "Rename the profile in use",
    es: "Renombrar el perfil en uso",
  },
  "gear.profiles.cancel": { en: "Cancel", es: "Cancelar" },
  "gear.profiles.delete": {
    en: "Delete profile",
    es: "Borrar perfil",
  },
  "gear.profiles.deleteTitle": {
    en: "Delete «{name}» and its {n} items? The profile you are using is not affected.",
    es: "¿Borrar «{name}» y sus {n} elementos? El perfil que estás usando no se toca.",
  },
  "gear.profiles.nameTaken": {
    en: "That name is already in use.",
    es: "Ese nombre ya está en uso.",
  },
  "gear.profiles.nameEmpty": {
    en: "A profile needs a name.",
    es: "Un perfil necesita un nombre.",
  },
  "gear.profiles.nameCurrentFirst": {
    en: "Name the current gear before starting another profile, so it is kept.",
    es: "Ponle nombre al equipo actual antes de crear otro perfil, para no perderlo.",
  },
  "gear.profiles.unknown": {
    en: "That profile no longer exists.",
    es: "Ese perfil ya no existe.",
  },
  "gear.profiles.deleteActive": {
    en: "That is the profile in use — switch to another one before deleting it.",
    es: "Ese es el perfil en uso — cambia a otro antes de borrarlo.",
  },

  // ── Session ───────────────────────────────────────────────────────────────
  "session.title": { en: "Today’s session", es: "Sesión de hoy" },
  "session.minutes": { en: "{n} min", es: "{n} min" },
  "session.swap": { en: "Change", es: "Cambiar" },
  "session.swapTitle": { en: "Swap for", es: "Cambiar por" },
  "session.noSwap": {
    en: "No equivalent option with your equipment.",
    es: "No hay opción equivalente con tu equipamiento.",
  },
  "session.why": { en: "Why", es: "Por qué" },
  "session.advisories": { en: "Notes for today", es: "Notas de hoy" },
  "session.finish": { en: "Finish session", es: "Terminar sesión" },
  "session.done": {
    en: "Session done — {sets} sets · {vol} kg",
    es: "Sesión completada — {sets} series · {vol} kg",
  },
  "session.sets": { en: "{n} sets logged", es: "{n} series registradas" },
  "session.cardioDesc": {
    en: "{n} min conditioning block",
    es: "Bloque de acondicionamiento de {n} min",
  },
  "session.none": {
    en: "No session could be built.",
    es: "No se pudo construir ninguna sesión.",
  },
  "session.rebuilt": {
    en: "Rebuilt with your changes",
    es: "Recalculada con tus cambios",
  },
  "session.swapped": { en: "swapped by you", es: "cambiada por ti" },
  "session.coachPick": { en: "coach pick", es: "elección del coach" },

  // ── Slots ─────────────────────────────────────────────────────────────────
  "slot.of": { en: "{done} / {total} sets", es: "{done} / {total} series" },
  "slot.rest": { en: "{s}s rest", es: "descanso {s}s" },
  "slot.rir": { en: "RIR {r}", es: "RIR {r}" },
  "slot.unilateral": { en: "per side", es: "por lado" },
  "slot.progressBy": { en: "Progress by: {axes}", es: "Progresas por: {axes}" },
  "slot.jointCaution": {
    en: "High joint stress — stop the set if it pinches.",
    es: "Alto estrés articular — corta la serie si molesta.",
  },
  "slot.spineCaution": {
    en: "High spine load — brace hard, no rounding.",
    es: "Alta carga de columna — bracea fuerte, sin curvar.",
  },
  "slot.seeHow": { en: "See how it's done", es: "Ver cómo se hace" },
  "slot.expand": { en: "Log set", es: "Registrar" },
  "slot.collapse": { en: "Hide log", es: "Ocultar" },
  "slot.techniqueLvl": {
    en: "Technique {n}/5",
    es: "Técnica {n}/5",
  },

  // ── Technique demo (drawn, no licensed media) ───────────────────────────
  "tech.demoAlt": {
    en: "Animated drawing of the exercise movement",
    es: "Dibujo animado del movimiento del ejercicio",
  },
  "tech.modalTitle": {
    en: "How it's done",
    es: "Cómo se hace",
  },
  "tech.close": { en: "Close", es: "Cerrar" },
  "tech.watchOut": { en: "Watch", es: "Fíjate en" },
  "tech.level": { en: "Technique", es: "Técnica" },
  "tech.effort": { en: "Effort", es: "Esfuerzo" },
  "tech.joint": { en: "Joint stress", es: "Estrés articular" },
  "tech.tempo": { en: "Tempo", es: "Tempo" },
  "tech.setup": { en: "Setup", es: "Preparación" },
  "tech.execution": { en: "Execution", es: "Ejecución" },
  "tech.mistakes": { en: "Common mistakes", es: "Errores comunes" },
  "tech.safety": { en: "Safety", es: "Seguridad" },
  "tech.breathing": { en: "Breathing", es: "Respiración" },
  "tech.effortNote": { en: "Effort:", es: "Esfuerzo:" },
  "tech.stillPhoto": {
    en: "Reference photo (public domain)",
    es: "Foto de referencia (dominio público)",
  },
  "tech.stillPair": {
    en: "Start · end position (public domain)",
    es: "Posición inicial · final (dominio público)",
  },
  "tech.startPos": { en: "start position", es: "posición inicial" },
  "tech.endPos": { en: "end position", es: "posición final" },
  // The stage frame's two views (mockup 03): the loop, and its two ends.
  "tech.viewGif": { en: "GIF", es: "GIF" },
  "tech.viewStills": { en: "Start · end", es: "Inicio · fin" },
  "tech.viewStart": { en: "Start", es: "Inicio" },
  "tech.viewEnd": { en: "End", es: "Fin" },
  "tech.joint.ankle": { en: "ankle", es: "tobillo" },
  "tech.joint.knee": { en: "knee", es: "rodilla" },
  "tech.joint.hip": { en: "hip", es: "cadera" },
  "tech.joint.spine": { en: "spine", es: "columna" },
  "tech.joint.shoulder": { en: "shoulder", es: "hombro" },
  "tech.joint.elbow": { en: "elbow", es: "codo" },
  "tech.joint.wrist": { en: "wrist", es: "muñeca" },

  // ── Logging ───────────────────────────────────────────────────────────────
  "log.weight": { en: "Weight (kg)", es: "Peso (kg)" },
  "log.reps": { en: "Reps", es: "Reps" },
  "log.add": { en: "Add set", es: "Añadir serie" },
  "log.last": {
    en: "Last: {d} · {n} sessions",
    es: "Última: {d} · {n} sesiones",
  },
  "log.suggested": { en: "Suggested {w} kg", es: "Sugerido {w} kg" },
  "log.removed": { en: "Set deleted", es: "Serie eliminada" },
  // The same undo bar, for the other way a set is destroyed (2026-10-21).
  "log.edited": { en: "Set edited", es: "Serie editada" },
  "log.repsOnly": { en: "{n} reps", es: "{n} reps" },
  "log.untrained": {
    en: "First time — start light",
    es: "Primera vez — empieza ligero",
  },
  "log.setsToday": { en: "Today", es: "Hoy" },

  // ── Load suggestion reasons ────────────────────────────────────────────────
  "load.first": {
    en: "First time — start light and log it.",
    es: "Primera vez — empieza ligero y regístrala.",
  },
  "load.noLoad": {
    en: "No external load — progress by reps, leverage or time.",
    es: "Sin carga externa — progresas por repeticiones, palanca o tiempo.",
  },
  "load.pr": {
    en: "PR-based start: {w} kg for ~{reps} reps",
    es: "Inicio desde tu PR: {w} kg para ~{reps} reps",
  },
  "load.repeat": {
    en: "Repeat {w} kg (last time {reps} reps)",
    es: "Repite {w} kg (la última vez {reps} reps)",
  },
  "load.topRange": {
    en: "Top of range last time → +{step} kg",
    es: "Tocaste el techo del rango → +{step} kg",
  },
  "load.below": {
    en: "Below the range last time → −{step} kg to rebuild",
    es: "Por debajo del rango → −{step} kg para reconstruir",
  },
  "load.sore": {
    en: "−5 % for today’s soreness",
    es: "−5 % por las agujetas de hoy",
  },
  "load.capped": {
    en: "capped by your {cap} kg equipment",
    es: "limitado por tu equipo de {cap} kg",
  },

  // ── Next-set proposal (in-session load, decided by the D/F mark) ──────────
  "nextSet.first": {
    en: "First set: the progression's suggestion.",
    es: "Primera serie: la sugerencia de la progresión.",
  },
  "nextSet.firstBodyweight": {
    en: "First set: bodyweight — mark the effort when it gets hard.",
    es: "Primera serie: peso corporal — marca el esfuerzo cuando se ponga duro.",
  },
  "nextSet.bodyweight": {
    en: "Bodyweight work: the load cannot move, so keep the reps in the range.",
    es: "Trabajo con peso corporal: no hay carga que mover, así que mantén las reps en el rango.",
  },
  "nextSet.belowRange": {
    en: "{reps} reps is below the {min} minimum → {w} kg to earn the range back.",
    es: "{reps} reps se quedan bajo el mínimo de {min} → {w} kg para volver a entrar en el rango.",
  },
  "nextSet.backoffF": {
    en: "The last set went to failure: −10 % → {w} kg (was {prev} kg).",
    es: "La serie anterior fue al fallo: −10 % → {w} kg (antes {prev} kg).",
  },
  "nextSet.holdF": {
    en: "Failure at this load is the goal: repeat it and let the reps fall.",
    es: "Fallo con esta carga es el objetivo: repítela y deja que bajen las reps.",
  },
  "nextSet.holdD": {
    en: "Near failure at this load: repeat — it is the load that is working.",
    es: "Cerca del fallo con esta carga: repítela — es la carga que está funcionando.",
  },
  "nextSet.raiseTop": {
    en: "{reps} reps above the {max} top without a mark: it was light → {w} kg.",
    es: "{reps} reps por encima del techo de {max} sin marca: estuvo ligera → {w} kg.",
  },
  "nextSet.capped": {
    en: "Top of the range, but your gear stops at {cap} kg: repeat it.",
    es: "Techo del rango, pero tu equipo llega hasta {cap} kg: repítela.",
  },
  "nextSet.unmarked": {
    en: "In the range: repeat the load and mark D or F so the next proposal can adjust.",
    es: "Dentro del rango: repite la carga y marca D o F para que la propuesta ajuste.",
  },

  /*
   * ── Cross-session progression (2026-10-13) ────────────────────────────────
   *
   * The verdict of `lib/progression.ts` (raise / escalate / repeat / reduce /
   * regress) is computed over the days BEFORE today, so the sentences here
   * answer "what do I do next time I start this exercise". Deliberately NOT
   * `advice.reason`: that string is written for the agent channel and names the
   * progression axis by its id ("vía leverage"), which is not the owner's
   * language. The screen builds its own sentence from the same numbers.
   */
  "progress.betweenSessions": {
    en: "Across sessions",
    es: "Entre sesiones",
  },
  "progress.basis": {
    en: "From your last session ({day})",
    es: "De tu última sesión ({day})",
  },
  "progress.noBasis": {
    en: "No previous session with this exercise.",
    es: "Sin sesión anterior de este ejercicio.",
  },
  "progress.verdict.increase_load": {
    en: "Raise the load",
    es: "Sube la carga",
  },
  "progress.verdict.escalate_variant": {
    en: "Harder variant",
    es: "Variante más difícil",
  },
  "progress.verdict.repeat": { en: "Keep the load", es: "Mantén la carga" },
  "progress.verdict.reduce": { en: "Rebuild it", es: "Reconstruye" },
  "progress.verdict.regress_variant": {
    en: "Easier variant",
    es: "Variante más fácil",
  },
  "progress.verdict.first_time": { en: "First time", es: "Primera vez" },
  // `formatWeight` already carries the unit (kg or lb), so the placeholders
  // below never append one — "104.3 kg kg" reached the screen on 2026-10-13.
  "progress.increase": {
    en: "Every set reached {max} reps: {w} next time (was {prev}).",
    es: "Todas las series llegaron a {max} reps: {w} la próxima vez (antes {prev}).",
  },
  "progress.escalate": {
    en: "Every set reached {max} reps and the load cannot grow{cap}.",
    es: "Todas las series llegaron a {max} reps y la carga no puede subir{cap}.",
  },
  "progress.escalateLever": {
    en: "Next lever: {axis}.",
    es: "Siguiente palanca: {axis}.",
  },
  "progress.regressLever": {
    en: "Go to an easier version ({axis}) until the reps are there.",
    es: "Pasa a una versión más fácil ({axis}) hasta llegar.",
  },
  "progress.escalateCap": {
    en: " (your gear stops at {cap})",
    es: " (tu material llega a {cap})",
  },
  /*
   * `repeat` and `reduce` name no weight on purpose (2026-10-13). The load that
   * goes on the bar is the one pre-filled on the field, and on the owner's own
   * log the day's TOP set (what this verdict reads) and the last logged set (what
   * the field inherits) are different numbers: printing both put 104.3 kg and
   * 81 kg on the same card. The verdict says what to DO; the field carries the
   * number. Only the two verdicts that CHANGE the load print kilos.
   */
  "progress.repeat": {
    en: "{min}–{max} reps of the {targetMin}–{targetMax} range: repeat the weight and add reps.",
    es: "{min}–{max} reps de un rango {targetMin}–{targetMax}: repite el peso y suma repeticiones.",
  },
  "progress.reduce": {
    en: "{reps} reps, below the {targetMin}–{targetMax} range: keep or lighten the load and rebuild before adding anything.",
    es: "{reps} reps, por debajo del rango {targetMin}–{targetMax}: mantén o baja la carga y reconstruye antes de añadir nada.",
  },
  "progress.regress": {
    en: "{reps} reps, below the {targetMin}–{targetMax} range, and there is no load to take off.",
    es: "{reps} reps, por debajo del rango {targetMin}–{targetMax}, y no hay carga que quitar.",
  },
  "progress.axis.load": { en: "load", es: "carga" },
  "progress.axis.reps": { en: "reps", es: "repeticiones" },
  "progress.axis.leverage": { en: "leverage", es: "palanca" },
  "progress.axis.tempo": { en: "tempo", es: "tempo" },
  "progress.axis.time": { en: "time under tension", es: "tiempo bajo tensión" },
  "progress.axis.range": { en: "range of motion", es: "recorrido" },
  "progress.axis.volume": { en: "extra volume", es: "volumen extra" },

  // ── Rest timer ────────────────────────────────────────────────────────────
  "timer.rest": { en: "Rest", es: "Descanso" },
  "timer.skip": { en: "Skip", es: "Saltar" },
  "timer.plus15": { en: "+15s", es: "+15s" },
  "timer.pause": { en: "Pause", es: "Pausar" },
  "timer.resume": { en: "Resume", es: "Reanudar" },

  // ── Coach (local LLM) ─────────────────────────────────────────────────────
  "coach.title": { en: "Local coach (optional)", es: "Coach local (opcional)" },
  "coach.hint": {
    en: "Your own llama.cpp-family model, on this machine. Off by default; used only when you ask. The maths and the hard rules still decide.",
    es: "Tu propio modelo de la familia llama.cpp, en este equipo. Apagado por defecto; solo se usa cuando se lo pides. La matemática y las reglas duras siguen decidiendo.",
  },
  "coach.enable": { en: "Enable local model", es: "Activar modelo local" },
  "coach.placeholder": {
    en: "I have 45 min and only dumbbells today…",
    es: "Hoy tengo 45 min y solo mancuernas…",
  },
  "coach.ask": { en: "Ask the coach", es: "Pedir al coach" },
  "coach.thinking": { en: "Thinking locally…", es: "Pensando en local…" },
  "coach.applied": {
    en: "Coach plan applied ({n} slots)",
    es: "Plan del coach aplicado ({n} ejercicios)",
  },
  "coach.rejected": {
    en: "Proposal rejected by the hard rules",
    es: "Propuesta rechazada por las reglas duras",
  },
  "coach.tools": { en: "Tools used", es: "Herramientas usadas" },
  "coach.off": {
    en: "The local coach is off — the deterministic plan is being used.",
    es: "El coach local está apagado — se usa el plan determinista.",
  },
  // Short form for the collapsed-header badge (the sentence above does not fit
  // in a badge on a phone).
  "coach.offBadge": { en: "Off", es: "Apagado" },
  "coach.onBadge": { en: "Ready", es: "Listo" },

  // ── Settings ──────────────────────────────────────────────────────────────
  "setup.preferences": { en: "Plan preferences", es: "Preferencias del plan" },
  "settings.model": {
    en: "Local decision model",
    es: "Modelo de decisión local",
  },
  "settings.modelHint": {
    en: "Learns from your logged sets which exercises to prioritise. Weights stay visible and clamped.",
    es: "Aprende de tus series registradas qué ejercicios priorizar. Los pesos quedan visibles y acotados.",
  },
  "settings.modelUpdates": {
    en: "{n} outcomes learned",
    es: "{n} resultados aprendidos",
  },
  "settings.modelReset": { en: "Reset learning", es: "Reiniciar aprendizaje" },
  "settings.llmBaseUrl": { en: "Server URL", es: "URL del servidor" },
  "settings.llmModel": { en: "Model name", es: "Nombre del modelo" },
  "settings.llmKey": { en: "API key (optional)", es: "API key (opcional)" },
  "settings.llmPresets": { en: "Quick presets", es: "Presets rápidos" },

  // ── Sound cues (the three moments worth hearing) ────────────────────────
  "settings.sounds": { en: "Sound cues", es: "Avisos sonoros" },
  "settings.soundsHint": {
    en: "Three synthesised cues: a bell when you finish the session, a chime when an exercise completes its sets, a fanfare on a personal record. Nothing is downloaded — they are generated on the spot.",
    es: "Tres avisos sintetizados: campana al terminar el entrenamiento, tintineo al completar las series de un ejercicio y fanfarria al batir un récord. No se descarga nada: se generan en el momento.",
  },
  "settings.soundsToggle": { en: "Play cues", es: "Reproducir avisos" },
  "settings.soundsVolume": { en: "Volume", es: "Volumen" },
  "settings.soundsPreview": { en: "Preview", es: "Probar" },
  "settings.soundsUnsupported": {
    en: "This browser has no Web Audio, so cues stay silent. The banner still appears.",
    es: "Este navegador no tiene Web Audio, así que los avisos quedan en silencio. El aviso visual sigue apareciendo.",
  },
  "settings.soundsBlocked": {
    en: "The browser blocked audio — tap anywhere in the app once, then press Preview again.",
    es: "El navegador bloqueó el audio: toca una vez en cualquier parte de la app y vuelve a pulsar Probar.",
  },

  // ── Notifications (the rest countdown, off-screen) ──────────────────────
  "settings.notifications": { en: "Notifications", es: "Notificaciones" },
  "settings.notificationsHint": {
    en: "A single local notification when a rest countdown reaches zero, so it still lands with the tab in the background. Nothing is pushed from a server and permission is only ever asked when you press the button.",
    es: "Una única notificación local cuando termina el descanso, para que no se pierda con la pestaña en segundo plano. Nada se envía desde un servidor y el permiso solo se pide al pulsar el botón.",
  },
  "settings.notificationsToggle": {
    en: "Notify when rest ends",
    es: "Avisar al terminar el descanso",
  },
  "settings.notificationsAlways": {
    en: "Even while the app is visible",
    es: "También con la app visible",
  },
  "settings.notificationsAsk": {
    en: "Allow notifications",
    es: "Permitir notificaciones",
  },
  "settings.notificationsGranted": {
    en: "Permission granted",
    es: "Permiso concedido",
  },
  "settings.notificationsDenied": {
    en: "Blocked in the browser settings — re-allow it there.",
    es: "Bloqueadas en los ajustes del navegador: vuelve a permitirlas allí.",
  },
  "settings.notificationsUnsupported": {
    en: "This runtime has no notification API, so only the on-screen timer will warn you.",
    es: "Este entorno no tiene API de notificaciones, así que solo te avisará el temporizador en pantalla.",
  },
  "notif.restDone": { en: "Rest finished", es: "Descanso terminado" },
  "notif.restNext": {
    en: "Rest finished — next: {name}",
    es: "Descanso terminado — siguiente: {name}",
  },

  // ── Shared household history (optional LAN store) ───────────────────────
  "shared.title": { en: "Shared history", es: "Historial compartido" },
  "shared.hint": {
    en: "Optional: log your household into one history on your own Wi-Fi. Off by default, and the app never needs it.",
    es: "Opcional: que todos en casa registren en un mismo historial dentro de tu Wi-Fi. Apagado por defecto y la app nunca lo necesita.",
  },
  "shared.server": { en: "Server address", es: "Dirección del servidor" },
  "shared.yourName": { en: "Your name", es: "Tu nombre" },
  "shared.connect": { en: "Connect", es: "Conectar" },
  "shared.reconnect": { en: "Reconnect", es: "Reconectar" },
  "shared.disconnect": { en: "Turn off", es: "Desconectar" },
  "shared.syncNow": { en: "Sync now", es: "Sincronizar ahora" },
  "shared.family": { en: "Your household", es: "Tu grupo" },
  "shared.familyWeek": {
    en: "{sets} sets · {vol} kg this week",
    es: "{sets} series · {vol} kg esta semana",
  },
  "shared.health": { en: "Health records", es: "Registros de salud" },
  "shared.healthHint": {
    en: "Resting heart rate, weight, sleep, blood pressure, mood. Kept on this device and, if shared history is on, synced with your household. Recording is not medical advice.",
    es: "FC en reposo, peso, sueño, presión arterial, ánimo. Se guardan en este dispositivo y, si el historial compartido está activo, se sincronizan con tu grupo. Registrarlo no es consejo médico.",
  },
  "shared.healthValue": { en: "Value", es: "Valor" },
  "shared.healthLocal": {
    en: "{n} records on this device",
    es: "{n} registros en este dispositivo",
  },
  "shared.healthSynced": { en: "synced", es: "sincronizados" },
  "shared.notPrivate": {
    en: "Not private: everyone on this Wi-Fi can read and write the shared history. Perfect at home, never switch it on in a public network.",
    es: "No es privado: cualquiera en esta Wi-Fi puede leer y escribir el historial compartido. Perfecto en casa; nunca lo actives en una red pública.",
  },
  "shared.lastSync": {
    en: "Last sync: {when}",
    es: "Última sincronización: {when}",
  },
  "shared.badUrl": {
    en: "The address must look like http://192.168.1.7:8090",
    es: "La dirección debe ser del tipo http://192.168.1.7:8090",
  },
  "shared.needName": {
    en: "Type a name first",
    es: "Escribe un nombre primero",
  },
  "shared.unreachable": {
    en: "No server answered. Is it running with --shared?",
    es: "Ningún servidor respondió. ¿Está arrancado con --shared?",
  },
  "shared.serverError": {
    en: "The server refused the request",
    es: "El servidor rechazó la petición",
  },
  "shared.status.off": { en: "Off", es: "Apagado" },
  "shared.status.unconfigured": { en: "Not connected", es: "Sin conectar" },
  "shared.status.never-synced": { en: "Pending sync", es: "Sin sincronizar" },
  "shared.status.ok": { en: "Synced", es: "Sincronizado" },
  "shared.status.stale": { en: "Out of date", es: "Desactualizado" },
  "shared.status.error": { en: "Error", es: "Error" },

  // ── Celebration banner ──────────────────────────────────────────────────
  "cue.record": { en: "New personal record", es: "Nuevo récord personal" },
  "cue.achievement": { en: "Exercise completed", es: "Ejercicio completado" },
  "cue.sessionDone": { en: "Session finished", es: "Entrenamiento terminado" },
  "cue.firstMark": {
    en: "First recorded mark: {v}",
    es: "Primer registro: {v}",
  },
  "cue.beatWeight": {
    en: "{v} — beat {prev} kg",
    es: "{v} — superaste {prev} kg",
  },
  "cue.beatE1rm": {
    en: "Best estimated 1RM: {v} (was {prev} kg)",
    es: "Mejor 1RM estimado: {v} (antes {prev} kg)",
  },
  "cue.exerciseDone": {
    en: "All sets of {name} are logged",
    es: "Series de {name} registradas",
  },
  "cue.sessionSummary": {
    en: "{sets} sets · {vol} kg of volume",
    es: "{sets} series · {vol} kg de volumen",
  },

  /*
   * ── Unloaded marks (2026-10-13) ───────────────────────────────────────────
   *
   * A bodyweight set is judged on reps and a timed set on seconds, so the
   * celebration has to say which currency it is talking about: "12 repeticiones"
   * and "90 s", never a bare number a reader would take for kilos.
   */
  "cue.valueReps": { en: "{n} reps", es: "{n} repeticiones" },
  "cue.valueHold": { en: "{sec} s", es: "{sec} s" },
  "cue.beatReps": {
    en: "{v} — beat {prev}",
    es: "{v} — superaste {prev}",
  },
  "cue.beatHold": {
    en: "{v} — beat {prev}",
    es: "{v} — superaste {prev}",
  },
  "mark.reps": { en: "Mark: {n} reps", es: "Marca: {n} reps" },
  "mark.repsWhy": {
    en: "the set with the most reps without a load",
    es: "la serie con más repeticiones sin carga",
  },
  "mark.hold": { en: "Longest hold: {sec} s", es: "Mejor tiempo: {sec} s" },
  "mark.holdWhy": {
    en: "the longest set without a load",
    es: "la serie más larga sin carga",
  },

  // ── Phone navigation (two panes so the session is never a screen away) ───
  "nav.train": { en: "Train", es: "Entrenar" },
  "nav.setup": { en: "Setup", es: "Ajustes" },
  "readiness.badge": {
    en: "Energy {e} · Motivation {m} · Freshness {s}",
    es: "Energía {e} · Motivación {m} · Agujetas {s}",
  },

  // ── Mobile / LAN testing ────────────────────────────────────────────────
  "mobile.title": { en: "Train with your phone", es: "Entrena con tu móvil" },
  "mobile.hint": {
    en: "Logging sets at the gym from the phone is the whole point. Serve this app to your phone over Wi-Fi: run the LAN server once, it prints an address like http://192.168.1.7:8090/ to type on the phone.",
    es: "Registrar series en el gimnasio desde el móvil es el objetivo. Sirve esta app a tu móvil por Wi-Fi: ejecuta el servidor local una vez e imprime una dirección tipo http://192.168.1.7:8090/ para escribirla en el móvil.",
  },
  "mobile.launcher": {
    en: "Double-click «LAN Server.bat» in the project folder, or run:",
    es: "Haz doble clic en «LAN Server.bat» en la carpeta del proyecto, o ejecuta:",
  },
  "mobile.onLan": {
    en: "You are already using TrainingLab over the local network. Open this address on your phone:",
    es: "Ya estás usando TrainingLab por la red local. Abre esta dirección en tu móvil:",
  },
  "mobile.sibling": {
    en: "BodyLab is on the same server",
    es: "BodyLab está en el mismo servidor",
  },
  "mobile.privacy": {
    en: "Anyone on this Wi-Fi can open the server while it runs (stop it with Ctrl+C). Each device logs into its own browser storage — the phone starts empty, so import a BodyLab JSON if you want the link.",
    es: "Cualquiera en esta Wi-Fi puede abrir el servidor mientras esté encendido (se para con Ctrl+C). Cada dispositivo registra en su propio navegador: el móvil empieza vacío, así que importa un JSON de BodyLab si quieres el vínculo.",
  },
  "mobile.copy": { en: "Copy", es: "Copiar" },
  "mobile.copied": { en: "Copied", es: "Copiado" },
  "mobile.copyFailed": { en: "Select it manually", es: "Selecciónala a mano" },

  "common.loading": { en: "Loading…", es: "Cargando…" },
  "common.delete": { en: "Delete", es: "Eliminar" },
  "common.edit": { en: "Edit", es: "Editar" },
  "common.undo": { en: "Undo", es: "Deshacer" },
  "common.cancel": { en: "Cancel", es: "Cancelar" },
  "common.close": { en: "Close", es: "Cerrar" },
  "common.save": { en: "Save", es: "Guardar" },
  "common.dragHandle": {
    en: "Drag to reorder",
    es: "Arrastrar para ordenar",
  },
  "common.dragHint": {
    en: "Drag the grip, or focus it and use ↑ / ↓.",
    es: "Arrastra el asa, o enfócala y usa ↑ / ↓.",
  },

  // ── Shell / navigation ────────────────────────────────────────────────
  "nav.label": { en: "Main navigation", es: "Navegación principal" },
  "nav.today": { en: "Today", es: "Hoy" },
  "nav.training": { en: "Training", es: "Entrenamiento" },
  "nav.history": { en: "History", es: "Historial" },
  "nav.progress": { en: "Progress", es: "Progreso" },
  "nav.exercises": { en: "Exercises", es: "Ejercicios" },
  "nav.week": { en: "Week", es: "Semana" },
  "nav.routines": { en: "Routines", es: "Rutinas" },
  "nav.settings": { en: "Settings", es: "Configuración" },
  "nav.more": { en: "More", es: "Más" },
  "nav.moreCurrent": {
    en: "More — {name}",
    es: "Más — {name}",
  },
  "nav.session": { en: "Train", es: "Entrenar" },

  // ── Placeholders of the linear replacement (2026-10-14) ────────────────
  "soon.badge": { en: "Coming soon", es: "Próximamente" },
  "soon.training": {
    en: "The day's queue — reorder, swap and pin today's exercises before starting — is screen 02 of the approved mockup and lands in the next port. Today you can start and log the session as always.",
    es: "La cola del día —reordenar, cambiar y fijar los ejercicios de hoy antes de empezar— es la pantalla 02 del mockup aprobado y llega en el próximo port. Por ahora puedes empezar y registrar la sesión como siempre.",
  },
  "soon.startToday": {
    en: "Start today's session",
    es: "Empezar la sesión de hoy",
  },
  // ── Historial (08) ────────────────────────────────────────────────────────
  // Real screen since 2026-10-16; `soon.history` stays for the day a future
  // destination needs to explain itself, but nothing renders it any more.
  "hist.pageHint": {
    en: "{n} closed sessions, newest first.",
    es: "{n} sesiones cerradas, la más reciente primero.",
  },
  "hist.pageHintEmpty": {
    en: "Closed sessions will appear here.",
    es: "Aquí aparecerán tus sesiones cerradas.",
  },
  "hist.pillSets": { en: "{n} working sets", es: "{n} series de trabajo" },
  "hist.pillSetsHint": {
    en: "Working sets in the sessions shown here (warm-up ramps excluded).",
    es: "Series de trabajo de las sesiones mostradas (la rampa de calentamiento no cuenta).",
  },
  "hist.pillVolume": { en: "{kg} moved", es: "{kg} movidos" },
  "hist.pillVolumeHint": {
    en: "Weight × reps over the working sets shown here.",
    es: "Peso × repeticiones sobre las series de trabajo mostradas.",
  },
  "hist.listTitle": { en: "Session by session", es: "Sesión a sesión" },
  "hist.listHint": {
    en: "Sets are never rewritten here: rename a session, say where it happened, or delete it whole.",
    es: "Aquí no se reescriben las series: renombra la sesión, di dónde fue o bórrala entera.",
  },
  "hist.listHintCapped": {
    en: "Showing the {shown} most recent of {total}.",
    es: "Se muestran las {shown} más recientes de {total}.",
  },
  "hist.sets": { en: "{n} sets", es: "{n} series" },
  "hist.warmup": { en: "{n} warm-up", es: "{n} de calentamiento" },
  "hist.exercises": { en: "{n} exercises", es: "{n} ejercicios" },
  "hist.volume": { en: "{kg} moved", es: "{kg} movidos" },
  "hist.duration": { en: "{n} min", es: "{n} min" },
  "hist.moreExercises": { en: "+{n} more", es: "+{n} más" },
  "hist.showLess": { en: "show less", es: "mostrar menos" },
  "hist.sourceHint": {
    en: "Imported from another app, not logged here.",
    es: "Importado de otra app, no registrado aquí.",
  },
  "hist.place.gym": { en: "Gym", es: "Gimnasio" },
  "hist.place.home": { en: "Home", es: "Casa" },
  "hist.place.none": { en: "Not specified", es: "Sin especificar" },

  /* ── Historial: editar y borrar una sesión (2026-10-21) ───────────────── */
  "hist.edit": { en: "Edit", es: "Editar" },
  "hist.editName": { en: "Session name", es: "Nombre de la sesión" },
  "hist.editNamePlaceholder": { en: "No name", es: "Sin nombre" },
  "hist.editPlace": { en: "Where it happened", es: "Dónde fue" },
  "hist.save": { en: "Save", es: "Guardar" },
  "hist.cancel": { en: "Cancel", es: "Cancelar" },
  "hist.delete": { en: "Delete", es: "Eliminar" },
  "hist.deleteTitle": {
    en: "Delete this session?",
    es: "¿Eliminar esta sesión?",
  },
  "hist.deleteBody": {
    en: "The session and its {n} sets ({kg} of working volume) go with it. Your marks and progress are recalculated without it.",
    es: "Se borran la sesión y sus {n} series ({kg} de volumen de trabajo). Tus marcas y tu progreso se recalculan sin ella.",
  },
  "hist.deleteWarmup": {
    en: "{n} warm-up sets are included.",
    es: "Se incluyen {n} series de calentamiento.",
  },
  "hist.deleteWarmupOne": {
    en: "1 warm-up set is included.",
    es: "Se incluye 1 serie de calentamiento.",
  },
  "hist.deleteMissing": {
    en: "{n} sets were already missing from the log.",
    es: "{n} series ya no estaban en el registro.",
  },
  "hist.deleteConfirm": { en: "Yes, delete", es: "Sí, eliminar" },
  "hist.deleted": { en: "Session deleted", es: "Sesión eliminada" },
  "hist.undoSets": { en: "{n} sets", es: "{n} series" },
  "hist.undoIn": { en: "Undo ({n}s)", es: "Deshacer ({n} s)" },
  "hist.dismiss": { en: "Dismiss", es: "Descartar" },
  "hist.empty": {
    en: "No closed sessions yet",
    es: "Todavía no hay sesiones cerradas",
  },
  "hist.emptyHint": {
    en: "A session lands here when you finish it, and when a history import brings one in.",
    es: "Una sesión aparece aquí cuando la terminas, y también cuando entra por una importación de historial.",
  },
  "soon.history": {
    en: "History is screen 08 of the mockup: every session you logged, newest first, with its sets. The data is already recorded — this port only needs the screen.",
    es: "Historial es la pantalla 08 del mockup: cada sesión registrada, la más reciente primero, con sus series. Los datos ya están grabados — a este port solo le falta la pantalla.",
  },
  "nav.offline": { en: "Local mode", es: "Modo local" },
  "nav.offlineHint": {
    en: "Everything works without a connection.",
    es: "Todo funciona sin conexión.",
  },
  "nav.motto": {
    en: "Discipline today, results tomorrow.",
    es: "Disciplina hoy, resultados mañana.",
  },

  // ── Exercise library ──────────────────────────────────────────────────
  "ex.title": { en: "Exercises", es: "Ejercicios" },
  "ex.count": {
    en: "{total} exercises · {guide} with extra variant cues",
    es: "{total} ejercicios · {guide} con indicaciones propias de variante",
  },
  "ex.variant": { en: "Variant", es: "Variante" },
  "ex.search": {
    en: "Search exercise, muscle or equipment…",
    es: "Buscar ejercicio, músculo o equipo…",
  },
  "ex.clear": { en: "Clear search", es: "Borrar búsqueda" },
  "ex.clearFilters": { en: "Clear filters", es: "Quitar filtros" },
  "ex.none": { en: "No exercise matches", es: "Ningún ejercicio coincide" },
  "ex.noneHint": {
    en: "Try a shorter word, or drop one of the filters — the catalog has {n} entries.",
    es: "Prueba con una palabra más corta o quita un filtro — el catálogo tiene 143 entradas.",
  },
  "ex.showing": { en: "{n} shown", es: "{n} a la vista" },
  "ex.guide": { en: "Guide", es: "Guía" },
  "ex.cardio": { en: "Cardio", es: "Cardio" },
  "ex.back": { en: "Back to the library", es: "Volver a la biblioteca" },
  "ex.missing": {
    en: "That exercise is not in the catalog",
    es: "Ese ejercicio no está en el catálogo",
  },
  "ex.missingHint": {
    en: "It may have been renamed or removed since the link was saved.",
    es: "Puede que se renombrara o se quitara desde que se guardó el enlace.",
  },
  "ex.level": { en: "Level", es: "Nivel" },
  "ex.unilateral": { en: "One side at a time", es: "Un lado a la vez" },
  "ex.noCues": {
    en: "We have no extra notes for this movement yet.",
    es: "Aún no tenemos notas extra para este movimiento.",
  },
  "ex.techniqueLevel": {
    en: "Skill required",
    es: "Técnica exigida",
  },
  "ex.cat.compound": { en: "Compound", es: "Compuesto" },
  "ex.cat.isolation": { en: "Isolation", es: "Aislamiento" },
  "ex.cat.bodyweight": { en: "Bodyweight", es: "Peso corporal" },
  "ex.cat.cable": { en: "Cable", es: "Polea" },
  "ex.cat.machine": { en: "Machine", es: "Máquina" },
  "ex.cat.cardio": { en: "Cardio", es: "Cardio" },
  "ex.fav": { en: "Favourites", es: "Favoritos" },
  "ex.favAdd": { en: "Add to favourites", es: "Añadir a favoritos" },
  "ex.favRemove": { en: "Remove from favourites", es: "Quitar de favoritos" },
  "ex.favNone": { en: "Nothing starred yet", es: "Aún no has marcado nada" },
  "ex.favNoneHint": {
    en: "The star on a row keeps the exercises you really use one tap away.",
    es: "La estrella de cada fila deja a un toque los ejercicios que de verdad usas.",
  },
  "ex.favOnly": {
    en: "Only favourites",
    es: "Solo favoritos",
  },
  "ex.sort.az": { en: "A–Z", es: "A–Z" },
  "ex.sort.level": { en: "By level", es: "Por nivel" },
  "ex.tab.guide": { en: "Guide", es: "Guía" },
  "ex.tab.summary": { en: "Summary", es: "Resumen" },
  "ex.tab.rank": { en: "Rank", es: "Rango" },
  "ex.tab.history": { en: "History", es: "Historial" },
  "ex.rankLockedWhy": {
    en: "Needs your sex, age and bodyweight in Settings, and cited strength standards we have not validated yet",
    es: "Necesita tu sexo, edad y peso en Ajustes, y estándares de fuerza citados que aún no hemos validado",
  },
  "ex.rank.title": {
    en: "Rank: not shipped yet, on purpose",
    es: "Rango: aún no disponible, a propósito",
  },
  "ex.rank.body": {
    en: "Comparing you with other people needs normative data with a source we can name and check. We will not invent a percentile. Until the standards pass validation, the only honest comparison is with yourself — and that lives in History.",
    es: "Compararte con otras personas exige datos normativos con una fuente que podamos nombrar y comprobar. No vamos a inventar un percentil. Hasta que los estándares pasen la validación, la única comparación honesta es contigo mismo — y esa está en Historial.",
  },
  // Restored verbatim from HEAD (2026-10-09): the working tree had dropped
  // these while `ExerciseDetailScreen` still renders them, so the Historial tab
  // showed raw keys (`ex.history.days`) next to real data. The rest of the
  // dictionary's missing entries are a separate, larger repair (see the
  // session handoff) — nothing here was invented.
  "ex.history.days": {
    en: "{n} training days",
    es: "{n} días de entrenamiento",
  },
  "ex.history.sets": { en: "{n} working sets", es: "{n} series de trabajo" },
  "ex.history.volume": { en: "{kg} of tonnage", es: "{kg} de tonelaje" },
  "ex.history.best": { en: "Best load:", es: "Mejor carga:" },
  "ex.history.e1rm": {
    en: "estimated 1RM {kg} (Epley, not measured)",
    es: "1RM estimado {kg} (Epley, no medido)",
  },
  "ex.history.more": {
    en: "+ {n} earlier training days",
    es: "+ {n} días de entrenamiento anteriores",
  },
  "ex.history.dayVolume": {
    en: "{n} sets · {kg}",
    es: "{n} series · {kg}",
  },
  "ex.history.daySets": {
    en: "{n} sets · timed work only",
    es: "{n} series · solo trabajo con tiempo",
  },
  "ex.history.setLoad": { en: "{kg} × {reps}", es: "{kg} × {reps}" },
  "ex.history.setTime": {
    en: "held {sec} s",
    es: "{sec} s mantenidos",
  },
  "ex.history.setBodyweight": {
    en: "bodyweight",
    es: "peso corporal",
  },
  "ex.history.warmup": { en: "warm-up", es: "calentamiento" },
  "ex.history.empty": {
    en: "No sets logged for this exercise",
    es: "Sin series registradas de este ejercicio",
  },
  "ex.history.emptyHint": {
    en: "Log it once and this tab becomes the most useful one: your best set, your estimated 1RM over time and what you did the last time.",
    es: "Regístralo una vez y esta pestaña pasa a ser la más útil: tu mejor serie, tu 1RM estimado en el tiempo y lo que hiciste la última vez.",
  },
  "ex.guide.quick": { en: "Quick steps", es: "Pasos rápidos" },
  "ex.guide.setup": { en: "Setup", es: "Preparación" },
  "ex.guide.execution": { en: "Execution", es: "Ejecución" },
  "ex.guide.mistakes": { en: "Common mistakes", es: "Errores típicos" },
  "ex.guide.mistakesHint": {
    en: "Where the movement usually breaks down",
    es: "Dónde se suele romper el movimiento",
  },
  "ex.guide.safety": { en: "Safety", es: "Seguridad" },
  "ex.guide.breathing": { en: "Breathing", es: "Respiración" },
  "ex.guide.tempo": { en: "Tempo", es: "Tempo" },
  "ex.guide.effort": { en: "Effort (RIR)", es: "Esfuerzo (RIR)" },
  "ex.guide.variant": {
    en: "This variant carries its own extra cues on top of the pattern.",
    es: "Esta variante añade indicaciones propias sobre las del patrón.",
  },
  "ex.guide.provenance": {
    en: "Coaching from the shared pattern library — not generated text.",
    es: "Técnica de la biblioteca compartida por patrón — no es texto generado.",
  },
  "ex.summary.muscles": { en: "Muscles", es: "Músculos" },
  "ex.summary.equipment": { en: "Equipment", es: "Equipo" },
  "ex.summary.joint": { en: "Joint load", es: "Carga articular" },
  "ex.summary.spine": { en: "Spinal load", es: "Carga espinal" },
  "ex.summary.progression": {
    en: "Ways to progress it",
    es: "Formas de progresar",
  },

  // ── Screens still being built ─────────────────────────────────────────
  "phase.badge": { en: "Next phase", es: "Próxima fase" },
  "phase.body": {
    en: "This destination is already in the shell. Its content arrives in phase {phase} of the redesign.",
    es: "Este destino ya está en la estructura. Su contenido llega en la fase {phase} del rediseño.",
  },
  "phase.goToday": { en: "Go to Home", es: "Ir a Inicio" },
  "phase.session.1": {
    en: "The set table with the PREVIOUS column, set types and effort per set",
    es: "La tabla de series con columna ANTERIOR, tipos de serie y esfuerzo por serie",
  },
  "phase.session.2": {
    en: "A sticky rest bar with +15 s and skip, owned by the timer",
    es: "Barra de descanso fija con +15 s y saltar, gobernada por el temporizador",
  },
  "phase.session.3": {
    en: "Collapsible side rails: focus, quick guide, current log and notes",
    es: "Rails laterales plegables: enfoque, guía rápida, registro actual y notas",
  },
  "phase.progress.1": {
    en: "Muscle map painted with the volume you actually logged",
    es: "Mapa muscular pintado con el volumen que tú registras",
  },
  "phase.progress.2": {
    en: "Volume per muscle family, split into effective, complementary and accessory sets",
    es: "Volumen por familia, separando series efectivas, complementarias y accesorias",
  },
  "phase.progress.3": {
    en: "Trend chart, records and the coach's proposals as real actions",
    es: "Gráfica de tendencia, marcas y las propuestas del asistente como acciones reales",
  },
  "phase.settings.1": {
    en: "Profile: name, birth date (the age is derived), sex, height and weight",
    es: "Perfil: nombre, fecha de nacimiento (la edad se deriva), sexo, altura y peso",
  },
  "phase.settings.2": {
    en: "Goal, level, days per week, time budget and unit (kg / lb USA)",
    es: "Objetivo, nivel, días por semana, presupuesto de tiempo y unidad (kg / lb USA)",
  },
  "phase.settings.3": {
    en: "Gear inventory, coach, household network, import/export and erasing local data",
    es: "Inventario de equipo, asistente, red de casa, importar/exportar y borrar datos locales",
  },

  // ── Inicio ────────────────────────────────────────────────────────────
  "home.greeting": { en: "Hey 👋", es: "Hola 👋" },
  "home.ready": {
    en: "Today's session is ready.",
    es: "Tu entrenamiento de hoy está listo.",
  },
  "home.restDay": {
    en: "A recovery day — the plan already took it into account.",
    es: "Hoy toca recuperar. El plan ya lo tiene en cuenta.",
  },
  "home.badge.zen": { en: "ZEN", es: "ZEN" },
  "home.today": { en: "Today", es: "HOY" },
  "home.rest": { en: "Rest", es: "DESCANSO" },
  "home.hero.title": { en: "Today's session", es: "Entrenamiento de hoy" },
  "home.hero.gear": {
    en: "With the gear you have",
    es: "Con el equipo que tienes",
  },
  "home.hero.bodyweight": {
    en: "Bodyweight only",
    es: "Solo peso corporal",
  },
  "home.hero.linked": {
    en: "BodyLab linked",
    es: "BodyLab conectado",
  },
  "home.hero.cta": {
    en: "Start training",
    es: "Iniciar entrenamiento",
  },
  "home.hero.continue": {
    en: "Continue training",
    es: "Continuar entrenamiento",
  },
  // ── Inicio: the boseto's own furniture ───────────────────────────────
  "home.pill.elapsedHint": {
    en: "Counting from the first set you logged today",
    es: "Cuenta desde la primera serie que registraste hoy",
  },
  "home.last.title": { en: "Last session", es: "Última sesión" },
  "home.last.none": {
    en: "Nothing logged yet — today writes the first line.",
    es: "Aún no hay nada registrado — hoy escribes la primera línea.",
  },
  "home.last.yesterday": { en: "Yesterday", es: "Ayer" },
  "home.last.daysAgo": { en: "{n} days ago", es: "Hace {n} días" },
  "home.last.sets": { en: "sets", es: "series" },
  "home.last.volume": { en: "kg moved", es: "kg movidos" },
  "home.last.exercises": { en: "exercises", es: "ejercicios" },
  "home.next.title": { en: "Next exercise", es: "Siguiente ejercicio" },
  "home.focus.badge": { en: "ZEN MODE", es: "MODO ZEN" },
  "home.focus.title": { en: "Focus", es: "Enfócate" },
  "home.focus.body": {
    en: "Your only job right now is the next repetition.",
    es: "Tu única tarea ahora es completar la siguiente repetición.",
  },

  // ── Semana (the plan's own surface since 2026-09-30 f) ───────────────
  "week.pageTitle": { en: "The week", es: "La semana" },
  "week.pageHint": {
    en: "How {n} training days are distributed and why.",
    es: "Cómo se reparten {n} días de entrenamiento y por qué.",
  },
  "week.budget": {
    en: "{n} min per day",
    es: "{n} min por día",
  },
  "week.empty": {
    en: "No training days yet",
    es: "Aún no hay días de entreno",
  },
  "week.emptyHint": {
    en: "Set your weekly days and time budget and the plan is built again.",
    es: "Define tus días por semana y el presupuesto de tiempo y el plan se reconstruye.",
  },
  "week.planTitle": { en: "Day by day", es: "Día a día" },
  "week.planHint": {
    en: "What the planner intends for each day.",
    es: "Lo que el planificador propone para cada día.",
  },
  "week.dayDetail": {
    en: "{sets} sets · {min} min",
    es: "{sets} series · {min} min",
  },
  "week.whyTitle": { en: "Why this week", es: "Por qué esta semana" },
  "week.whyNone": {
    en: "The plan needed no adjustments this week.",
    es: "El plan no necesitó ajustes esta semana.",
  },
  "week.gear": {
    en: "{usable} catalog exercises usable with your gear, {excluded} excluded for missing equipment.",
    es: "{usable} ejercicios del catálogo usables con tu equipo, {excluded} excluidos por falta de material.",
  },
  "week.adjustBudget": { en: "Adjust budget", es: "Ajustar presupuesto" },
  "week.goToday": { en: "Go to today", es: "Ir a hoy" },
  "week.todayIndexNote": {
    en: "Day {i} of 7 · Monday-first week.",
    es: "Día {i} de 7 · semana empezando en lunes.",
  },
  "week.card.title": { en: "Week at a glance", es: "Resumen de la semana" },
  "week.card.done": { en: "Done", es: "Completado" },
  "week.card.pending": { en: "Pending", es: "Pendiente" },

  // ── Progreso ──────────────────────────────────────────────────────────
  "progress.constancy.title": { en: "Consistency", es: "Constancia" },
  "progress.constancy.hint": {
    en: "Sets logged against the plan's own target for the same window.",
    es: "Series registradas frente al objetivo del propio plan para la misma ventana.",
  },
  "progress.constancy.week": { en: "Week", es: "Semana" },
  "progress.constancy.month": { en: "Month", es: "Mes" },
  "progress.constancy.quarter": { en: "Quarter", es: "Trimestre" },
  "progress.constancy.note": {
    en: "Nice: you hit your target in {n} of the last 4 weeks.",
    es: "Vas muy bien: cumpliste tu objetivo en {n} de las últimas 4 semanas.",
  },
  "progress.constancy.noteNone": {
    en: "Log a full week and the trend line starts to mean something.",
    es: "Registra una semana completa y la tendencia empezará a decir algo.",
  },
  "progress.constancy.sets": {
    en: "{done} of {target} sets completed",
    es: "{done} de {target} series completadas",
  },
  "progress.constancy.daySets": { en: "{n} sets", es: "{n} series" },
  "progress.numbers.title": { en: "Your numbers", es: "Tus cifras" },
  "progress.numbers.sessions": { en: "Sessions", es: "Sesiones" },
  "progress.numbers.sets": { en: "Sets logged", es: "Series registradas" },
  "progress.numbers.exercises": {
    en: "Distinct exercises",
    es: "Ejercicios distintos",
  },
  "progress.numbers.days": { en: "Days trained", es: "Días entrenados" },
  "progress.numbers.records": {
    en: "{n} BodyLab records merged in",
    es: "{n} marcas de BodyLab incluidas",
  },
  "progress.body.figureFromBodyLab": {
    en: "Figure chosen from the BodyLab profile's sex.",
    es: "Figura elegida según el sexo del perfil de BodyLab.",
  },
  "progress.body.figureChosen": {
    en: "Figure chosen by you in Settings.",
    es: "Figura elegida por ti en Ajustes.",
  },
  "progress.body.figureDefault": {
    en: "No profile sex imported: this is the default drawing (change it in Settings).",
    es: "Sin sexo importado en el perfil: esta es la figura por defecto (cámbialo en Ajustes).",
  },
  "settings.section.profile": { en: "Profile", es: "Perfil" },
  "settings.section.profileHint": {
    en: "Where your data comes from and which body it draws.",
    es: "De dónde vienen tus datos y qué cuerpo dibuja.",
  },
  "settings.section.goal": {
    en: "Goal and preferences",
    es: "Objetivo y preferencias",
  },
  "settings.section.goalHint": {
    en: "Level, weekly days, time budget and units.",
    es: "Nivel, días por semana, presupuesto de tiempo y unidades.",
  },
  "settings.section.coachHint": {
    en: "Optional: a local model that only reorders what the planner already allows.",
    es: "Opcional: un modelo local que solo reordena lo que el planner ya permite.",
  },
  "settings.section.bodylabHint": {
    en: "Import the JSON BodyLab exports; nothing leaves the device.",
    es: "Importa el JSON que exporta BodyLab; nada sale del dispositivo.",
  },
  "settings.section.about": { en: "About", es: "Acerca de" },
  "settings.figure.title": { en: "Body map figure", es: "Figura del mapa" },
  "settings.figure.auto": { en: "Automatic", es: "Automática" },
  "settings.figure.male": { en: "Male", es: "Masculina" },
  "settings.figure.female": { en: "Female", es: "Femenina" },
  "settings.figure.fromBodyLab": {
    en: "Automatic: taken from the imported BodyLab profile's sex.",
    es: "Automática: tomada del sexo del perfil de BodyLab importado.",
  },
  "settings.figure.fallback": {
    en: "Automatic, but no profile sex to read: the male drawing is used by default.",
    es: "Automática, pero no hay sexo en el perfil: se usa la figura masculina por defecto.",
  },
  "settings.figure.manual": {
    en: "Chosen by hand; the imported profile does not override it.",
    es: "Elegida a mano; el perfil importado no la sobrescribe.",
  },
  "progress.periodHint": { en: "Last {n} days", es: "Últimos {n} días" },
  "progress.days": { en: "{n} d", es: "{n} d" },
  "progress.empty": {
    en: "Nothing logged yet",
    es: "Todavía no hay nada registrado",
  },
  "progress.emptyHint": {
    en: "Log one session and this screen fills itself: volume, balance, records and trend.",
    es: "Registra una sesión y esta pantalla se llena sola: volumen, equilibrio, marcas y tendencia.",
  },
  "progress.kpi.sets": { en: "Working sets", es: "Series de trabajo" },
  "progress.kpi.setsHint": {
    en: "In the last {n} days",
    es: "En los últimos {n} días",
  },
  "progress.kpi.volume": { en: "Volume", es: "Volumen" },
  "progress.kpi.volumeHint": {
    en: "Kilos moved: weight × reps",
    es: "Kilos movidos: peso × repeticiones",
  },
  "progress.kpi.perSet": { en: "kg per set", es: "kg por serie" },
  "progress.kpi.perSetHint": {
    en: "Average per working set",
    es: "Media por serie de trabajo",
  },
  "progress.kpi.days": { en: "Days trained", es: "Días entrenados" },
  "progress.kpi.consistencyHint": {
    en: "{pct} % of this week's plan",
    es: "{pct} % del plan de esta semana",
  },
  "progress.trend": { en: "General progress", es: "Progreso general" },
  "progress.peak": { en: "Peak {n} sets", es: "Máx {n} series" },
  "progress.heat.title": {
    en: "Muscle heat map",
    es: "Mapa de calor muscular",
  },
  "progress.heat.hint": {
    en: "Sets per muscle family in the period",
    es: "Series por grupo muscular en el periodo",
  },
  "progress.heat.scale": {
    en: "More intense = more work",
    es: "Más intenso = más trabajo",
  },
  "progress.heat.effective": {
    en: "Effective sets",
    es: "Series efectivas",
  },
  "progress.heat.complementary": {
    en: "Complementary sets",
    es: "Series complementarias",
  },
  "progress.heat.accessory": {
    en: "Accessory sets",
    es: "Series accesorias",
  },
  // ── Progreso: body analysis (the mockup's signature section) ────────
  "progress.body.title": { en: "Body analysis", es: "Análisis corporal" },
  "progress.body.sub": {
    en: "2D map · Volume · Balance",
    es: "Mapa 2D · Volumen · Equilibrio",
  },
  "progress.body.mapLabel": { en: "2D MAP", es: "MAPA 2D" },
  "progress.body.front": { en: "Front view", es: "Vista frontal" },
  "progress.body.back": { en: "Back view", es: "Vista posterior" },
  "progress.body.tapHint": {
    en: "Tap a zone to inspect it",
    es: "Toca una zona para inspeccionarla",
  },
  "progress.body.mapAlt": {
    en: "Front and back muscle heat map; colour follows your logged training stimulus",
    es: "Mapa de calor muscular frontal y posterior; el color sigue el estímulo registrado",
  },
  "progress.body.selectFamily": {
    en: "Inspect",
    es: "Explorar",
  },
  "progress.body.equivalentSets": {
    en: "{n} equivalent sets",
    es: "{n} series equivalentes",
  },
  "progress.body.selectedStats": {
    en: "{family} · {stimulus} equivalent sets · {sets} logged sets · {index}/100",
    es: "{family} · {stimulus} series equivalentes · {sets} series · {index}/100",
  },
  "progress.body.focusTitle": {
    en: "Anatomical focus",
    es: "Zona anatómica",
  },
  "progress.body.focus.serratus": {
    en: "Serratus anterior · rib area",
    es: "Serrato anterior · zona costal",
  },
  "progress.body.focus.rectus": {
    en: "Rectus abdominis · front",
    es: "Recto abdominal · frente",
  },
  "progress.body.focus.obliques": {
    en: "Obliques · sides",
    es: "Oblicuos · laterales",
  },
  "progress.body.focus.quadriceps": {
    en: "Quadriceps · whole group",
    es: "Cuádriceps · grupo completo",
  },
  "progress.body.exerciseTitle": {
    en: "Catalogued primary-target exercises",
    es: "Ejercicios cuyo objetivo principal indica el catálogo",
  },
  "progress.body.exerciseEvidenceNote": {
    en: "These are catalog target labels, not a measurement of your muscle activation (EMG) in a set. The heat value remains aggregated at the larger family.",
    es: "Son etiquetas de objetivo del catálogo, no una medición EMG de tu activación en una serie. El valor de calor sigue agregado por familia.",
  },
  "progress.body.deepCoreNote": {
    en: "The transversus abdominis is a deep abdominal-wall layer; this superficial drawing cannot outline it separately, so it is not given its own colored zone.",
    es: "El transverso del abdomen es una capa profunda; este dibujo superficial no permite delimitarlo por separado, así que no le asignamos una zona de color propia.",
  },
  "progress.body.quadricepsSpecificityNote": {
    en: "The catalog records quadriceps as one group, not individual heads. The display does not claim to isolate rectus femoris or either vastus.",
    es: "El catálogo registra el cuádriceps como grupo, no por cabezas. El mapa no afirma aislar el recto femoral ni los vastos por separado.",
  },
  "progress.body.noData": {
    en: "No logged work",
    es: "Sin trabajo registrado",
  },
  "progress.body.summary": {
    en: "Summary by muscle group",
    es: "Resumen por grupo muscular",
  },
  "progress.body.empty": {
    en: "Nothing logged in this period",
    es: "Nada registrado en este periodo",
  },
  "progress.body.indexHint": {
    en: "Colour compares estimated hard-set equivalents in this period: primary involvement = 1, secondary = 0.66, accessory = 0.33. The index is relative to your most-trained family, not a population norm.",
    es: "El color compara series duras equivalentes del periodo: participación principal = 1, secundaria = 0,66 y accesoria = 0,33. El índice es relativo a tu grupo más entrenado, no a una norma poblacional.",
  },
  "progress.body.schematic": {
    en: "Anatomical zones are an estimate from the exercise catalogue. This map does not measure muscle size, recovery, pain, or growth.",
    es: "Las zonas anatómicas son una aproximación basada en el catálogo de ejercicios. El mapa no mide tamaño muscular, recuperación, dolor ni crecimiento.",
  },
  "progress.body.trendUp": {
    en: "Up on the previous period",
    es: "Sube frente al periodo anterior",
  },
  "progress.body.trendDown": {
    en: "Down on the previous period",
    es: "Baja frente al periodo anterior",
  },
  "progress.body.trendFlat": {
    en: "Steady on the previous period",
    es: "Estable frente al periodo anterior",
  },
  // ── Progreso: the goal lens (2026-09-29 e) ──────────────────────────
  "progress.lens.training": {
    en: "Training",
    es: "Entrenamiento",
  },
  "progress.lens.goal": { en: "Goals", es: "Objetivos" },
  "progress.goal.source": {
    en: "Goal source",
    es: "Fuente del objetivo",
  },
  "progress.goal.measures": {
    en: "BodyLab measures",
    es: "Medidas de BodyLab",
  },
  "progress.goal.targets": { en: "My targets", es: "Mis objetivos" },
  "progress.goal.golden": {
    en: "Golden ratio",
    es: "Proporción dorada",
  },
  "progress.body.goalStats": {
    en: "{family} · {actual} cm of {goal} cm · {index}/100",
    es: "{family} · {actual} cm de {goal} cm · {index}/100",
  },
  "progress.body.goalHint": {
    en: "Colour shows how close each family is to your target circumference (100 = at target). Estimates a shape, never growth or recovery.",
    es: "El color muestra qué tan cerca está cada grupo de tu perímetro objetivo (100 = en el objetivo). Estima una forma, nunca crecimiento ni recuperación.",
  },
  "progress.goal.noMeasures": {
    en: "No BodyLab measures yet — import your BodyLab export, set your own targets, or use the golden-ratio preset.",
    es: "Aún no hay medidas de BodyLab — importa tu exportación, define tus propios objetivos o usa la proporción dorada.",
  },
  "condition.title": {
    en: "Physical condition",
    es: "Condición física",
  },
  "condition.sub": {
    en: "You vs the published average and athletic band",
    es: "Tú vs el promedio publicado y la franja atlética",
  },
  "condition.mean": { en: "Mean", es: "Media" },
  "condition.noData": {
    en: "No data — see how to measure it in BodyLab",
    es: "Sin dato — mira cómo medirlo en BodyLab",
  },
  "condition.axis.cardio": {
    en: "Cardio (Cooper 12 min)",
    es: "Cardio (Cooper 12 min)",
  },
  "condition.axis.composition": { en: "Body fat", es: "Grasa corporal" },
  "condition.axis.proportion": {
    en: "Waist-to-height",
    es: "Cintura/estatura",
  },
  "condition.axis.muscle": {
    en: "Muscle mass (FFMI)",
    es: "Masa muscular (FFMI)",
  },
  "condition.band.excellent": {
    en: "Athletic / excellent",
    es: "Atlético / excelente",
  },
  "condition.band.above": { en: "Above average", es: "Sobre el promedio" },
  "condition.band.average": { en: "Average", es: "Promedio" },
  "condition.band.below": { en: "Below average", es: "Bajo el promedio" },
  "condition.band.poor": { en: "Needs work", es: "Por mejorar" },
  "progress.goal.noWaist": {
    en: "The golden-ratio preset needs a waist: measure it in BodyLab or declare it in Ajustes → Progreso → Objetivos.",
    es: "La proporción dorada necesita una cintura: mídela en BodyLab o declárala en Ajustes → Progreso → Objetivos.",
  },
  "progress.goal.noTargets": {
    en: "You have not set any target yet — define them in Ajustes → Progreso → Objetivos.",
    es: "Aún no has definido objetivos — créalos en Ajustes → Progreso → Objetivos.",
  },
  "settings.goals.title": {
    en: "Body goals",
    es: "Objetivos corporales",
  },
  "settings.goals.hint": {
    en: "Optional circumferences in cm. They feed the goal view of the 2D map — leave a family empty and it simply has no target.",
    es: "Perímetros opcionales en cm. Alimentan la vista de objetivos del mapa 2D — deja un grupo vacío y simplemente no tiene objetivo.",
  },
  "settings.goals.waist": {
    en: "Waist (cm) — anchors the golden-ratio preset",
    es: "Cintura (cm) — ancla la proporción dorada",
  },
  "settings.goals.waistPlaceholder": { en: "e.g. 84", es: "p. ej. 84" },
  // ── Reps per set, decided by the user (2026-09-29 e) ─────────────────
  "slot.repsLabel": { en: "Reps per set", es: "Reps por serie" },
  "slot.repsMin": { en: "Min reps", es: "Reps mín" },
  "slot.repsMax": { en: "Max reps", es: "Reps máx" },
  "slot.repsCustom": { en: "yours", es: "tuyo" },
  "slot.repsReset": { en: "Reset", es: "Restablecer" },
  "slot.repsHint": {
    en: "Set your own rep range — it replaces the planner's for this exercise.",
    es: "Define tu propio rango de reps — sustituye al del plan para este ejercicio.",
  },
  "progress.band.excellent": {
    en: "Top of your range · 80–100",
    es: "Tope de tu rango · 80–100",
  },
  "progress.band.strong": {
    en: "Well covered · 60–79",
    es: "Bien cubierto · 60–79",
  },
  "progress.band.moderate": {
    en: "Moderate · 40–59",
    es: "Moderado · 40–59",
  },
  "progress.band.weak": { en: "Weak · 20–39", es: "Débil · 20–39" },
  "progress.band.veryLow": {
    en: "Very low · 0–19",
    es: "Muy bajo · 0–19",
  },
  "progress.detail.title": {
    en: "Sets per family",
    es: "Series por familia",
  },
  "progress.balance.title": { en: "Balance", es: "Equilibrio" },
  "progress.balance.most": { en: "Most trained", es: "La que más trabajas" },
  "progress.balance.least": {
    en: "Least trained",
    es: "La que menos trabajas",
  },
  "progress.balance.hint": {
    en: "If the gap grows for weeks, the planner already puts the weakest family first on the next training day.",
    es: "Si la distancia crece durante semanas, el planificador ya pone la familia más débil primero en el próximo día de entrenamiento.",
  },
  "progress.marks.title": { en: "Top lifts", es: "Mejores avances" },
  "progress.marks.count": { en: "{n} marks", es: "{n} marcas" },
  "progress.marks.empty": {
    en: "Log a set with a weight and your best lift appears here.",
    es: "Registra una serie con peso y tu mejor levantamiento aparecerá aquí.",
  },
  "progress.marks.fromBodyLab": {
    en: "from BodyLab",
    es: "desde BodyLab",
  },
  "progress.assistant.title": {
    en: "Assistant recommendations",
    es: "Recomendaciones del asistente",
  },
  "progress.assistant.empty": {
    en: "Once there is logged history, the priorities appear here.",
    es: "Cuando haya historial registrado, las prioridades aparecen aquí.",
  },
  "progress.assistant.priority": {
    en: "Prioritise {family}",
    es: "Prioriza {family}",
  },
  "progress.assistant.detail": {
    en: "{sets} sets in the last week · index {score}/100",
    es: "{sets} series en la última semana · índice {score}/100",
  },
  "progress.assistant.withBodyLab": {
    en: "Priorities come from the planner's own weakness map, informed by your BodyLab export.",
    es: "Las prioridades salen del mapa de debilidades del planificador, informado por tu export de BodyLab.",
  },
  "progress.assistant.withoutBodyLab": {
    en: "Priorities come from the planner's own map, built from your logged history. Import a BodyLab export to add body measurements.",
    es: "Las prioridades salen del mapa del planificador, construido con tu historial. Importa un export de BodyLab para añadir medidas corporales.",
  },

  // ── Ajustes ──────────────────────────────────────────────────────────
  "settings.pageHint": {
    en: "Goal, gear, assistant, data and household network — all optional.",
    es: "Objetivo, equipo, asistente, datos y red de casa — todo opcional.",
  },
  "settings.profile.linked": {
    en: "Profile linked from BodyLab",
    es: "Perfil conectado desde BodyLab",
  },
  "settings.profile.local": { en: "Local profile", es: "Perfil local" },
  "settings.profile.bodylab": {
    en: "Height, weight and composition come from the last export.",
    es: "Altura, peso y composición vienen del último export.",
  },
  "settings.profile.bodylabNone": {
    en: "No export: the app works the same with its internal catalog.",
    es: "Sin export: la app funciona igual con su catálogo interno.",
  },
  "settings.catalogNote": {
    en: "exercises in the built-in catalog",
    es: "ejercicios en el catálogo interno",
  },
  "settings.importHint": {
    en: "BodyLab's v2 export brings measurements, the weakness map and your records. Without it, TrainingLab plans from your own history alone.",
    es: "El export v2 de BodyLab aporta medidas, el mapa de debilidades y tus marcas. Sin él, TrainingLab planifica solo con tu historial.",
  },
  "settings.about.privacy": {
    en: "100 % local: no accounts, no telemetry, no background downloads.",
    es: "100 % local: sin cuentas, sin telemetría y sin descargas en segundo plano.",
  },
  "settings.about.offline": {
    en: "Everything works without a connection.",
    es: "Todo funciona sin conexión.",
  },
  "common.seeAll": { en: "See all", es: "Ver todo" },
  "session.noneHint": {
    en: "Recovery is part of the plan: the next session is already scheduled.",
    es: "Recuperar es parte del plan: la próxima sesión ya está programada.",
  },

  // ── Restored from HEAD (2026-10-09) ─────────────────────────────────────
  // The working tree had dropped these entries while the screens still
  // render them, so the UI showed raw keys (`log.nextSet` on the logging
  // button of Inicio, `home.focus.*` on the day-focus chips, `week.stress.*`
  // aside). Text is copied byte-for-byte from HEAD — nothing is invented —
  // and `tests/training/test_traininglab_i18n.test.ts` now guards the
  // dictionary against a missing key reaching the screen again.
  "autobackup.restore.missing": {
    en: "There is no safety copy to restore.",
    es: "No hay ninguna copia de seguridad que restaurar.",
  },

  // ── Sample data (2026-10-11) ────────────────────────────────────────────
  // Six weeks of believable history, generated by `lib/demo.ts`. It exists so
  // the redesigned screens can be read with data in them instead of empty, and
  // it is removable in one tap — the copy says so, because a button that adds
  // fake training history has to be honest about what it is.
  "demo.title": { en: "Sample data", es: "Datos de ejemplo" },
  "demo.hint": {
    en: "Six weeks of invented history, so the screens can be judged with data. Your own records are untouched and you can remove it again.",
    es: "Seis semanas de historial inventado, para poder juzgar las pantallas con datos. Tus registros no se tocan y puedes quitarlo después.",
  },
  "demo.load": {
    en: "Load sample data",
    es: "Cargar datos de ejemplo",
  },
  "demo.loaded": {
    en: "Sample history added: {n} sets.",
    es: "Historial de ejemplo añadido: {n} series.",
  },
  "demo.remove": {
    en: "Remove sample data",
    es: "Quitar datos de ejemplo",
  },
  "demo.removed": {
    en: "Sample history removed: {n} sets.",
    es: "Historial de ejemplo eliminado: {n} series.",
  },

  // ── Inicio, the reference port (2026-10-11) ────────────────────────────
  // Copy of the approved Inicio image. It is Spanish-first and says what the
  // thing *is* ("Equipo necesario", "Ejercicios de la sesión") rather than
  // naming the widget, because the screen's job is to be read once, standing up.
  "hoy.start": { en: "Start", es: "Empezar" },
  "hoy.today": { en: "Today's session", es: "Hoy toca" },
  "hoy.complete": { en: "Session complete", es: "Sesión completa" },
  "hoy.inProgress": { en: "In progress", es: "En curso" },
  "hoy.gear": { en: "Equipment needed", es: "Equipo necesario" },
  "hoy.gearOptional": { en: "(optional)", es: "(opcional)" },
  "hoy.sessionExercises": {
    en: "Session exercises",
    es: "Ejercicios de la sesión",
  },
  "hoy.logNew": { en: "Log sets", es: "Registrar series" },
  "hoy.addExercise": { en: "Add exercise", es: "Añadir ejercicio" },
  "hoy.fromRoutine": { en: "From my routine", es: "Desde mi rutina" },
  "hoy.sets": { en: "{n} sets", es: "{n} series" },
  "hoy.reps": { en: "reps", es: "reps" },
  "hoy.rest": { en: "Rest", es: "Descanso" },
  "hoy.quickSummary": { en: "Quick summary", es: "Resumen rápido" },
  "hoy.estDuration": { en: "Estimated duration", es: "Duración estimada" },
  "hoy.plannedVolume": { en: "Planned volume", es: "Volumen previsto" },
  "hoy.kg": { en: "kg", es: "kg" },
  "hoy.muscleGroups": { en: "Muscle groups", es: "Grupos musculares" },
  "hoy.level": { en: "Level", es: "Nivel" },
  "hoy.setsProgress": {
    en: "{done} of {total} sets logged today.",
    es: "{done} de {total} series registradas hoy.",
  },
  "hoy.volumeLogged": {
    en: "{kg} kg logged today",
    es: "{kg} kg registrados hoy",
  },
  "hoy.volumeUnknownHint": {
    en: "No recent record of these movements yet, so there is nothing to estimate from. It will fill in as you log them.",
    es: "Aún no hay registro reciente de estos movimientos, así que no hay de dónde estimar. Se rellenará según los registres.",
  },
  "hoy.yourProgress": { en: "Your progress", es: "Tu progreso" },
  "hoy.seeHistory": { en: "See history", es: "Ver historial" },
  "hoy.workoutsThisWeek": {
    en: "Workouts this week",
    es: "Entrenos esta semana",
  },
  "hoy.weekVolume": { en: "Volume (week)", es: "Volumen (semana)" },
  "hoy.avgRir": { en: "Average RIR", es: "RIR medio" },
  "hoy.coach": { en: "Your coach (AI)", es: "Tu coach (IA)" },
  "hoy.coachApplied": { en: "Applied", es: "Aplicado" },
  "hoy.coachBody": {
    en: "I can rebuild today's session from your history, the gear you own and the time you have.",
    es: "Puedo reajustar la sesión de hoy con tu historial, tu equipamiento y el tiempo disponible.",
  },
  "hoy.coachOff": {
    en: "The local coach is off. Turn it on in Settings and it can propose the session.",
    es: "El coach local está desactivado. Actívalo en Ajustes y podrá proponer la sesión.",
  },
  "hoy.ruleUsed": { en: "Rule used", es: "Regla usada" },
  "hoy.hideNotes": { en: "Hide notes", es: "Ocultar notas" },
  "hoy.moreNotes": { en: "+{n} plan notes", es: "+{n} notas del plan" },
  "hoy.reasonWeak": {
    en: "it works on {family}, your weak point",
    es: "refuerza {family}, tu punto débil",
  },
  "hoy.reasonGap": {
    en: "it is short of sets this week",
    es: "le faltan series esta semana",
  },
  "hoy.reasonNoAnthro": {
    en: "no BodyLab composition data yet, so the day is spread evenly",
    es: "aún sin datos de composición de BodyLab, así que el día se reparte parejo",
  },
  "hoy.reasonCoverage": {
    en: "basic coverage of the day's groups",
    es: "cobertura básica de los grupos del día",
  },
  "hoy.stripResume": {
    en: "Today's session is in progress",
    es: "Sesión de hoy en curso",
  },
  "hoy.stripDone": {
    en: "Today's session is finished",
    es: "Sesión de hoy terminada",
  },
  "hoy.stripPrevious": {
    en: "Your last session was {n} days ago",
    es: "Tu última sesión fue hace {n} días",
  },
  "hoy.stripToday": {
    en: "{done}/{total} sets · {exercises} exercises · {min} min planned",
    es: "{done}/{total} series · {exercises} ejercicios · {min} min previstos",
  },
  "hoy.stripLast": {
    en: "{names} · {sets} sets · {min} min",
    es: "{names} · {sets} series · {min} min",
  },
  // Same line without a duration: printed when the log's own timestamps cannot
  // support one (date-only rows, `MINUTES_TRUSTWORTHY` in `screens/TodayScreen`).
  "hoy.stripLastShort": {
    en: "{names} · {sets} sets",
    es: "{names} · {sets} series",
  },
  "home.focus.auto": { en: "Automatic", es: "Automático" },
  "home.focus.core": { en: "Core", es: "Core" },
  "home.focus.label": { en: "Focus", es: "Enfoque de hoy" },
  "home.focus.legs": { en: "Legs", es: "Pierna" },
  "home.focus.pull": { en: "Pull", es: "Tracción" },
  "home.focus.push": { en: "Push", es: "Empuje" },
  "log.bodyweight": {
    en: "Bodyweight",
    es: "Peso corporal",
  },
  "log.cardioHint": {
    en: "Aim for {n} or more",
    es: "Apunta a {n} o más",
  },
  "log.kg": { en: "kg", es: "kg" },
  "log.lb": { en: "lb", es: "lb" },
  "log.nextSet": {
    en: "Next set",
    es: "Siguiente serie",
  },
  "log.weightRepeat": {
    en: "repeats the last set",
    es: "repite la anterior",
  },
  "log.weightSuggested": {
    en: "suggested for today",
    es: "sugerido para hoy",
  },
  /* The chip's one-line label when the load moved, so a number that goes down
     never reads as "repeats the last set". The why is the line below it. */
  "log.weightDown": {
    en: "adjusted down",
    es: "ajustada a la baja",
  },
  "log.weightUp": {
    en: "one step up",
    es: "un paso más",
  },
  "progress.volumeTarget.band": {
    en: "{min}–{max} sets/week",
    es: "{min}–{max} series/semana",
  },
  "progress.volumeTarget.belowCount": {
    en: "{n} below",
    es: "{n} por debajo",
  },
  "progress.volumeTarget.caveat": {
    en: "A training-volume reference for trained adults, not medical advice. Counts direct sets only (secondary and accessory work is not credited), and says nothing about proximity to failure.",
    es: "Referencia de volumen para adultos entrenados, no consejo médico. Cuenta solo series directas (no suma el trabajo secundario ni accesorio) y no dice nada sobre la proximidad al fallo.",
  },
  "progress.volumeTarget.empty": {
    en: "No direct sets logged in the last 7 days.",
    es: "Sin series directas en los últimos 7 días.",
  },
  "progress.volumeTarget.headline": {
    en: "{inRange} of {total} groups in range",
    es: "{inRange} de {total} grupos en rango",
  },
  "progress.volumeTarget.hint": {
    en: "Direct sets per muscle group, last 7 days.",
    es: "Series directas por grupo muscular, últimos 7 días.",
  },
  "progress.volumeTarget.missing": {
    en: "{n} sets short of the minimum",
    es: "faltan {n} series para el mínimo",
  },
  "progress.volumeTarget.ok": { en: "{n} sets", es: "{n} series" },
  "progress.volumeTarget.over": {
    en: "{n} sets — above the band (diminishing returns)",
    es: "{n} series — por encima de la franja (rendimientos decrecientes)",
  },
  "progress.volumeTarget.source": {
    en: "Band from Baz-Valle 2022 (systematic review + meta-analysis, trained men 18–35); diminishing returns from Pelland 2025 (67 studies); floor from Schoenfeld 2017.",
    es: "Franja de Baz-Valle 2022 (revisión sistemática + metaanálisis, hombres entrenados 18–35); rendimientos decrecientes de Pelland 2025 (67 estudios); suelo de Schoenfeld 2017.",
  },
  "progress.volumeTarget.title": {
    en: "Volume target",
    es: "Objetivo de volumen",
  },
  "progress.volumeTarget.widerBand": {
    en: "Triceps has the wider 12–24 band: that review found high volume significantly better there (p = 0.01).",
    es: "El tríceps tiene la franja ampliada 12–24: esa revisión encontró el volumen alto claramente mejor ahí (p = 0,01).",
  },
  "progress.weekly.arrowTrend": {
    en: "{prev} → {curr}",
    es: "{prev} → {curr}",
  },
  "progress.weekly.bar": {
    en: "{week}: {kg} kg · {sets} sets",
    es: "{week}: {kg} kg · {sets} series",
  },
  "progress.weekly.disclaimer": {
    en: "Tonnage records what you lifted; on its own it proves neither hypertrophy nor strength. A set can feed more than one family (every target group it trains).",
    es: "El tonelaje registra lo que levantaste; por sí solo no demuestra hipertrofia ni fuerza. Una serie puede alimentar más de una familia (todos los grupos objetivo que entrena).",
  },
  "progress.weekly.empty": {
    en: "Nothing logged in these 8 weeks yet — the chart starts with your first working set.",
    es: "Sin registro en estas 8 semanas — el gráfico empieza con tu primera serie de trabajo.",
  },
  "progress.weekly.families": {
    en: "By family (target groups)",
    es: "Por familia (grupos objetivo)",
  },
  "progress.weekly.hint": {
    en: "Tonnage (weight × reps) of working sets, warm-ups out — 8 weeks, Monday to Sunday.",
    es: "Tonelaje (peso × repeticiones) de las series de trabajo, sin calentamientos — 8 semanas, de lunes a domingo.",
  },
  "progress.weekly.now": {
    en: "This week: {kg} kg · {sets} sets",
    es: "Esta semana: {kg} kg · {sets} series",
  },
  "progress.weekly.peak": { en: "Peak {kg} kg", es: "Máx {kg} kg" },
  "progress.weekly.title": { en: "Weekly volume", es: "Volumen semanal" },
  "progress.weekly.vsPrevious": {
    en: "vs the same days of last week",
    es: "frente a los mismos días de la semana pasada",
  },
  "slot.repsRange": {
    en: "untouched, it logs {min} — the bottom of the prescribed range",
    es: "sin tocar, registra {min}: el mínimo del rango recomendado",
  },
  "slot.repsRepeat": {
    en: "blank repeats the last set ({n})",
    es: "en blanco repite la anterior ({n})",
  },
  "symmetry.error.empty": {
    en: "That Symmetry file has no sessions.",
    es: "Ese archivo de Symmetry no tiene sesiones.",
  },
  "symmetry.error.file": {
    en: "That file is not readable JSON.",
    es: "Ese archivo no es JSON legible.",
  },
  "symmetry.error.shape": {
    en: "That file is not a Symmetry export.",
    es: "Ese archivo no es una exportación de Symmetry.",
  },
  // ── Importar historial (Ajustes) ───────────────────────────────────────────
  // The screen over the two importers that always existed in the store. Every
  // number it shows is what `planOwnerLog` / `planSymmetry` computed, so the
  // preview and the import cannot disagree.
  "import.title": {
    en: "Import history",
    es: "Importar historial",
  },
  "import.hint": {
    en: "Your corrected CSV, or the OCR'd Symmetry backup. Parsed and deduped against your log first; nothing is written until you confirm.",
    es: "Tu CSV corregido o el respaldo de Symmetry (OCR). Se analiza y se deduplica contra tu registro antes; nada se escribe hasta que confirmes.",
  },
  "import.csvLabel": {
    en: "My CSV (owner-training-log.csv)",
    es: "Mi CSV (owner-training-log.csv)",
  },
  "import.symmetryLabel": {
    en: "Symmetry backup (.json)",
    es: "Respaldo de Symmetry (.json)",
  },
  "import.filesHint": {
    en: "Choose a file to see what it would add.",
    es: "Elige un archivo para ver cuánto añadiría.",
  },
  "import.preview": {
    en: "{sets} new sets from {sessions} sessions",
    es: "{sets} series nuevas de {sessions} sesiones",
  },
  "import.previewDuplicates": {
    en: "{n} rows are already in your log (ignored)",
    es: "{n} filas ya están en tu registro (se ignoran)",
  },
  "import.previewSkipped": {
    en: "{n} rows have no catalog equivalent — ids are never invented",
    es: "{n} filas no tienen equivalente en el catálogo: nunca se inventan ids",
  },
  "import.previewNothing": {
    en: "Nothing new: your log already holds these rows.",
    es: "Nada nuevo: tu registro ya contiene estas filas.",
  },
  "import.confirm": { en: "Import", es: "Importar" },
  "symmetry.imported": {
    en: "Symmetry: {sessions} sessions and {sets} sets merged ({skipped} rows skipped — no catalog match).",
    es: "Symmetry: {sessions} sesiones y {sets} series fusionadas ({skipped} filas descartadas, sin equivalente en el catálogo).",
  },

  // ── Copy that only lived in code (2026-10-09) ──────────────────────────
  // Written for the first time here: the screens below shipped calling these
  // keys while the dictionary never had them, so they rendered raw
  // (`week.stress.title`). Where the text states a rule, the rule is the one
  // the code applies — the semi-colon in `ownerlog.error.xlsx` is the reason
  // the CSV exists (`lib/owner-log.ts` needs the warm-up and duration columns).
  "ex.exercises": { en: "exercises", es: "ejercicios" },
  "ex.difficultyHint": {
    en: "technical demand, 1 to 5: 1 is a machine you sit on, 5 is a movement that punishes the smallest mistake",
    es: "exigencia técnica, de 1 a 5: 1 es una máquina donde te sientas, 5 un movimiento que castiga el error más pequeño",
  },
  "ownerlog.imported": {
    en: "Log: {sessions} sessions and {sets} sets merged ({duplicates} duplicates skipped).",
    es: "Registro: {sessions} sesiones y {sets} series fusionadas ({duplicates} duplicadas descartadas).",
  },
  "ownerlog.error.xlsx": {
    en: "That file is the XLSX spreadsheet. Export the CSV instead — its columns carry the warm-up flag and the set duration, and nothing else is read.",
    es: "Ese archivo es la hoja XLSX. Exporta el CSV: sus columnas traen la marca de calentamiento y la duración de la serie, y no se lee nada más.",
  },
  "ownerlog.error.columns": {
    en: "The file is missing the set columns I need. Use the CSV export without renaming anything.",
    es: "Al archivo le faltan las columnas de series que necesito. Usa la exportación CSV sin renombrar nada.",
  },
  "ownerlog.error.shape": {
    en: "That is not a set log: no row could be read as a set.",
    es: "Eso no es un registro de series: ninguna fila se pudo leer como una serie.",
  },
  "ownerlog.error.empty": {
    en: "The file has no rows.",
    es: "El archivo no tiene filas.",
  },
  "ownerlog.error.file": {
    en: "The file could not be read as text.",
    es: "No se pudo leer el archivo como texto.",
  },
  "settings.goals.ratioOf": {
    en: "× {r} of the waist",
    es: "× {r} de la cintura",
  },
  "settings.goals.applyGolden": {
    en: "Fill the empty targets from the golden ratio",
    es: "Rellenar los objetivos vacíos con la proporción áurea",
  },
  "settings.goals.applyGoldenHint": {
    en: "Uses your waist and the published golden-ratio proportions. It only fills the families you left empty — a number you typed is never overwritten.",
    es: "Usa tu cintura y las proporciones publicadas de la proporción áurea. Solo rellena las familias que dejes vacías: un número que hayas escrito no se sobrescribe nunca.",
  },
  "settings.goals.applyGoldenDone": {
    en: "{n} targets filled.",
    es: "{n} objetivos rellenados.",
  },
  "settings.goals.applyGoldenNeedWaist": {
    en: "Write your waist first: the preset is a proportion over the waist.",
    es: "Escribe antes tu cintura: el ajuste es una proporción sobre la cintura.",
  },
  "settings.goals.groupTaper": {
    en: "Taper (waist · chest · back)",
    es: "Taper (cintura · pecho · espalda)",
  },
  "settings.goals.groupArms": { en: "Arms", es: "Brazos" },
  "settings.goals.groupLegs": { en: "Legs", es: "Piernas" },
  "week.customBadge": { en: "yours", es: "tuya" },
  "week.dragHandle": {
    en: "Drag to move this day",
    es: "Arrastra para mover este día",
  },
  "week.dragHint": {
    en: "Drag one day onto another to swap them, or focus the grip and use ← / →.",
    es: "Arrastra un día sobre otro para intercambiarlos, o enfoca el asa y usa ← / →.",
  },
  "week.swapDone": {
    en: "Swapped {a} and {b}.",
    es: "Intercambiados {a} y {b}.",
  },
  "week.swapBack": {
    en: "Undo the swap",
    es: "Deshacer el intercambio",
  },
  "week.edit": { en: "Edit", es: "Editar" },
  "week.editing": { en: "Editing {day}", es: "Editando {day}" },
  "week.editHint": {
    en: "Your day, laid over the plan: regenerating the week never rewrites it. Pick train or rest, and the families you want.",
    es: "Tu día, por encima del plan: regenerar la semana nunca lo reescribe. Elige entrenar o descansar, y las familias que quieras.",
  },
  "week.kindTrain": { en: "Train", es: "Entrenar" },
  "week.kindRest": { en: "Rest", es: "Descansar" },
  "week.pickFamilies": { en: "Pick the families", es: "Elige familias" },
  "week.estimated": {
    en: "≈ {sets} working sets, inside your {min} min budget",
    es: "≈ {sets} series de trabajo, dentro de tus {min} min",
  },
  "week.restoreAuto": {
    en: "Back to the planner's day",
    es: "Volver al día del planificador",
  },
  "week.stress.title": {
    en: "Estimated stress of the week",
    es: "Estrés estimado de la semana",
  },
  "week.stress.hint": {
    en: "Estimated from volume, joint load, how packed the days are and how long they run — your own design included.",
    es: "Estimado desde el volumen, la carga articular, lo juntos que estén los días y su duración — tu diseño incluido.",
  },
  "week.stress.band.low": { en: "low", es: "bajo" },
  "week.stress.band.moderate": { en: "moderate", es: "moderado" },
  "week.stress.band.high": { en: "high", es: "alto" },
  "week.stress.band.excessive": { en: "excessive", es: "excesivo" },
  "week.stress.day": { en: "Day stress", es: "Estrés del día" },
  "week.stress.score": { en: "{s}/10", es: "{s}/10" },
  "week.stress.weekScore": {
    en: "Week stress {score}/10 · {band}",
    es: "Estrés semanal {score}/10 · {band}",
  },
  "week.stress.noDays": {
    en: "No training days yet: mark at least one and this card estimates the week's load.",
    es: "Sin días de entrenamiento todavía: marca al menos uno y esta tarjeta estimará la carga de la semana.",
  },
  "week.stress.ok": {
    en: "No warnings: volume, density and rest are consistent.",
    es: "Sin avisos: volumen, densidad y descanso son coherentes.",
  },
  "week.stress.noRest": {
    en: "Seven training days in a row, with no rest day at all.",
    es: "Siete días entrenando seguidos, sin ningún día de descanso.",
  },
  "week.stress.denseDay": {
    en: "Day {i} trains {n} families at once — consider splitting it.",
    es: "El día {i} entrena {n} familias de golpe: considera dividirlo.",
  },
  "week.stress.backToBack": {
    en: "Days {i} and the next one touch: no rest between them.",
    es: "Los días {i} y el siguiente van pegados: sin descanso entre ellos.",
  },
  "week.stress.familyOver": {
    en: "{fam} reaches {sets} sets this week, above its band.",
    es: "{fam} acumula {sets} series esta semana, por encima de su franja.",
  },
  "week.stress.familyZero": {
    en: "Not scheduled this week: {fams}",
    es: "Sin programar esta semana: {fams}",
  },

  // ── MCP action channel: the local agents' audit trail (Ajustes) ─────────
  "settings.mcp.title": { en: "Agent actions", es: "Acciones de agentes" },
  "settings.mcp.hint": {
    en: "What the local models (Buffy, Codex, llama.cpp…) asked this app to do. Each request is validated with the same rules as the interface, applied by the app itself, and can be undone here.",
    es: "Lo que los modelos locales (Buffy, Codex, llama.cpp…) han pedido hacer en esta app. Cada petición se valida con las mismas reglas que la interfaz, la aplica la propia app y aquí puedes deshacerla.",
  },
  "settings.mcp.empty": {
    en: "No agent has asked for anything yet.",
    es: "Ningún agente ha pedido nada todavía.",
  },
  "settings.mcp.desktopOnly": {
    en: "The action channel only exists in the desktop app.",
    es: "El canal de acciones solo existe en la app de escritorio.",
  },
  "settings.mcp.applied": { en: "Applied", es: "Aplicada" },
  "settings.mcp.rejected": { en: "Rejected", es: "Rechazada" },
  "settings.mcp.undone": { en: "Undone", es: "Deshecha" },
  "settings.mcp.undo": { en: "Undo", es: "Deshacer" },
  "settings.mcp.requestedBy": {
    en: "requested by {o}",
    es: "pedida por {o}",
  },
  "settings.mcp.rule": { en: "rule: {r}", es: "regla: {r}" },

  /* ── Entrenamiento (mockup 02): the day's queue ───────────────────────── */
  "ent.title": { en: "Today\u2019s training", es: "Entrenamiento del día" },
  "ent.sub": {
    en: "{minutes} min · {exercises} exercises · {sets} sets",
    es: "{minutes} min · {exercises} ejercicios · {sets} series",
  },
  "ent.rest": { en: "Rest day", es: "Día de descanso" },
  "ent.restHint": {
    en: "The planner scheduled no work for today. If you want a session anyway, pick a focus in Today or author the day in Week.",
    es: "El planificador no puso trabajo para hoy. Si quieres entrenar igual, elige un enfoque en Hoy o diseña el día en Semana.",
  },
  "ent.goWeek": { en: "Open the week", es: "Abrir la semana" },
  "ent.view.mine": { en: "My order", es: "Mi orden" },
  "ent.view.gear": { en: "By equipment", es: "Por equipamiento" },
  "ent.view.muscle": { en: "By muscle", es: "Por músculo" },
  "ent.row.start": { en: "Start", es: "Empezar" },
  "ent.row.up": { en: "Move up", es: "Subir" },
  "ent.row.down": { en: "Move down", es: "Bajar" },
  "ent.row.swap": { en: "Change", es: "Cambiar" },
  "ent.row.remove": { en: "Take out of today", es: "Quitar de hoy" },
  "ent.row.restore": { en: "Put back", es: "Volver a poner" },
  "ent.row.out": { en: "Out of today", es: "Fuera de hoy" },
  "ent.row.added": { en: "Added by you", es: "Añadido por ti" },
  "ent.row.noSwap": {
    en: "No alternative with your equipment shares the pattern and the load style.",
    es: "Ninguna alternativa con tu equipo comparte el patrón y el tipo de carga.",
  },
  "ent.row.cancel": { en: "Cancel", es: "Cancelar" },
  "ent.order.moved": {
    en: "Moved to position {n} of {total}.",
    es: "Movido a la posición {n} de {total}.",
  },
  "ent.order.reset": {
    en: "Back to the plan\u2019s order",
    es: "Volver al orden del plan",
  },
  "ent.restSec": { en: "{s} s rest", es: "{s} s de descanso" },
  "ent.bodyweight": { en: "Bodyweight", es: "Peso corporal" },
  "ent.groupCount": { en: "{n} exercises", es: "{n} ejercicios" },
  "ent.bar": {
    en: "{minutes} min planned of {budget}",
    es: "{minutes} min planificados de {budget}",
  },
  "ent.gear.title": {
    en: "Grouped by equipment",
    es: "Agrupado por equipamiento",
  },
  "ent.gear.hint": {
    en: "To know where to start when a machine is taken.",
    es: "Para saber dónde empezar cuando algo está ocupado.",
  },
  "ent.gear.busy": {
    en: "If the {gear} is taken, start with the {exercise}: it does not need it.",
    es: "Si el {gear} está ocupado, empieza por {exercise}: no lo necesita.",
  },
  "ent.fromRoutine": {
    en: "From my routine",
    es: "Desde mi rutina",
  },
  "ent.add.title": { en: "Add several", es: "Añadir varios" },
  "ent.add.available": { en: "{n} available", es: "{n} disponibles" },
  "ent.add.hint": {
    en: "Pick several exercises and add them at once with one common prescription.",
    es: "Selecciona varios ejercicios y agrégalos de una vez con una prescripción común.",
  },
  "ent.add.search": { en: "Search exercise", es: "Buscar ejercicio" },
  "ent.add.empty": {
    en: "Nothing to add with your equipment — or everything is already in today\u2019s session.",
    es: "Nada que añadir con tu equipo — o todo está ya en la sesión de hoy.",
  },
  "ent.add.selectAll": { en: "Select all ({n})", es: "Seleccionar todo ({n})" },
  "ent.add.showing": {
    en: "Showing {shown} of {total} — search to narrow down.",
    es: "Mostrando {shown} de {total} — busca para acotar.",
  },
  "ent.add.applyTo": {
    en: "Apply to the {n} selected",
    es: "Aplicar a los {n} seleccionados",
  },
  "ent.add.apply": { en: "Add to today", es: "Añadir a hoy" },
  "ent.add.applied": { en: "{n} added to today", es: "{n} añadidos a hoy" },
  "ent.add.none": {
    en: "Nothing was added — those exercises are already in today.",
    es: "No se añadió nada — esos ejercicios ya están en hoy.",
  },
  "ent.fields.sets": { en: "Sets", es: "Series" },
  "ent.fields.reps": { en: "Reps", es: "Reps" },
  "ent.fields.rest": { en: "Rest", es: "Descanso" },
  "ent.why.title": { en: "Why these?", es: "¿Por qué estos?" },
  "ent.why.hint": {
    en: "The system builds this selection from:",
    es: "Esta selección la hace el sistema con base en:",
  },
  "ent.why.goal": { en: "Your goals", es: "Tus objetivos" },
  "ent.why.level": { en: "Your level", es: "Tu nivel" },
  "ent.why.gear": { en: "Your availability", es: "Tu disponibilidad" },
  "ent.why.noGear": {
    en: "no equipment declared",
    es: "sin equipamiento declarado",
  },
  "ent.why.budget": { en: "Time window", es: "Ventana de tiempo" },
  "ent.why.budgetLine": {
    en: "{n} min budget · {planned} min planned",
    es: "{n} min de presupuesto · {planned} min planificados",
  },
  "ent.why.recovery": { en: "Recovery window", es: "Ventana de recuperación" },
  "ent.why.recoveryNone": {
    en: "No family is still recovering.",
    es: "Ninguna familia sigue en recuperación.",
  },
  "ent.why.plan": {
    en: "What the plan itself says",
    es: "Lo que dice el plan",
  },
  "ent.why.numbers": { en: "In numbers", es: "En números" },
  "ent.why.exercises": { en: "Exercises", es: "Ejercicios" },
  "ent.why.sets": { en: "Total sets", es: "Series totales" },
  "ent.why.minutes": { en: "Estimated duration", es: "Duración estimada" },

  /* ── Rutinas (mockup 06): the user's own templates ────────────────────── */
  "ru.title": { en: "Routines", es: "Rutinas" },
  "ru.sub": {
    en: "Your own templates, editable: save today's session or build one from scratch.",
    es: "Plantillas tuyas, editables: guarda el entrenamiento de hoy o crea una desde cero.",
  },
  "ru.search": {
    en: "Search by name, exercise or muscle…",
    es: "Buscar por nombre, ejercicio o músculo…",
  },
  "ru.create": { en: "Create routine", es: "Crear rutina" },
  "ru.count": { en: "{n} routines", es: "{n} rutinas" },
  "ru.countOne": { en: "1 routine", es: "1 rutina" },
  "ru.search.empty": {
    en: "No routine matches “{q}”.",
    es: "Ninguna rutina coincide con «{q}».",
  },
  "ru.empty.title": { en: "No routines yet", es: "Todavía no tienes rutinas" },
  "ru.empty.body": {
    en: "A routine is your own template: the exercises, their sets and their rest, ready to pour into any day.",
    es: "Una rutina es una plantilla tuya: los ejercicios, sus series y su descanso, listos para volcar en cualquier día.",
  },
  "ru.empty.fromToday": {
    en: "Save today's training",
    es: "Guardar el entrenamiento de hoy",
  },
  "ru.empty.fromTodayNone": {
    en: "Today has no exercises to save yet.",
    es: "Hoy no hay ejercicios que guardar todavía.",
  },
  "ru.empty.blank": { en: "Start from scratch", es: "Crear desde cero" },
  "ru.fromTodayName": {
    en: "Training of {date}",
    es: "Entrenamiento del {date}",
  },
  "ru.copySuffix": { en: "copy", es: "copia" },
  "ru.cell.exercises": { en: "exercises", es: "ejercicios" },
  "ru.cell.sets": { en: "sets", es: "series" },
  "ru.cell.minutes": { en: "min", es: "min" },
  "ru.cell.families": { en: "muscle groups", es: "grupos" },
  "ru.meta": {
    en: "{exercises} exercises · {sets} sets · ~{minutes} min",
    es: "{exercises} ejercicios · {sets} series · ~{minutes} min",
  },
  "ru.metaOne": {
    en: "1 exercise · {sets} sets · ~{minutes} min",
    es: "1 ejercicio · {sets} series · ~{minutes} min",
  },
  "ru.updated": { en: "Updated {date}", es: "Actualizada el {date}" },
  "ru.card.use": { en: "Use today", es: "Usar hoy" },
  "ru.card.view": { en: "View routine", es: "Ver rutina" },
  "ru.detail.overview": { en: "Overview", es: "Vista general" },
  "ru.detail.exercises": {
    en: "Routine exercises ({n})",
    es: "Ejercicios de la rutina ({n})",
  },
  "ru.detail.edit": { en: "Edit routine", es: "Editar rutina" },
  "ru.detail.duplicate": { en: "Duplicate", es: "Duplicar" },
  "ru.detail.delete": { en: "Delete", es: "Eliminar" },
  "ru.detail.deleteConfirm": {
    en: "Delete “{name}”? This cannot be undone.",
    es: "¿Eliminar «{name}»? Esta acción no se puede deshacer.",
  },
  "ru.detail.deleteYes": { en: "Yes, delete", es: "Sí, eliminar" },
  "ru.detail.added": {
    en: "{n} added to today's training",
    es: "{n} añadidos al entrenamiento de hoy",
  },
  "ru.detail.addedOne": {
    en: "1 added to today's training",
    es: "1 añadido al entrenamiento de hoy",
  },
  "ru.detail.none": {
    en: "They were all already in today's training.",
    es: "Ya estaban todos en el entrenamiento de hoy.",
  },
  "ru.detail.duplicated": {
    en: "Duplicated as “{name}”.",
    es: "Duplicada como «{name}».",
  },
  "ru.edit.new": { en: "New routine", es: "Nueva rutina" },
  "ru.edit.name": { en: "Name", es: "Nombre" },
  "ru.edit.namePlaceholder": {
    en: "Leg day, push day…",
    es: "Día de pierna, empuje…",
  },
  "ru.edit.notes": { en: "Notes (optional)", es: "Notas (opcional)" },
  "ru.edit.notesPlaceholder": {
    en: "How you use it, with what weight, what to skip…",
    es: "Cómo la usas, con qué peso, qué evitar…",
  },
  "ru.edit.items": { en: "Exercises ({n})", es: "Ejercicios ({n})" },
  "ru.edit.empty": {
    en: "Add the first exercise with the search box.",
    es: "Añade el primer ejercicio con el buscador.",
  },
  "ru.edit.search": {
    en: "Search the catalogue…",
    es: "Buscar en el catálogo…",
  },
  "ru.edit.noResults": {
    en: "No exercise matches.",
    es: "Ningún ejercicio coincide.",
  },
  "ru.edit.already": {
    en: "Already in the routine",
    es: "Ya está en la rutina",
  },
  "ru.edit.sets": { en: "Sets", es: "Series" },
  "ru.edit.reps": { en: "Reps", es: "Reps" },
  "ru.edit.rest": { en: "Rest", es: "Descanso" },
  "ru.edit.rir": { en: "RIR", es: "RIR" },
  "ru.edit.up": { en: "Move up", es: "Subir" },
  "ru.edit.down": { en: "Move down", es: "Bajar" },
  "ru.edit.remove": { en: "Remove", es: "Quitar" },
  "ru.edit.save": { en: "Save routine", es: "Guardar rutina" },
  "ru.edit.cancel": { en: "Cancel", es: "Cancelar" },
  "ru.edit.invalid": {
    en: "Give it a name and add at least one exercise.",
    es: "Ponle un nombre y añade al menos un ejercicio.",
  },
};

/**
 * Every key the dictionary defines.
 *
 * Exists for the missing-copy guard in `tests/training/test_traininglab_i18n.ts`:
 * `t()` silently falls back to the key itself, so an entry that is used but
 * never written reaches the screen as `week.stress.title` and nothing (not
 * TypeScript, not lint) fails. The test walks the app source and asserts every
 * key it can see is in here.
 */
export function translationKeys(): string[] {
  return Object.keys(DICT);
}

export function t(key: string): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[current] ?? entry.en;
}

export function tInterp(
  key: string,
  vars: Record<string, string | number>,
): string {
  let s = t(key);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return s;
}
