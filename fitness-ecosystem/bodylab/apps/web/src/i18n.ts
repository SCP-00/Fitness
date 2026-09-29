/**
 * i18n — Internationalization (EN/ES)
 *
 * Simple translation system for BodyLab.
 * All user-facing strings go through this module.
 *
 * Usage:
 *   import { t } from '../i18n';
 *   t('settings.title') // → 'Settings' or 'Ajustes'
 *
 * @module i18n
 */

import type { Language } from "./lib/types";

let currentLanguage: Language = "en";

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

// ============================================================================
// Translation Dictionary
// ============================================================================

const translations: Record<string, { en: string; es: string }> = {
  // ── Overview ──
  "overview.title": { en: "Overview", es: "Resumen" },
  "overview.goodMorning": { en: "Good morning", es: "Buenos días" },
  "overview.goodAfternoon": { en: "Good afternoon", es: "Buenas tardes" },
  "overview.goodEvening": { en: "Good evening", es: "Buenas noches" },
  "overview.latestAssessment": {
    en: "Your latest assessment",
    es: "Tu último análisis",
  },
  "overview.measurementsCount": {
    en: "{n} measurements",
    es: "{n} mediciones",
  },
  "overview.missingMeasurements": {
    en: "{n} measurements missing",
    es: "{n} mediciones faltantes",
  },
  "overview.bodyStatus": { en: "Body Status", es: "Estado del Cuerpo" },
  "overview.recentChanges": { en: "Recent Changes", es: "Cambios Recientes" },
  "overview.noData": { en: "No measurements yet", es: "Sin mediciones aún" },
  "overview.startMeasuring": { en: "Start measuring", es: "Comenzar a medir" },
  "overview.exploreBody": { en: "Explore body", es: "Explorar cuerpo" },
  "overview.viewProgress": { en: "View progress", es: "Ver progreso" },
  "overview.saveSnapshot": { en: "Save snapshot", es: "Guardar instantánea" },

  // ── Measure ──
  "measure.title": { en: "Measure", es: "Medir" },
  "measure.subtitle": {
    en: "Record your body measurements",
    es: "Registra tus medidas corporales",
  },
  "measure.session": { en: "Measurement Session", es: "Sesión de Medición" },
  "measure.newSession": { en: "New session", es: "Nueva sesión" },
  "measure.continue": { en: "Continue", es: "Continuar" },
  "measure.save": { en: "Save session", es: "Guardar sesión" },
  "measure.saved": { en: "Session saved", es: "Sesión guardada" },
  "measure.previous": { en: "Previous", es: "Anterior" },
  "measure.next": { en: "Next", es: "Siguiente" },
  "measure.done": { en: "Done", es: "Listo" },
  "measure.of": { en: "{current} of {total}", es: "{current} de {total}" },
  "measure.condition": { en: "Condition", es: "Condición" },
  "measure.morning": { en: "Morning", es: "Mañana" },
  "measure.afterTraining": { en: "After training", es: "Después de entrenar" },
  "measure.evening": { en: "Evening", es: "Noche" },
  "measure.other": { en: "Other", es: "Otro" },
  "measure.notes": { en: "Notes", es: "Notas" },
  "measure.startDate": { en: "Start measuring", es: "Comenzar a medir" },
  "measure.cm": { en: "cm", es: "cm" },
  "measure.kg": { en: "kg", es: "kg" },

  // ── Measurements ──
  "measurements.title": { en: "Measurements", es: "Mediciones" },
  "measurements.subtitle": {
    en: "Your measurement history",
    es: "Tu historial de mediciones",
  },
  "measurements.circumference": { en: "Circumference", es: "Circunferencia" },
  "measurements.composition": { en: "Composition", es: "Composición" },
  "measurements.history": { en: "History", es: "Historial" },
  "measurements.noData": {
    en: "No measurements recorded",
    es: "Sin mediciones registradas",
  },
  "measurements.addMeasurement": {
    en: "Add measurement",
    es: "Agregar medición",
  },

  // ── Body ──
  "body.title": { en: "Body", es: "Cuerpo" },
  "body.subtitle": {
    en: "Explore your body composition",
    es: "Explora tu composición corporal",
  },
  "body.frontView": { en: "Front", es: "Frontal" },
  "body.backView": { en: "Back", es: "Posterior" },
  "body.clickToInspect": {
    en: "Click a muscle to inspect",
    es: "Haz clic en un músculo para inspeccionar",
  },
  "body.colorLegend": { en: "Color Legend", es: "Leyenda de Colores" },
  "body.front": { en: "Front", es: "Frontal" },
  "body.back": { en: "Back", es: "Posterior" },
  "body.allMuscles": { en: "All Muscles", es: "Todos los Músculos" },
  "body.optimal": { en: "Optimal", es: "Óptimo" },
  "body.near": { en: "Near reference", es: "Cerca de referencia" },
  "body.moderate": { en: "Moderate", es: "Moderado" },
  "body.far": { en: "Far from reference", es: "Lejos de referencia" },
  "body.score": { en: "Score", es: "Puntuación" },
  "body.reference": { en: "Reference", es: "Referencia" },
  "body.current": { en: "Current", es: "Actual" },
  "body.previous": { en: "Previous", es: "Anterior" },
  "body.exercises": { en: "Exercises", es: "Ejercicios" },
  "body.anatomy": { en: "Anatomy", es: "Anatomía" },
  "body.guide": { en: "Measurement Guide", es: "Guía de Medición" },
  "body.history": { en: "History", es: "Historial" },
  "body.trainingVolume": {
    en: "Training Volume",
    es: "Volumen de Entrenamiento",
  },
  "body.noData": {
    en: "No data for this muscle",
    es: "Sin datos para este músculo",
  },

  // ── Progress ──
  "progress.title": { en: "Progress", es: "Progreso" },
  "progress.subtitle": {
    en: "Track your changes over time",
    es: "Sigue tus cambios a lo largo del tiempo",
  },
  "progress.timeline": { en: "Timeline", es: "Línea de Tiempo" },
  "progress.current": { en: "Current", es: "Actual" },
  "progress.compare": { en: "Compare", es: "Comparar" },
  "progress.history": { en: "History", es: "Historial" },
  "progress.whatChanged": { en: "What Changed?", es: "¿Qué Cambió?" },
  "progress.noData": {
    en: "No progress data yet",
    es: "Sin datos de progreso aún",
  },
  "progress.saveSnapshot": {
    en: "Save your first snapshot",
    es: "Guarda tu primera instantánea",
  },
  "progress.snapshotA": { en: "Snapshot A", es: "Instantánea A" },
  "progress.snapshotB": { en: "Snapshot B", es: "Instantánea B" },

  // ── References ──
  "reference.title": { en: "Reference", es: "Referencia" },
  "reference.subtitle": {
    en: "Your reference profile",
    es: "Tu perfil de referencia",
  },
  "reference.current": { en: "Current reference", es: "Referencia actual" },
  "reference.available": {
    en: "Available references",
    es: "Referencias disponibles",
  },
  "reference.change": { en: "Change reference", es: "Cambiar referencia" },
  "reference.health": { en: "Health", es: "Salud" },
  "reference.anthropometric": { en: "Anthropometric", es: "Antropométrica" },
  "reference.custom": { en: "Custom", es: "Personalizada" },

  // ── Data ──
  "data.title": { en: "Data", es: "Datos" },
  "data.subtitle": {
    en: "Your data stays on this device",
    es: "Tus datos permanecen en este dispositivo",
  },
  "data.backup": { en: "Backup", es: "Copia de Seguridad" },
  "data.restore": { en: "Restore", es: "Restaurar" },
  "data.export": { en: "Export", es: "Exportar" },
  "data.import": { en: "Import", es: "Importar" },
  "data.exportJSON": { en: "Export JSON", es: "Exportar JSON" },
  "data.exportCSV": { en: "Export CSV", es: "Exportar CSV" },
  "data.exportBundle": {
    en: "Export complete backup",
    es: "Exportar copia completa",
  },
  "data.importBundle": { en: "Import backup", es: "Importar copia" },
  "data.dataSafety": { en: "Data Safety", es: "Seguridad de Datos" },
  "data.storage": { en: "Storage", es: "Almacenamiento" },
  "data.local": { en: "Local", es: "Local" },

  // ── Settings ──
  "settings.title": { en: "Settings", es: "Ajustes" },
  "settings.subtitle": { en: "Customize BodyLab", es: "Personaliza BodyLab" },
  "settings.profile": { en: "Profile", es: "Perfil" },
  "settings.name": { en: "Name", es: "Nombre" },
  "settings.age": { en: "Age", es: "Edad" },
  "settings.birthDate": { en: "Birth date", es: "Fecha de nacimiento" },
  "settings.years": { en: "years", es: "años" },
  "settings.birthDateHint": {
    en: "Optional. With a birth date BodyLab always uses your real age in the body-fat, body-age and health-risk models.",
    es: "Opcional. Con la fecha de nacimiento, BodyLab usa siempre tu edad real en los modelos de grasa, edad corporal y riesgo de salud.",
  },
  "settings.ageDerivedHint": {
    en: "Calculated from your birth date — it stays correct on its own.",
    es: "Calculada desde tu fecha de nacimiento: se mantiene correcta sola.",
  },
  "settings.birthdayToday": {
    en: "🎉 Happy birthday!",
    es: "🎉 ¡Feliz cumpleaños!",
  },
  "settings.sex": { en: "Sex", es: "Sexo" },
  "settings.male": { en: "Male", es: "Hombre" },
  "settings.female": { en: "Female", es: "Mujer" },
  "settings.height": { en: "Height", es: "Altura" },
  "settings.weight": { en: "Weight", es: "Peso" },
  "settings.language": { en: "Language", es: "Idioma" },
  "settings.theme": { en: "Theme", es: "Tema" },
  "settings.darkMode": { en: "Dark mode", es: "Modo oscuro" },
  "settings.lightMode": { en: "Light mode", es: "Modo claro" },
  "settings.system": { en: "System", es: "Sistema" },
  "settings.about": { en: "About", es: "Acerca de" },
  "settings.version": { en: "Version", es: "Versión" },
  "settings.license": { en: "License", es: "Licencia" },
  "settings.clearData": { en: "Clear all data", es: "Borrar todos los datos" },
  "settings.clearDataConfirm": {
    en: "This cannot be undone",
    es: "Esto no se puede deshacer",
  },
  "settings.saved": { en: "Settings saved", es: "Ajustes guardados" },
  "settings.units": { en: "Units", es: "Unidades" },
  "settings.metric": { en: "Metric (cm / kg)", es: "Métrico (cm / kg)" },
  "settings.imperial": { en: "Imperial (in / lb)", es: "Imperial (in / lb)" },
  "settings.unitsHint": {
    en: "Display only — your measurements are always stored in centimeters and kilograms, so switching never rewrites your history.",
    es: "Solo visualización: tus medidas siempre se guardan en centímetros y kilogramos, así que cambiar de sistema nunca reescribe tu historial.",
  },

  // ── Measure — unit-aware inputs (BL-MEAS-005) ──
  "measure.unitsNote": {
    en: "Enter values in inches — stored as cm automatically.",
    es: "Introduce valores en pulgadas — se guardan en cm automáticamente.",
  },
  "measure.weightUnitsNote": {
    en: "Enter weight in pounds — stored as kg automatically.",
    es: "Introduce el peso en libras — se guarda en kg automáticamente.",
  },
  "measure.setIn": {
    en: "Set to {value} {unit}",
    es: "Poner a {value} {unit}",
  },
  "settings.updates": { en: "Updates", es: "Actualizaciones" },
  "settings.updatesHint": {
    en: "Manual check only — BodyLab never downloads anything in the background. A check is a single request to the project's GitHub releases page; nothing else leaves your device.",
    es: "Comprobación manual — BodyLab nunca descarga nada en segundo plano. Cada comprobación es una única petición a la página de releases de GitHub del proyecto; nada más sale de tu equipo.",
  },
  "settings.updatesCheck": {
    en: "Check for updates",
    es: "Buscar actualizaciones",
  },
  "settings.updatesChecking": { en: "Checking…", es: "Comprobando…" },
  "settings.updatesUpToDate": {
    en: "You are up to date",
    es: "Ya estás en la última versión",
  },
  "settings.updatesInstall": {
    en: "Download & install",
    es: "Descargar e instalar",
  },
  "settings.updatesDownloading": { en: "Downloading…", es: "Descargando…" },
  "settings.updatesInstalling": {
    en: "Installing… restarting",
    es: "Instalando… reiniciando",
  },
  "settings.updatesRetry": {
    en: "Check failed — retry",
    es: "Fallo al comprobar — reintentar",
  },
  "settings.saveProfile": { en: "Save profile", es: "Guardar perfil" },
  "settings.measureNow": { en: "Measure now", es: "Medir ahora" },

  // ── Mobile / LAN testing ──
  "mobile.title": { en: "Test on your phone", es: "Probar en tu móvil" },
  "mobile.hint": {
    en: "Both apps are 100 % local, so this computer can serve them to your phone over Wi-Fi. Run the LAN server once — it builds both apps and prints an address like http://192.168.1.7:8090/ to type on the phone.",
    es: "Las dos apps son 100 % locales, así que este equipo puede servirlas a tu móvil por Wi-Fi. Ejecuta el servidor local una vez: compila las dos apps e imprime una dirección tipo http://192.168.1.7:8090/ para escribirla en el móvil.",
  },
  "mobile.launcher": {
    en: "Double-click «LAN Server.bat» in the project folder, or run:",
    es: "Haz doble clic en «LAN Server.bat» en la carpeta del proyecto, o ejecuta:",
  },
  "mobile.onLan": {
    en: "You are already using BodyLab over the local network. Open this address on another device:",
    es: "Ya estás usando BodyLab por la red local. Abre esta dirección en otro dispositivo:",
  },
  "mobile.sibling": {
    en: "TrainingLab is on the same server",
    es: "TrainingLab está en el mismo servidor",
  },
  "mobile.privacy": {
    en: "Anyone on this Wi-Fi can open the server while it runs (stop it with Ctrl+C). Each device keeps its own data: use the JSON export/import to move measurements between them.",
    es: "Cualquiera en esta Wi-Fi puede abrir el servidor mientras esté encendido (se para con Ctrl+C). Cada dispositivo guarda sus propios datos: usa el export/import JSON para mover las medidas entre ellos.",
  },
  "mobile.copy": { en: "Copy", es: "Copiar" },
  "mobile.copied": { en: "Copied", es: "Copiado" },
  "mobile.copyFailed": { en: "Select it manually", es: "Selecciónala a mano" },

  // ── Onboarding ──
  "onboarding.welcome": {
    en: "Welcome to BodyLab",
    es: "Bienvenido a BodyLab",
  },
  "onboarding.trackBody": { en: "Track your body.", es: "Rastrea tu cuerpo." },
  "onboarding.understandProgress": {
    en: "Understand your progress.",
    es: "Entiende tu progreso.",
  },
  "onboarding.keepDataPrivate": {
    en: "Keep your data private.",
    es: "Mantén tus datos privados.",
  },
  "onboarding.chooseLanguage": {
    en: "Choose your language",
    es: "Elige tu idioma",
  },
  "onboarding.yourProfile": { en: "Your Profile", es: "Tu Perfil" },
  "onboarding.tellUs": {
    en: "Tell us about yourself",
    es: "Cuéntanos sobre ti",
  },
  "onboarding.firstMeasurements": {
    en: "First Measurements",
    es: "Primeras Medidas",
  },
  "onboarding.optional": {
    en: "Optional — you can do this later",
    es: "Opcional — puedes hacerlo después",
  },
  "onboarding.yourReference": { en: "Your Reference", es: "Tu Referencia" },
  "onboarding.selectReference": {
    en: "Select a reference profile",
    es: "Selecciona un perfil de referencia",
  },
  "onboarding.next": { en: "Next", es: "Siguiente" },
  "onboarding.back": { en: "Back", es: "Atrás" },
  "onboarding.getStarted": { en: "Get Started!", es: "¡Comenzar!" },

  // ── Exercise ──
  "exercise.log": { en: "Log Exercise", es: "Registrar Ejercicio" },
  "exercise.sets": { en: "Sets", es: "Series" },
  "exercise.reps": { en: "Reps", es: "Repeticiones" },
  "exercise.weight": { en: "Weight", es: "Peso" },
  "exercise.rpe": { en: "RPE", es: "RPE" },
  "exercise.save": { en: "Save set", es: "Guardar serie" },
  "exercise.history": { en: "Recent logs", es: "Registros recientes" },
  "exercise.maxEffort": { en: "Max Effort", es: "Máximo Esfuerzo" },
  "exercise.estimated1RM": { en: "Est. 1RM", es: "Est. 1RM" },
  "exercise.technicalDifficulty": { en: "Technical", es: "Técnica" },
  "exercise.hypertrophy": { en: "Hypertrophy", es: "Hipertrofia" },
  "exercise.primary": { en: "Primary", es: "Primario" },
  "exercise.secondary": { en: "Secondary", es: "Secundario" },
  "exercise.synergist": { en: "Synergist", es: "Sinergista" },

  // ── Analytics ──
  "analytics.title": { en: "Body Analytics", es: "Análisis Corporal" },
  "analytics.bodyAge": { en: "Your Body Age", es: "Tu Edad Corporal" },
  "analytics.chronologicalAge": {
    en: "Chronological age",
    es: "Edad cronológica",
  },
  "analytics.composition": {
    en: "Body Composition",
    es: "Composición Corporal",
  },
  "analytics.bodyFat": { en: "Body Fat", es: "Grasa Corporal" },
  "analytics.leanMass": { en: "Lean Mass", es: "Masa Muscular" },
  "analytics.fatMass": { en: "Fat Mass", es: "Masa Grasa" },
  "analytics.confidence": { en: "Confidence", es: "Confianza" },
  "analytics.healthRisk": { en: "Health Risk", es: "Riesgo de Salud" },
  "analytics.prediction": {
    en: "Progress Prediction (30 days)",
    es: "Predicción de Progreso (30 días)",
  },
  "analytics.correlations": {
    en: "Detected Correlations",
    es: "Correlaciones Detectadas",
  },

  // ── Common ──
  "common.save": { en: "Save", es: "Guardar" },
  "common.compareSnapshots": {
    en: "Compare snapshots",
    es: "Comparar snapshots",
  },
  "common.saveSnapshot": { en: "Save snapshot", es: "Guardar snapshot" },
  "common.resetOnboarding": {
    en: "Reset onboarding",
    es: "Resetear onboarding",
  },
  "common.confirmResetOnboarding": {
    en: "Confirm reset",
    es: "Confirmar reinicio",
  },
  "common.cancel": { en: "Cancel", es: "Cancelar" },
  "common.delete": { en: "Delete", es: "Eliminar" },
  "common.edit": { en: "Edit", es: "Editar" },
  "common.loading": { en: "Loading...", es: "Cargando..." },
  "common.error": { en: "Error", es: "Error" },
  "common.success": { en: "Success", es: "Éxito" },
  "common.close": { en: "Close", es: "Cerrar" },
  "common.retry": { en: "Retry", es: "Reintentar" },
  "common.none": { en: "None", es: "Ninguno" },
  "common.yes": { en: "Yes", es: "Sí" },
  "common.no": { en: "No", es: "No" },
};

// ============================================================================
// Translation Function
// ============================================================================

/**
 * Translate a key or bilingual object.
 *
 * Supports two calling conventions:
 *   t('settings.title')          → dictionary lookup
 *   t({ en: 'Hello', es: 'Hola' }) → direct bilingual object
 */
export function t(keyOrObj: string | { en: string; es: string }): string {
  if (typeof keyOrObj === "string") {
    const entry = translations[keyOrObj];
    if (entry) {
      return entry[currentLanguage] ?? entry.en;
    }
    // Fallback: return the key itself if no translation found
    console.warn(`[i18n] Missing translation: "${keyOrObj}"`);
    return keyOrObj;
  }
  // Bilingual object fallback
  return keyOrObj[currentLanguage] ?? keyOrObj.en;
}

/**
 * Translate with interpolation.
 *
 * @example
 * tInterpolate('overview.measurementsCount', { n: 5 })
 * // → '5 measurements' or '5 mediciones'
 */
export function tInterpolate(
  key: string,
  vars: Record<string, string | number>,
): string {
  let str = t(key);
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return str;
}
