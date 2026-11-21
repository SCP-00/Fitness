/**
 * Coach panel — the optional local LLM, used on demand.
 *
 * The panel is deliberately thin: it shows what the model proposed, which tools
 * it called, and whether the hard rules accepted the proposal. Data and
 * execution live in the page so this stays a pure view.
 *
 * @module features/today/CoachPanel
 */

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Radar,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { getLanguage, t, tInterp } from "../../lib/i18n";
import { translateCoachError } from "../../lib/coach-errors";
import { familyLabel } from "../../lib/format";
import {
  detectLocalServer,
  probeServer,
  type DetectionResult,
  type ProbeResult,
} from "../../lib/llm";
import type { LlmSettings } from "../../lib/types";
import { SectionCard, Badge } from "./ui";

export interface CoachResult {
  ok: boolean;
  cancelled?: boolean;
  content: string;
  toolCalls: { name: string; args: Record<string, unknown> }[];
  /** Present when a proposal survived the hard rules. */
  applied?: { summary: string; slots: number; minutes: number };
  errors: string[];
}

const PRESETS: { label: string; baseUrl: string }[] = [
  { label: "llama.cpp", baseUrl: "http://127.0.0.1:8080/v1" },
  // The router UI the owner actually runs (2026-10-30) serves the OpenAI
  // routes on its own port and answers CORS for `tauri.localhost`; the model
  // itself is spawned on a random port behind it, which is why 8080 alone did
  // not find it.
  { label: "llama.cpp · 9931", baseUrl: "http://127.0.0.1:9931/v1" },
  { label: "LM Studio", baseUrl: "http://127.0.0.1:1234/v1" },
  { label: "Ollama", baseUrl: "http://127.0.0.1:11434/v1" },
  { label: "Jan", baseUrl: "http://127.0.0.1:1337/v1" },
];

export function CoachPanel({
  llm,
  onLlmChange,
  onAsk,
  onCancel,
  busy,
}: {
  llm: LlmSettings;
  onLlmChange: (next: LlmSettings) => void;
  onAsk: (request: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [request, setRequest] = useState("");
  /**
   * The last "Probar conexión" answer.
   *
   * The probe is the one diagnostic that separates "the model is bad" from "there
   * is no server at that URL", which is the failure a local LLM actually has. It
   * is a GET on /models: no tokens, no inference.
   */
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  /**
   * The last "find my server" answer, and whether it filled the fields for him.
   *
   * Setup used to require knowing the port AND the exact model id — the one
   * place where a single-user app still looked like a developer tool. The scan
   * is a handful of loopback GETs; nothing is downloaded and nothing leaves the
   * machine, which is why it can run on its own the first time (2026-10-30).
   */
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  const autoRan = useRef(false);

  const runProbe = async () => {
    setProbing(true);
    setProbe(await probeServer(llm));
    setProbing(false);
  };

  const runDetect = async (auto = false) => {
    setDetecting(true);
    const found = await detectLocalServer();
    setDetection(found);
    setDetecting(false);
    if (!found.ok || !found.baseUrl) return;
    const untouched = !llm.model || llm.model === "local-model";
    setProbe(null);
    onLlmChange({
      ...llm,
      baseUrl: found.baseUrl,
      // A model the owner typed is his: only the untouched placeholder is
      // replaced without being asked.
      model: found.model && (auto || untouched) ? found.model : llm.model,
    });
  };

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (!llm.model || llm.model === "local-model") void runDetect(true);
    // Deliberately once per mount: a re-scan is the button's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SectionCard
      title={t("coach.title")}
      hint={t("coach.hint")}
      icon={<Bot className="w-4 h-4" />}
      defaultOpen={llm.enabled}
      actions={
        llm.enabled ? (
          <Badge tone="success">{llm.model || t("coach.onBadge")}</Badge>
        ) : (
          <Badge tone="neutral">{t("coach.offBadge")}</Badge>
        )
      }
    >
      <label className="flex items-center gap-2 text-sm mb-3">
        <input
          type="checkbox"
          checked={llm.enabled}
          onChange={(e) => onLlmChange({ ...llm, enabled: e.target.checked })}
          className="accent-[var(--tl-accent)]"
        />
        {t("coach.enable")}
      </label>

      {llm.enabled && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-4">
          <label className="text-xs text-[var(--tl-text-muted)]">
            {t("settings.llmBaseUrl")}
            <input
              value={llm.baseUrl}
              onChange={(e) => onLlmChange({ ...llm, baseUrl: e.target.value })}
              className="tl-input w-full mt-1 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-[var(--tl-text-muted)]">
            {t("settings.llmModel")}
            <input
              value={llm.model}
              onChange={(e) => onLlmChange({ ...llm, model: e.target.value })}
              placeholder="qwen3-4b-instruct"
              className="tl-input w-full mt-1 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-[var(--tl-text-muted)]">
            {t("coach.maxTokens")}
            <input
              type="number"
              min={128}
              max={8192}
              step={128}
              value={llm.maxTokens ?? 1024}
              onChange={(e) =>
                onLlmChange({
                  ...llm,
                  maxTokens: Math.max(128, Math.min(8192, Number(e.target.value) || 1024)),
                })
              }
              className="tl-input w-full mt-1 px-3 py-2 text-sm"
            />
            <span className="text-[12px] block mt-1">
              {t("coach.maxTokensHint")}
            </span>
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[var(--tl-text-muted)] flex items-center gap-1">
              <Settings2 className="w-3 h-3" />
              {t("settings.llmPresets")}
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setProbe(null);
                  onLlmChange({ ...llm, baseUrl: p.baseUrl });
                }}
                className={`px-2.5 py-1 rounded-lg text-[12px] border tl-focusable ${
                  llm.baseUrl === p.baseUrl
                    ? "tl-chip border-transparent"
                    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => void runDetect()}
              disabled={detecting}
              className="px-2.5 py-1 rounded-lg text-[12px] border border-[var(--tl-border)] bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] tl-focusable disabled:opacity-40 inline-flex items-center gap-1"
            >
              <Radar className="w-3 h-3" />
              {detecting ? t("coach.detecting") : t("coach.detect")}
            </button>
            <button
              onClick={() => void runProbe()}
              disabled={probing}
              className="px-2.5 py-1 rounded-lg text-[12px] border border-[var(--tl-border)] bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] tl-focusable disabled:opacity-40"
            >
              {probing ? t("coach.probing") : t("coach.probe")}
            </button>
          </div>
          {detection && (
            <p
              className={`sm:col-span-2 text-[12px] ${detection.ok ? "text-emerald-400" : "text-[var(--tl-text-muted)]"}`}
            >
              {detection.ok && detection.baseUrl
                ? detection.model
                  ? tInterp("coach.detect.ok", {
                      model: detection.model,
                      url: detection.baseUrl,
                      ms: detection.ms,
                    })
                  : tInterp("coach.detect.noModel", { url: detection.baseUrl })
                : tInterp("coach.detect.fail", {
                    ports: detection.tried
                      .map((u) => u.replace(/^http:\/\/127\.0\.0\.1:|\/v1$/g, ""))
                      .join(", "),
                  })}
            </p>
          )}
          {probe && (
            <p
              className={`sm:col-span-2 text-[12px] ${probe.ok ? "text-emerald-400" : "text-amber-400"}`}
            >
              {probe.ok
                ? probe.models.length > 0
                  ? tInterp("coach.probe.ok", {
                      ms: probe.ms,
                      model: probe.models[0]!,
                    })
                  : tInterp("coach.probe.noModels", { ms: probe.ms })
                : tInterp("coach.probe.fail", {
                    error: probe.error ?? "—",
                    endpoint: probe.endpoint,
                  })}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && llm.enabled && !busy && request.trim()) {
              e.preventDefault();
              onAsk(request.trim());
            }
          }}
          placeholder={t("coach.placeholder")}
          /* Full width on a phone: a 220 px minimum was 12 px wider than the row
             that holds it at 320 px (audited 2026-10-29). */
          className="tl-input w-full sm:w-auto sm:flex-1 min-w-0 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => busy ? onCancel() : onAsk(request.trim())}
          disabled={!busy && (!llm.enabled || request.trim().length === 0)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed ${busy ? "btn tl-focusable" : "tl-btn-primary"}`}
        >
          {busy ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {t(busy ? "coach.cancel" : "coach.ask")}
        </button>
        {busy && <p className="text-sm self-center" role="status">{t("coach.thinking")}</p>}
      </div>
    </SectionCard>
  );
}

/** Result block rendered under the coach panel (kept separate for clarity). */
export function CoachResultView({
  result,
  onOpenTools,
}: {
  result: CoachResult;
  onOpenTools?: () => void;
}) {
  if (result.cancelled) {
    return <p className="text-sm mt-3" role="status">{t("coach.cancelled")}</p>;
  }
  return (
    <div className="tl-card p-4 mt-3 space-y-2">
      {result.applied && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          {tInterp("coach.applied", { n: result.applied.slots })}
        </p>
      )}
      {result.applied && result.applied.minutes > 0 && (
        <p className="text-sm text-[var(--tl-text-muted)]">
          {tInterp("coach.answer.minutes", {
            n: new Intl.NumberFormat(getLanguage(), {
              maximumFractionDigits: 1,
            }).format(result.applied.minutes),
          })}
        </p>
      )}
      {result.errors.length > 0 && (
        <div className="text-sm text-amber-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p>{t("coach.rejected")}</p>
            <ul className="list-disc list-inside text-xs text-[var(--tl-text-muted)] mt-1">
              {/* The validator's messages are English identifiers of a rule;
                  the owner reads Spanish, so the translation happens here, on
                  the way to the screen (lib/coach-errors.ts). */}
              {result.errors.map((e, i) => (
                <li key={i}>
                  {translateCoachError(e, getLanguage(), familyLabel)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {result.content && (
        <p className="text-sm whitespace-pre-wrap">{result.content}</p>
      )}
      {result.toolCalls.length > 0 && (
        <div className="text-[12px] text-[var(--tl-text-muted)]">
          <button
            onClick={onOpenTools}
            className="underline decoration-dotted tl-focusable"
          >
            {t("coach.tools")}: {result.toolCalls.length}
          </button>
          <ul className="mt-1 flex flex-wrap gap-1">
            {result.toolCalls.map((c, i) => (
              <li key={i}>
                <Badge tone="neutral">{c.name}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!result.ok && !result.content && result.errors.length === 0 && (
        <p className="text-sm text-[var(--tl-text-muted)]">{t("coach.off")}</p>
      )}
    </div>
  );
}
