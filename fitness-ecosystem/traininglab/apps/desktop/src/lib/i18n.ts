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
  "zen.guide": { en: "How to do it", es: "Cómo hacerlo" },
  "zen.log": { en: "Set log", es: "Registro de series" },
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
  "autobackup.restore.title": {
    en: "We found your log in a safety copy",
    es: "Encontramos tu historial en una copia de seguridad",
  },
  "autobackup.restore.body": {
    en: "The app opened with an empty log, but a copy from {date} has {sets} sets and {sessions} sessions. Restoring merges them back in; nothing you log from now on is lost.",
    es: "La app abrió con el historial vacío, pero una copia del {date} tiene {sets} series y {sessions} sesiones. Al restaurar se fusionan; nada de lo que registres desde ahora se pierde.",
  },
  "autobackup.restore.action": {
    en: "Restore my log",
    es: "Restaurar mi historial",
  },
  "autobackup.restore.missing": {
    en: "There is no safety copy to restore.",
    es: "No hay ninguna copia de seguridad que restaurar.",
  },
  "autobackup.where": {
    en: "Automatic copies are written outside the app's own storage, so an update cannot take them away.",
    es: "Las copias automáticas se escriben fuera del almacenamiento de la app, así que una actualización no puede quitarlas.",
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
  "symmetry.import": {
    en: "Import Symmetry history",
    es: "Importar historial de Symmetry",
  },
  "symmetry.hint": {
    en: "Turns the Symmetry OCR JSON (sessions, warm-ups, timed holds) into your log. Importing the same file twice changes nothing.",
    es: "Convierte el JSON OCR de Symmetry (sesiones, calentamientos, series con tiempo) en tu registro. Importar el mismo archivo dos veces no cambia nada.",
  },
  "symmetry.imported": {
    en: "Symmetry: {sessions} sessions and {sets} sets merged ({skipped} rows skipped — no catalog match).",
    es: "Symmetry: {sessions} sesiones y {sets} series fusionadas ({skipped} filas descartadas, sin equivalente en el catálogo).",
  },
  "symmetry.error.file": {
    en: "That file is not readable JSON.",
    es: "Ese archivo no es JSON legible.",
  },
  "symmetry.error.shape": {
    en: "That file is not a Symmetry export.",
    es: "Ese archivo no es una exportación de Symmetry.",
  },
  "symmetry.error.empty": {
    en: "That Symmetry file has no sessions.",
    es: "Ese archivo de Symmetry no tiene sesiones.",
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

  // ── Rest timer ────────────────────────────────────────────────────────────
  "timer.rest": { en: "Rest", es: "Descanso" },
  "timer.skip": { en: "Skip", es: "Saltar" },
  "timer.plus15": { en: "+15s", es: "+15s" },

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

  // ── Shell / navigation ────────────────────────────────────────────────
  "nav.label": { en: "Main navigation", es: "Navegación principal" },
  "nav.today": { en: "Home", es: "Inicio" },
  "nav.exercises": { en: "Exercises", es: "Ejercicios" },
  "nav.week": { en: "Week", es: "Semana" },
  "nav.session": { en: "Train", es: "Entrenar" },
  "nav.progress": { en: "Progress", es: "Progreso" },
  "nav.settings": { en: "Settings", es: "Ajustes" },
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
  "ex.history.empty": {
    en: "No sets logged for this exercise",
    es: "Sin series registradas de este ejercicio",
  },
  "ex.history.days": { en: "{n} training days", es: "{n} días de entrenamiento" },
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
  "progress.weekly.title": { en: "Weekly volume", es: "Volumen semanal" },
  "progress.weekly.hint": {
    en: "Tonnage (weight × reps) of working sets, warm-ups out — 8 weeks, Monday to Sunday.",
    es: "Tonelaje (peso × repeticiones) de las series de trabajo, sin calentamientos — 8 semanas, de lunes a domingo.",
  },
  "progress.weekly.now": {
    en: "This week: {kg} kg · {sets} sets",
    es: "Esta semana: {kg} kg · {sets} series",
  },
  "progress.weekly.vsPrevious": {
    en: "vs the same days of last week",
    es: "frente a los mismos días de la semana pasada",
  },
  "progress.weekly.arrowTrend": { en: "{prev} → {curr}", es: "{prev} → {curr}" },
  "progress.weekly.bar": {
    en: "{week}: {kg} kg · {sets} sets",
    es: "{week}: {kg} kg · {sets} series",
  },
  "progress.weekly.peak": { en: "Peak {kg} kg", es: "Máx {kg} kg" },
  "progress.weekly.families": {
    en: "By family (target groups)",
    es: "Por familia (grupos objetivo)",
  },
  "progress.weekly.empty": {
    en: "Nothing logged in these 8 weeks yet — the chart starts with your first working set.",
    es: "Sin registro en estas 8 semanas — el gráfico empieza con tu primera serie de trabajo.",
  },
  "progress.weekly.disclaimer": {
    en: "Tonnage records what you lifted; on its own it proves neither hypertrophy nor strength. A set can feed more than one family (every target group it trains).",
    es: "El tonelaje registra lo que levantaste; por sí solo no demuestra hipertrofia ni fuerza. Una serie puede alimentar más de una familia (todos los grupos objetivo que entrena).",
  },
  "progress.volumeTarget.title": { en: "Volume target", es: "Objetivo de volumen" },
  "progress.volumeTarget.hint": {
    en: "Direct sets per muscle group, last 7 days.",
    es: "Series directas por grupo muscular, últimos 7 días.",
  },
  "progress.volumeTarget.band": {
    en: "{min}–{max} sets/week",
    es: "{min}–{max} series/semana",
  },
  "progress.volumeTarget.headline": {
    en: "{inRange} of {total} groups in range",
    es: "{inRange} de {total} grupos en rango",
  },
  "progress.volumeTarget.belowCount": {
    en: "{n} below",
    es: "{n} por debajo",
  },
  "progress.volumeTarget.missing": {
    en: "{n} sets short of the minimum",
    es: "faltan {n} series para el mínimo",
  },
  "progress.volumeTarget.over": {
    en: "{n} sets — above the band (diminishing returns)",
    es: "{n} series — por encima de la franja (rendimientos decrecientes)",
  },
  "progress.volumeTarget.ok": { en: "{n} sets", es: "{n} series" },
  "progress.volumeTarget.empty": {
    en: "No direct sets logged in the last 7 days.",
    es: "Sin series directas en los últimos 7 días.",
  },
  "progress.volumeTarget.source": {
    en: "Band from Baz-Valle 2022 (systematic review + meta-analysis, trained men 18–35); diminishing returns from Pelland 2025 (67 studies); floor from Schoenfeld 2017.",
    es: "Franja de Baz-Valle 2022 (revisión sistemática + metaanálisis, hombres entrenados 18–35); rendimientos decrecientes de Pelland 2025 (67 estudios); suelo de Schoenfeld 2017.",
  },
  "progress.volumeTarget.widerBand": {
    en: "Triceps has the wider 12–24 band: that review found high volume significantly better there (p = 0.01).",
    es: "El tríceps tiene la franja ampliada 12–24: esa revisión encontró el volumen alto claramente mejor ahí (p = 0,01).",
  },
  "progress.volumeTarget.caveat": {
    en: "A training-volume reference for trained adults, not medical advice. Counts direct sets only (secondary and accessory work is not credited), and says nothing about proximity to failure.",
    es: "Referencia de volumen para adultos entrenados, no consejo médico. Cuenta solo series directas (no suma el trabajo secundario ni accesorio) y no dice nada sobre la proximidad al fallo.",
  },
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
  "progress.body.subGoal": {
    en: "2D map · Anthropometric goal proximity",
    es: "Mapa 2D · Proximidad a objetivos antropométricos",
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
  "slot.repsRepeat": {
    en: "blank repeats the last set ({n})",
    es: "en blanco repite la anterior ({n})",
  },
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
};

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
