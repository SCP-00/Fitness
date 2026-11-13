/**
 * The coach — one contract, three transports (2026-10-24).
 *
 * The app already had a coaching layer (the local model in Ajustes) and an
 * actions channel (`docs/MCP_TOOL_SURFACE.md`), but no place where the *same*
 * question could be asked of a different brain. This screen is that place, and
 * it deliberately owns no rules of its own:
 *
 *   1. **Ask** — `coachBrief` is the text an agent receives. It is built by
 *      `lib/coach-brief.ts` from the *same* `contextCsv` the local model gets,
 *      so "copy the brief" and "ask locally" cannot ask different questions.
 *   2. **Answer** — whatever comes back is parsed for *packaging* only, and then
 *      `applyCoachProposal` judges it with `validateProposal`: gear, time
 *      budget, one primary family, the recovery window. A rejected answer
 *      changes nothing on screen, which is why the button can say "validate and
 *      apply" without a preview step.
 *   3. **Undo** — the applied plan is one banner and one button away from the
 *      deterministic plan, because a proposal that cannot be reverted is a trap.
 *
 * The MCP note is a sentence, not a control: the inbox is a desktop file bridge
 * that this page cannot open, and pretending otherwise would be the kind of
 * fake affordance the interface audit keeps finding.
 *
 * @module screens/CoachScreen
 */

import { useMemo, useState } from "react";
import type { MuscleFamily } from "@fitness/bodylab-training";
import { useStore } from "../app/store";
import { CoachResultView } from "../features/today/CoachPanel";
import { parseCoachAnswer, type CoachAnswerError } from "../lib/coach-brief";
import { familyLabel } from "../lib/format";
import { getLanguage, t, tInterp } from "../lib/i18n";
import { MIcons } from "../ui/mockup-icons";

/**
 * `jue, 29 oct` — the same label Hoy's date pill prints. The first version of
 * this card printed `localDayKey(...)`, i.e. `2026-10-29`: a stored fact leaking
 * into the one place that is supposed to read like the rest of the app.
 */
function dayLabel(): string {
  return new Date().toLocaleDateString(
    getLanguage() === "es" ? "es-ES" : "en-GB",
    { weekday: "short", day: "numeric", month: "short" },
  );
}

/** Parser reason → copy key. The parser never speaks: the UI does. */
const ERR_KEY: Record<CoachAnswerError, string> = {
  no_json: "coach.err.no_json",
  bad_json: "coach.err.bad_json",
  not_an_object: "coach.err.not_an_object",
  no_slots: "coach.err.no_slots",
};

export default function CoachScreen() {
  const {
    loading,
    rows,
    settings,
    coachBrief,
    coachResult,
    coachRows,
    applyCoachProposal,
    clearCoach,
  } = useStore();

  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");

  const minutes = useMemo(
    () => rows.reduce((sum, row) => sum + row.minutes, 0),
    [rows],
  );
  const families = useMemo(() => {
    const seen = new Set<MuscleFamily>();
    for (const row of rows) {
      const first = row.families[0];
      if (first) seen.add(first);
    }
    return [...seen];
  }, [rows]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(coachBrief);
      setCopied("ok");
    } catch {
      // A denied clipboard is common in a WebView without a user gesture
      // history; the textarea below stays selectable, so this is a hint, not a
      // dead end.
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2400);
  }

  function apply() {
    const parsed = parseCoachAnswer(answer);
    if (!parsed.ok) {
      setNote(ERR_KEY[parsed.reason]);
      return;
    }
    setNote(null);
    applyCoachProposal(parsed.value);
  }

  const isRest = rows.length === 0;

  return (
    <>
      <header className="topbar">
        <a className="btn btn-sm tl-focusable" href="#/hoy">
          <MIcons.chevronLeft />
          {t("coach.page.back")}
        </a>
        <div className="spacer" />
        <span className="pill">
          <MIcons.bot />
          {t("coach.page.pill")}
        </span>
        <a className="btn btn-sm tl-focusable" href="#/ajustes">
          <MIcons.settings />
          {t("coach.page.settings")}
        </a>
      </header>

      <div className="content">
        <div className="stack" style={{ gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.6px" }}>
            {t("coach.page.title")}
          </h1>
          <p className="small muted" style={{ margin: 0 }}>
            {t("coach.page.sub")}
          </p>
        </div>

        {loading ? (
          <p className="small muted">{t("coach.page.loading")}</p>
        ) : isRest ? (
          <div className="warn-strip">
            <MIcons.alert />
            <span>{t("coach.page.rest")}</span>
          </div>
        ) : (
          <div className="cols">
            <div className="stack">
              {/* ── 1 · the brief ───────────────────────────────────────── */}
              <section className="card">
                <div className="card-head">
                  <span className="card-title">
                    <MIcons.sparkles />
                    {t("coach.brief.title")}
                  </span>
                  <div className="spacer" />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary tl-focusable"
                    onClick={copyBrief}
                  >
                    {copied === "ok" ? <MIcons.check /> : <MIcons.copy />}
                    {copied === "ok"
                      ? t("coach.brief.copied")
                      : t("coach.brief.copy")}
                  </button>
                </div>
                <div className="card-body" style={{ paddingTop: 0 }}>
                  <p className="small secondary" style={{ marginTop: 0 }}>
                    {t("coach.brief.body")}
                  </p>
                  {copied === "failed" && (
                    <p className="tiny" style={{ color: "var(--tl-warning)" }}>
                      {t("coach.brief.copyFailed")}
                    </p>
                  )}
                  <details>
                    <summary
                      className="tiny muted tl-focusable"
                      style={{ cursor: "pointer" }}
                    >
                      {t("coach.brief.show")} ·{" "}
                      {tInterp("coach.brief.chars", {
                        n: coachBrief.length,
                      })}
                    </summary>
                    <textarea
                      readOnly
                      value={coachBrief}
                      rows={16}
                      aria-label={t("coach.brief.title")}
                      onFocus={(e) => e.currentTarget.select()}
                      className="tl-input"
                      style={{
                        width: "100%",
                        marginTop: 8,
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        resize: "vertical",
                      }}
                    />
                  </details>
                </div>
              </section>

              {/* ── 2 · the answer ──────────────────────────────────────── */}
              <section className="card">
                <div className="card-head">
                  <span className="card-title">
                    <MIcons.check />
                    {t("coach.answer.title")}
                  </span>
                </div>
                <div className="card-body" style={{ paddingTop: 0 }}>
                  <p className="small secondary" style={{ marginTop: 0 }}>
                    {t("coach.answer.body")}
                  </p>
                  <textarea
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setNote(null);
                    }}
                    rows={8}
                    spellCheck={false}
                    placeholder={'{ "summary": "…", "slots": [ … ] }'}
                    aria-label={t("coach.answer.title")}
                    className="tl-input"
                    style={{
                      width: "100%",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      resize: "vertical",
                    }}
                  />
                  {note && (
                    <p className="tiny" style={{ color: "var(--tl-warning)" }}>
                      {t(note)}
                    </p>
                  )}
                  <div className="row" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-primary tl-focusable"
                      onClick={apply}
                      disabled={answer.trim().length === 0}
                    >
                      <MIcons.check />
                      {t("coach.answer.apply")}
                    </button>
                    <button
                      type="button"
                      className="btn tl-focusable"
                      onClick={() => {
                        setAnswer("");
                        setNote(null);
                      }}
                      disabled={answer.length === 0}
                    >
                      <MIcons.eraser />
                      {t("coach.answer.clear")}
                    </button>
                  </div>
                  {coachResult && <CoachResultView result={coachResult} />}
                </div>
              </section>
            </div>

            {/* ── The right column: what the agent would be replacing ─── */}
            <div className="stack">
              {coachRows && (
                <section
                  className="card card-tint"
                  data-testid="coach-active"
                >
                  <div className="card-pad stack" style={{ gap: 10 }}>
                    <span className="card-title">
                      <MIcons.bot />
                      {t("coach.active.title")}
                    </span>
                    <p className="small secondary" style={{ margin: 0 }}>
                      {t("coach.active.body")}
                    </p>
                    <button
                      type="button"
                      className="btn tl-focusable"
                      onClick={clearCoach}
                    >
                      <MIcons.rotate />
                      {t("coach.active.clear")}
                    </button>
                  </div>
                </section>
              )}

              <section className="card card-pad">
                <h2 className="card-title" style={{ marginBottom: 8 }}>
                  <MIcons.list />
                  {t("coach.page.detTitle")}
                </h2>
                <p className="small muted" style={{ margin: 0 }}>
                  {tInterp("coach.page.detLine", {
                    n: rows.length,
                    m: Math.round(minutes),
                  })}
                </p>
                <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                  {families.map(familyLabel).join(" · ")}
                </p>
                <p className="tiny muted" style={{ margin: "8px 0 0" }}>
                  {dayLabel()} · {settings?.timeBudgetMin ?? 0} min
                </p>
              </section>

              <section className="card card-pad">
                <h2 className="card-title" style={{ marginBottom: 8 }}>
                  <MIcons.layers />
                  {t("coach.mcp.title")}
                </h2>
                <p className="small secondary" style={{ margin: 0 }}>
                  {t("coach.mcp.body")}
                </p>
              </section>

              <section className="card card-pad">
                <h2 className="card-title" style={{ marginBottom: 8 }}>
                  <MIcons.bot />
                  {t("coach.local.title")}
                </h2>
                <p className="small secondary" style={{ margin: "0 0 10px" }}>
                  {t("coach.local.body")}
                </p>
                <a className="btn btn-sm tl-focusable" href="#/ajustes">
                  <MIcons.settings />
                  {t("coach.local.open")}
                </a>
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
