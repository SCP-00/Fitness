import { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Globe,
  Shield,
  Ruler,
  BarChart3,
  TrendingUp,
  Dumbbell,
  Target,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { BiologicalSex, Language, AllMeasurementType } from "../lib/types";
import { BUILT_IN_REFERENCES } from "../lib/constants";
import { parseNumberInput } from "../lib/parse-num";
import { ageFromBirthDate } from "../lib/age";
import {
  AESTHETIC_PRESETS,
  BRACKET_SOURCE,
  OBJECTIVES,
  SPORTS,
  SPORT_FOCUS,
  ageBracket,
  type AestheticPresetId,
  type ObjectiveId,
  type SportFocusId,
  type SportId,
} from "../lib/onboarding-context";
import * as db from "../lib/db";

/**
 * Onboarding — First-run experience
 *
 * Flow per spec:
 * 1. Welcome (no language yet)
 * 2. Language selection
 * 3. Product intro (4 mini-screens teaching the mental model)
 * 4. Profile creation (body + the Sport / Atractivo context, 2026-09-30)
 * 5. Optional first measurements
 * 6. Reference selection
 */

interface OnboardingProps {
  onComplete: () => void;
}

// Product intro screens — teach the mental model
const INTRO_SCREENS = [
  {
    icon: Shield,
    title: { en: "Your Data", es: "Tus Datos" },
    desc: { en: "Everything stays local.", es: "Todo se queda local." },
  },
  {
    icon: Ruler,
    title: { en: "Measure", es: "Medir" },
    desc: {
      en: "Record your body over time.",
      es: "Registra tu cuerpo a lo largo del tiempo.",
    },
  },
  {
    icon: BarChart3,
    title: { en: "Understand", es: "Entender" },
    desc: {
      en: "Compare yourself with references.",
      es: "Compárate con referencias.",
    },
  },
  {
    icon: TrendingUp,
    title: { en: "Progress", es: "Progreso" },
    desc: { en: "See how you change.", es: "Mira cómo cambias." },
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { setLanguage, dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [language, setLangState] = useState<Language>("en");
  const [name, setName] = useState("");
  // Birth date, not a typed age: the derivation happens in lib/age.ts so the
  // profile never goes stale between birthdays.
  const [birthDate, setBirthDate] = useState("");
  const [height, setHeight] = useState("1.75");
  const [weight, setWeight] = useState("70");
  const [sex, setSex] = useState<BiologicalSex>("male");
  // Owner direction 2026-09-30 (approved §5): the Sport and Atractivo tracks.
  const [sport, setSport] = useState<SportId>("general");
  const [sportFocus, setSportFocus] = useState<SportFocusId | null>(null);
  const [objective, setObjective] = useState<ObjectiveId>("health");
  const [aestheticPreset, setAestheticPreset] =
    useState<AestheticPresetId | null>(null);
  // The published source backing the user's age, shown once the birth date
  // makes it known — never a source we cannot cite for their bracket.
  const bracket = ageBracket(ageFromBirthDate(birthDate));
  const bracketSource = bracket ? BRACKET_SOURCE[bracket] : null;
  const [measurementsData, setMeasurementsData] = useState<
    Record<string, number>
  >({});
  const [selectedRef, setSelectedRef] = useState(BUILT_IN_REFERENCES[0].id);

  const t = (obj: { en: string; es: string }) => obj[language];

  const handleMeasurementChange = useCallback((key: string, value: string) => {
    const numVal = parseNumberInput(value);
    setMeasurementsData((prev) => {
      if (numVal === null || numVal <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: numVal };
    });
  }, []);

  const handleComplete = async () => {
    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    const measurements = Object.entries(measurementsData).map(
      ([type, value]) => ({
        id: crypto.randomUUID(),
        profileId,
        type: type as AllMeasurementType,
        value,
        unit: "cm" as const,
        timestamp: now,
        method: "manual" as const,
        confidence: "high" as const,
      }),
    );

    const profile = {
      id: profileId,
      name: name || (language === "es" ? "Usuario" : "User"),
      birthDate: birthDate || null,
      height: parseNumberInput(height) ?? 1.75,
      weight: parseNumberInput(weight) ?? 70,
      biologicalSex: sex,
      units: "metric" as const,
      sport,
      sportFocus,
      objective,
      aestheticPreset,
      createdAt: now,
      updatedAt: now,
    };

    // Persist to IndexedDB
    await db.saveProfile(profile);
    if (measurements.length > 0) {
      await db.saveMeasurements(measurements);
    }
    await db.saveSetting("language", language);
    await db.saveSetting("reference", selectedRef);
    await db.setMeta({ schemaVersion: 1 });

    // Dispatch to React state
    setLanguage(language);
    dispatch({ type: "CREATE_PROFILE", payload: profile });
    const ref = BUILT_IN_REFERENCES.find((r) => r.id === selectedRef);
    if (ref) dispatch({ type: "SET_REFERENCE", payload: ref });
    measurements.forEach((m) =>
      dispatch({ type: "ADD_MEASUREMENT", payload: m }),
    );

    onComplete();
  };

  // Total steps: Welcome(0) + Language(1) + Intro(2-5) + Profile(6) + Measurements(7) + Reference(8)
  const totalSteps = 9;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor:
                    i <= step ? "#6366F1" : "rgba(255,255,255,0.1)",
                }}
              />
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-2xl">B</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  BodyLab
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  {language === "es"
                    ? "Rastrea tu cuerpo. Entiende tu progreso. Mantén tus datos privados."
                    : "Track your body. Understand your progress. Keep your data private."}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Language */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Globe className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {language === "es"
                    ? "Elige tu idioma"
                    : "Choose your language"}
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLangState("en")}
                  className={`p-4 rounded-xl font-medium text-lg border-2 transition-all ${
                    language === "en"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  🇺🇸 English
                </button>
                <button
                  onClick={() => setLangState("es")}
                  className={`p-4 rounded-xl font-medium text-lg border-2 transition-all ${
                    language === "es"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  🇪🇸 Español
                </button>
              </div>
            </div>
          )}

          {/* Steps 2-5: Product Intro */}
          {step >= 2 && step <= 5 && (
            <div className="text-center space-y-6">
              {(() => {
                const screen = INTRO_SCREENS[step - 2];
                const Icon = screen.icon;
                return (
                  <>
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center mx-auto">
                      <Icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                        {step - 1} / 4
                      </p>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {t(screen.title)}
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">
                        {t(screen.desc)}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Step 6: Profile */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="text-center">
                <Dumbbell className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {language === "es" ? "Tu Perfil" : "Your Profile"}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {language === "es"
                    ? "Cuéntanos sobre ti"
                    : "Tell us about yourself"}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {language === "es" ? "Nombre" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === "es" ? "Tu nombre" : "Your name"}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === "es" ? "Fecha de nacimiento" : "Birth date"}
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {language === "es"
                        ? "La edad se calcula sola. Opcional."
                        : "Age is derived automatically. Optional."}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === "es" ? " Sexo" : "Sex"}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSex("male")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          sex === "male"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {language === "es" ? "Hombre" : "Male"}
                      </button>
                      <button
                        onClick={() => setSex("female")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          sex === "female"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {language === "es" ? "Mujer" : "Female"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === "es" ? "Altura (m)" : "Height (m)"}
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      step="0.01"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === "es" ? "Peso (kg)" : "Weight (kg)"}
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      step="0.1"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Owner direction 2026-09-30: Sport + Atractivo context
                    (docs/RESEARCH_IDEALS_BY_SPORT.md §5, approved). */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {language === "es" ? "Deporte" : "Sport"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SPORTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSport(s.id);
                          if (s.id === "general") setSportFocus(null);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          sport === s.id
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {language === "es" ? s.es : s.en}
                      </button>
                    ))}
                  </div>
                </div>

                {sport !== "general" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === "es" ? "Enfoque" : "Focus"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SPORT_FOCUS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSportFocus(f.id)}
                          className={`py-2.5 px-2 rounded-xl text-sm font-medium border-2 transition-all ${
                            sportFocus === f.id
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {language === "es" ? f.es : f.en}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {language === "es" ? "Objetivo" : "Objective"}
                  </label>
                  <div className="flex gap-2">
                    {OBJECTIVES.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setObjective(o.id)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          objective === o.id
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {language === "es" ? o.es : o.en}
                      </button>
                    ))}
                  </div>
                </div>

                {objective === "handsome" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === "es"
                        ? "Preferencia estética"
                        : "Aesthetic preference"}
                    </label>
                    <div className="space-y-2">
                      {AESTHETIC_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setAestheticPreset(p.id)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                            aestheticPreset === p.id
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {language === "es" ? p.es : p.en}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {language === "es"
                        ? "Meta estética personal; no es un estándar médico."
                        : "A personal aesthetic goal — not a medical standard."}
                    </p>
                  </div>
                )}

                {bracketSource && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === "es"
                      ? `Referencias publicadas para tu edad: ${bracketSource}`
                      : `Published references for your age: ${bracketSource}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 7: First Measurements (optional) */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="text-center">
                <Ruler className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {language === "es"
                    ? "Primeras Medidas"
                    : "First Measurements"}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {language === "es"
                    ? "Opcional — puedes hacerlo después"
                    : "Optional — you can do this later"}
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "wrist", en: "Wrist", es: "Muñeca", ph: "17" },
                  { key: "chest", en: "Chest", es: "Pecho", ph: "100" },
                  { key: "waist", en: "Waist", es: "Cintura", ph: "80" },
                  { key: "hips", en: "Hips", es: "Cadera", ph: "95" },
                  {
                    key: "shoulders",
                    en: "Shoulders",
                    es: "Hombros",
                    ph: "120",
                  },
                  { key: "biceps", en: "Biceps", es: "Bíceps", ph: "35" },
                  { key: "thigh", en: "Thigh", es: "Muslo", ph: "55" },
                  { key: "calf", en: "Calf", es: "Pantorrilla", ph: "38" },
                ].map((f) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="w-24 text-sm text-slate-600 dark:text-slate-400 shrink-0">
                      {language === "es" ? f.es : f.en}
                    </label>
                    <input
                      type="number"
                      placeholder={f.ph}
                      step="0.1"
                      value={measurementsData[f.key] ?? ""}
                      onChange={(e) =>
                        handleMeasurementChange(f.key, e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="text-xs text-slate-400 dark:text-[var(--color-text-muted)]">
                      cm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 8: Reference */}
          {step === 8 && (
            <div className="space-y-5">
              <div className="text-center">
                <Target className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {language === "es" ? "Tu Referencia" : "Your Reference"}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {language === "es"
                    ? "Selecciona un perfil de referencia"
                    : "Select a reference profile"}
                </p>
              </div>

              <div className="space-y-3">
                {BUILT_IN_REFERENCES.map((ref) => (
                  <button
                    key={ref.id}
                    onClick={() => setSelectedRef(ref.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedRef === ref.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {t(ref.name)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {t(ref.description)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              {language === "es" ? "Atrás" : "Back"}
            </button>

            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                {language === "es" ? "Siguiente" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                {language === "es" ? "¡Comenzar!" : "Get Started!"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-6">
          BodyLab v1.0.0-rc
        </p>
      </div>
    </div>
  );
}
