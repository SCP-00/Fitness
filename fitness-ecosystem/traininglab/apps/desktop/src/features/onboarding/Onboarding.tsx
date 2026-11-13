import { useState } from "react";
import {
  EQUIPMENT_PRESETS,
  ownedFromPreset,
} from "@fitness/bodylab-exercises";
import type { SessionGoal } from "@fitness/bodylab-training";
import { useStore } from "../../app/store";
import { getLanguage, t } from "../../lib/i18n";
import { uid } from "../../lib/uid";
import type { TlLevel } from "../../lib/types";

const MARKER = "traininglab-onboarding-v1";

const GOALS: SessionGoal[] = ["hypertrophy", "strength", "recomposition"];
const LEVELS: TlLevel[] = ["beginner", "intermediate", "advanced"];
const GEAR = [
  "dumbbells-adjustable",
  "barbell-plates",
  "bench",
  "pullup-bar",
  "dip-bars",
] as const;

const copy = {
  es: {
    eyebrow: "Primeros pasos",
    title: "Tres preguntas y empezamos",
    goal: "¿Qué buscas?",
    level: "¿Cuánta experiencia tienes?",
    levelHint:
      "Si no lo tienes claro, empieza en principiante: el plan se ajusta solo con lo que registras.",
    time: "¿Cuánto tiempo tienes?",
    minutes: "minutos por sesión",
    days: "días por semana",
    gear: "¿Qué tienes para entrenar?",
    gearHint:
      "Marca lo que uses. Sin marcar nada, el plan usa solo peso corporal.",
    rir: "RIR es lo que dejas en la recámara. RIR 2 = dos repeticiones antes del fallo.",
    readiness:
      "Cada día puedes marcar energía, motivación y frescura. Eso ajusta el volumen de hoy, no tu plan.",
    back: "Atrás",
    next: "Siguiente",
    start: "Empezar a entrenar",
    step: "Paso",
  },
  en: {
    eyebrow: "Getting started",
    title: "Three questions and we begin",
    goal: "What are you training for?",
    level: "How much experience do you have?",
    levelHint:
      "If you are unsure, start as a beginner: the plan adjusts with what you log.",
    time: "How much time do you have?",
    minutes: "minutes per session",
    days: "days per week",
    gear: "What do you have to train with?",
    gearHint: "Tick what you use. With nothing ticked, the plan is bodyweight only.",
    rir: "RIR is what you leave in reserve. RIR 2 = two reps short of failure.",
    readiness:
      "Each day you can report energy, motivation and freshness. That adjusts today's volume, not your plan.",
    back: "Back",
    next: "Next",
    start: "Start training",
    step: "Step",
  },
} as const;

function Choice({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`btn ${active ? "btn-primary" : ""}`}
      style={{ minHeight: 44, justifyContent: "flex-start", textAlign: "left" }}
    >
      {children}
    </button>
  );
}

/**
 * First-run setup: goal, experience and the two constraints that change the
 * plan (time and days), plus the gear the planner may use. It is deliberately
 * local and skippable in one pass; nothing is saved until the last step.
 */
export default function Onboarding() {
  const { loading, settings, sessions, sets, patch } = useStore();
  const [visible, setVisible] = useState(
    () => localStorage.getItem(MARKER) !== "1",
  );
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<SessionGoal>("hypertrophy");
  const [level, setLevel] = useState<TlLevel>("beginner");
  const [minutes, setMinutes] = useState(60);
  const [days, setDays] = useState(3);
  const [gear, setGear] = useState<string[]>([]);

  if (
    !visible ||
    loading ||
    !settings ||
    sessions.length > 0 ||
    sets.length > 0
  ) {
    return null;
  }

  const lang = getLanguage() === "en" ? "en" : "es";
  const text = copy[lang];
  const finish = () => {
    const inventory = gear.flatMap((id) => {
      const item = ownedFromPreset(id, uid());
      const preset = EQUIPMENT_PRESETS.find((entry) => entry.id === id);
      return item ? [{ ...item, label: preset?.name[lang] ?? item.label }] : [];
    });
    patch({
      goal,
      level,
      timeBudgetMin: minutes,
      daysPerWeek: days,
      inventory,
    });
    localStorage.setItem(MARKER, "1");
    setVisible(false);
  };

  return (
    <>
      <div className="overlay" />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{ padding: 20, maxWidth: 560, width: "calc(100vw - 32px)" }}
      >
        <p className="small muted" style={{ margin: 0 }}>
          {text.eyebrow} · {text.step} {step + 1}/3
        </p>
        <h2 id="onboarding-title" style={{ margin: "6px 0 16px" }}>
          {text.title}
        </h2>

        {step === 0 && (
          <div className="stack" style={{ gap: 14 }}>
            <p className="field-label">{text.goal}</p>
            <div className="stack" style={{ gap: 8 }}>
              {GOALS.map((value) => (
                <Choice
                  key={value}
                  active={goal === value}
                  onClick={() => setGoal(value)}
                >
                  {t(`goal.${value}`)}
                </Choice>
              ))}
            </div>
            <p className="field-label" style={{ marginTop: 6 }}>
              {text.level}
            </p>
            <div className="stack" style={{ gap: 8 }}>
              {LEVELS.map((value) => (
                <Choice
                  key={value}
                  active={level === value}
                  onClick={() => setLevel(value)}
                >
                  {t(`level.${value}`)}
                </Choice>
              ))}
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {text.levelHint}
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="stack" style={{ gap: 16 }}>
            <div>
              <p className="field-label">{text.time}</p>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {[45, 60, 90].map((value) => (
                  <Choice
                    key={value}
                    active={minutes === value}
                    onClick={() => setMinutes(value)}
                  >
                    {value} {text.minutes}
                  </Choice>
                ))}
              </div>
            </div>
            <div>
              <p className="field-label">
                {days} {text.days}
              </p>
              <div className="row" style={{ gap: 8 }}>
                {[3, 4, 5].map((value) => (
                  <Choice
                    key={value}
                    active={days === value}
                    onClick={() => setDays(value)}
                  >
                    {value}
                  </Choice>
                ))}
              </div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {text.rir}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 12 }}>
            <p className="field-label">{text.gear}</p>
            <div className="stack" style={{ gap: 8 }}>
              {GEAR.map((id) => {
                const preset = EQUIPMENT_PRESETS.find((entry) => entry.id === id);
                if (!preset) return null;
                return (
                  <Choice
                    key={id}
                    active={gear.includes(id)}
                    onClick={() =>
                      setGear((current) =>
                        current.includes(id)
                          ? current.filter((entry) => entry !== id)
                          : [...current, id],
                      )
                    }
                  >
                    {preset.name[lang]}
                  </Choice>
                );
              })}
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {text.gearHint}
            </p>
            <p className="small muted" style={{ margin: 0 }}>
              {text.readiness}
            </p>
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          {step > 0 && (
            <button type="button" className="btn" onClick={() => setStep(step - 1)}>
              {text.back}
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(step + 1)}
            >
              {text.next}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>
              {text.start}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
