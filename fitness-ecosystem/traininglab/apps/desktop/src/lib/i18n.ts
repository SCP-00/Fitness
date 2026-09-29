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
  "shared.lastSync": { en: "Last sync: {when}", es: "Última sincronización: {when}" },
  "shared.badUrl": {
    en: "The address must look like http://192.168.1.7:8090",
    es: "La dirección debe ser del tipo http://192.168.1.7:8090",
  },
  "shared.needName": { en: "Type a name first", es: "Escribe un nombre primero" },
  "shared.unreachable": {
    en: "No server answered. Is it running with --shared?",
    es: "Ningún servidor respondió. ¿Está arrancado con --shared?",
  },
  "shared.serverError": { en: "The server refused the request", es: "El servidor rechazó la petición" },
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
  "common.cancel": { en: "Cancel", es: "Cancelar" },
  "common.close": { en: "Close", es: "Cerrar" },
  "common.save": { en: "Save", es: "Guardar" },
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
