/**
 * MeasurementProtocol — **el dibujo** de dónde va la cinta.
 *
 * The owner's complaint was concrete: *«es difícil saber medir en diámetro o
 * anchura una parte del cuerpo sin ver en qué posición debería estar la cinta o
 * el metro»*. Text alone does not fix that, so this component draws it:
 *
 *   * a schematic body (front or side) with enough anatomy to place the band —
 *     head, shoulders, arms, torso, hips, legs — drawn by us, so there is no
 *     image licence and the drawing can sit anywhere in the figure;
 *   * the instrument as the geometry says: an **ellipse** closing around the part
 *     (a tape), or a **segment with arrows** between two bony points (a caliper
 *     or an anthropometer);
 *   * the landmark, the orientation, the posture, the mistakes that move the
 *     number, and the source — in both languages, as the rest of BodyLab.
 *
 * Everything is inline SVG + tokens, so it works offline and in dark mode.
 *
 * @module components/MeasurementProtocol
 */

import { Ruler } from "lucide-react";
import {
  FIGURE,
  STANDARD_CONDITIONS,
  protocolFor,
  sideOf,
  type MeasurementProtocol as Protocol,
} from "../lib/measurement-protocols";

type Lang = "es" | "en";

const ACCENT = "var(--color-accent, #6366f1)";

/** The head, torso and limbs, in the 100 × 240 viewBox the data assumes. */
function BodySilhouette({ view }: { view: "front" | "side" }) {
  const stroke = "var(--color-border-strong, #cbd5e1)";
  const fill = "var(--color-surface-elevated, #f8fafc)";
  const common = {
    fill,
    stroke,
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
  };
  return (
    <g>
      <circle cx={50} cy={30} r={13} {...common} />
      {view === "front" ? (
        <>
          {/* Shoulders and torso: wide at the acromia, narrow at the waist. */}
          <path
            d="M26 58 C 34 50, 42 48, 50 48 C 58 48, 66 50, 74 58 L 72 90 C 70 108, 68 118, 66 126 L 34 126 C 32 118, 30 108, 28 90 Z"
            {...common}
          />
          {/* Arms hanging, slightly away from the torso. */}
          <path
            d="M27 60 C 22 76, 20 96, 19 118 L 25 118 C 27 98, 29 78, 32 62 Z"
            {...common}
          />
          <path
            d="M73 60 C 78 76, 80 96, 81 118 L 75 118 C 73 98, 71 78, 68 62 Z"
            {...common}
          />
          {/* Hands. */}
          <rect x={17} y={118} width={9} height={16} rx={3} {...common} />
          <rect x={74} y={118} width={9} height={16} rx={3} {...common} />
          {/* Hips and legs. */}
          <path
            d="M32 126 L 68 126 C 70 140, 68 150, 64 156 L 56 156 L 54 232 L 44 232 L 42 156 L 34 156 C 30 150, 30 140, 32 126 Z"
            {...common}
          />
        </>
      ) : (
        <>
          {/* Side view: the torso is a stack of curves, head above the shoulder. */}
          <path
            d="M42 58 C 40 54, 42 50, 46 50 L 60 50 C 64 54, 62 60, 60 64 L 62 92 C 63 106, 62 118, 60 126 L 40 126 C 38 116, 37 104, 38 92 Z"
            {...common}
          />
          <path
            d="M60 62 C 64 76, 65 96, 64 118 L 58 118 C 59 98, 58 78, 56 64 Z"
            {...common}
          />
          <path
            d="M40 126 L 60 126 C 61 140, 60 150, 56 156 L 50 156 L 49 232 L 39 232 L 38 156 C 34 150, 38 140, 40 126 Z"
            {...common}
          />
        </>
      )}
    </g>
  );
}

function Diagram({ protocol, lang }: { protocol: Protocol; lang: Lang }) {
  const { diagram } = protocol;
  const label =
    lang === "es" ? "Dónde va el instrumento" : "Where the instrument goes";
  return (
    <svg
      viewBox={`0 0 ${FIGURE.width} ${FIGURE.height}`}
      // The figure is tall and narrow: keep it small enough that the panel still
      // fits a phone next to the text.
      className="h-56 w-auto shrink-0"
      role="img"
      aria-label={`${protocol.label[lang]} — ${label}`}
    >
      <BodySilhouette view={diagram.view} />
      {diagram.kind === "girth" && diagram.center ? (
        <>
          {/* The tape: an open ellipse so it reads as a band around the part. */}
          <ellipse
            cx={diagram.center.x}
            cy={diagram.center.y}
            rx={diagram.rx ?? 6}
            ry={diagram.ry ?? 5}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.6}
            strokeDasharray="5 3"
          />
          <circle
            cx={diagram.center.x}
            cy={diagram.center.y}
            r={1.8}
            fill={ACCENT}
          />
        </>
      ) : null}
      {diagram.kind !== "girth" && diagram.from && diagram.to ? (
        <g stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round">
          <line
            x1={diagram.from.x}
            y1={diagram.from.y}
            x2={diagram.to.x}
            y2={diagram.to.y}
          />
          {/* Both ends marked: a breadth is a span between two points. */}
          <circle cx={diagram.from.x} cy={diagram.from.y} r={3} fill={ACCENT} />
          <circle cx={diagram.to.x} cy={diagram.to.y} r={3} fill={ACCENT} />
        </g>
      ) : null}
    </svg>
  );
}

export function MeasurementProtocolPanel({
  typeId,
  lang,
  onClose,
  showConditions = false,
}: {
  typeId: string;
  lang: Lang;
  onClose?: () => void;
  /** Print the standard conditions block (first measurement of a session). */
  showConditions?: boolean;
}) {
  const protocol = protocolFor(typeId);
  if (!protocol) return null;
  const side = sideOf(typeId);

  return (
    <div className="mt-2 rounded-2xl border border-indigo-100 dark:border-[var(--color-border)] bg-indigo-50/60 dark:bg-[var(--color-surface-elevated)] p-3">
      <div className="flex items-start gap-3">
        <Diagram protocol={protocol} lang={lang} />
        <div className="min-w-0 flex-1 text-xs text-slate-700 dark:text-[var(--color-text-secondary)] space-y-1.5">
          <p className="font-semibold text-slate-900 dark:text-[var(--color-text)] flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-indigo-500" />
            {protocol.label[lang]}
            {side
              ? ` · ${side === "left" ? (lang === "es" ? "izquierda" : "left") : lang === "es" ? "derecha" : "right"}`
              : ""}
          </p>
          <p>
            <span className="font-medium">
              {lang === "es" ? "Punto" : "Landmark"}:{" "}
            </span>
            {protocol.landmark[lang]}
          </p>
          <p>
            <span className="font-medium">
              {lang === "es" ? "La cinta / el metro" : "Tape / instrument"}
              :{" "}
            </span>
            {protocol.orientation[lang]}
          </p>
          <p>
            <span className="font-medium">
              {lang === "es" ? "Postura" : "Posture"}:{" "}
            </span>
            {protocol.posture[lang]}
          </p>
          {protocol.breathing ? (
            <p>
              <span className="font-medium">
                {lang === "es" ? "Respiración" : "Breathing"}:{" "}
              </span>
              {protocol.breathing[lang]}
            </p>
          ) : null}
          <ul className="list-disc pl-4 space-y-0.5 text-amber-800 dark:text-amber-300">
            {protocol.errors.map((error, i) => (
              <li key={i}>{error[lang]}</li>
            ))}
          </ul>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-[var(--color-text-muted)]">
            {protocol.source}
          </p>
        </div>
      </div>

      {showConditions && (
        <div className="mt-3 border-t border-indigo-100 dark:border-[var(--color-border)] pt-2">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-[var(--color-text)] mb-1">
            {lang === "es" ? "Antes de empezar" : "Before you start"}
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-[var(--color-text-secondary)]">
            {STANDARD_CONDITIONS.map((rule, i) => (
              <li key={i}>{rule[lang]}</li>
            ))}
          </ul>
        </div>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
        >
          {lang === "es" ? "Cerrar" : "Close"}
        </button>
      )}
    </div>
  );
}

export default MeasurementProtocolPanel;
