/**
 * Coach panel — the optional local LLM, used on demand.
 *
 * The panel is deliberately thin: it shows what the model proposed, which tools
 * it called, and whether the hard rules accepted the proposal. Data and
 * execution live in the page so this stays a pure view.
 *
 * @module features/today/CoachPanel
 */

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Send,
  Settings2,
  Sparkles,
} from "lucide-react";
import { t, tInterp } from "../../lib/i18n";
import type { LlmSettings } from "../../lib/types";
import { SectionCard, Badge } from "./ui";

export interface CoachResult {
  ok: boolean;
  content: string;
  toolCalls: { name: string; args: Record<string, unknown> }[];
  /** Present when a proposal survived the hard rules. */
  applied?: { summary: string; slots: number };
  errors: string[];
}

const PRESETS: { label: string; baseUrl: string }[] = [
  { label: "llama.cpp", baseUrl: "http://127.0.0.1:8080/v1" },
  { label: "LM Studio", baseUrl: "http://127.0.0.1:1234/v1" },
  { label: "Ollama", baseUrl: "http://127.0.0.1:11434/v1" },
  { label: "Jan", baseUrl: "http://127.0.0.1:1337/v1" },
];

export function CoachPanel({
  llm,
  onLlmChange,
  onAsk,
  busy,
}: {
  llm: LlmSettings;
  onLlmChange: (next: LlmSettings) => void;
  onAsk: (request: string) => void;
  busy: boolean;
}) {
  const [request, setRequest] = useState("");

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
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[var(--tl-text-muted)] flex items-center gap-1">
              <Settings2 className="w-3 h-3" />
              {t("settings.llmPresets")}
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onLlmChange({ ...llm, baseUrl: p.baseUrl })}
                className={`px-2.5 py-1 rounded-lg text-[11px] border tl-focusable ${
                  llm.baseUrl === p.baseUrl
                    ? "tl-chip border-transparent"
                    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && llm.enabled && request.trim()) {
              e.preventDefault();
              onAsk(request.trim());
            }
          }}
          placeholder={t("coach.placeholder")}
          className="tl-input flex-1 min-w-[220px] px-3 py-2 text-sm"
        />
        <button
          onClick={() => request.trim() && onAsk(request.trim())}
          disabled={!llm.enabled || busy || request.trim().length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl tl-btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Sparkles className="w-4 h-4 animate-pulse" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {busy ? t("coach.thinking") : t("coach.ask")}
        </button>
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
  return (
    <div className="tl-card p-4 mt-3 space-y-2">
      {result.applied && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          {tInterp("coach.applied", { n: result.applied.slots })}
        </p>
      )}
      {result.errors.length > 0 && (
        <div className="text-sm text-amber-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p>{t("coach.rejected")}</p>
            <ul className="list-disc list-inside text-xs text-[var(--tl-text-muted)] mt-1">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {result.content && (
        <p className="text-sm whitespace-pre-wrap">{result.content}</p>
      )}
      {result.toolCalls.length > 0 && (
        <div className="text-[11px] text-[var(--tl-text-muted)]">
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
