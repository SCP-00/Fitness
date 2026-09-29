/**
 * MobileCard — "train with your phone" instructions.
 *
 * TrainingLab is the logging half, so the phone is where it earns its keep.
 * A web page cannot open a listening socket, so this card cannot start the LAN
 * server itself; it reports the truth about the current page instead: if the
 * app is already served over the network it shows the address worth typing on
 * the phone (and BodyLab, which lives on the same server), otherwise it shows
 * the single command that starts the server.
 *
 * @module features/today/MobileCard
 */

import { useState } from "react";
import { Check, Copy, ExternalLink, Smartphone } from "lucide-react";
import { t } from "../../lib/i18n";
import { SectionCard } from "./ui";

/** Mount paths used by scripts/serve-lan.mjs. */
const MOUNT = "/traininglab/";
const SIBLING = "/bodylab/";

const LAUNCH_COMMAND = "pnpm lan";

const LOOPBACK = /^(localhost|127(\.\d+){3}|\[?::1\]?)$/i;

/**
 * Copy to the clipboard, tolerating non-secure contexts: `navigator.clipboard`
 * only exists on HTTPS or localhost, and this card exists for
 * `http://192.168.x.x`.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function CopyRow({ value }: { value: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <code className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--tl-surface-2)] text-[13px] font-medium break-all">
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          const ok = await copyText(value);
          setState(ok ? "done" : "failed");
          setTimeout(() => setState("idle"), 1800);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl tl-btn-ghost text-sm tl-focusable"
      >
        {state === "done" ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        {state === "done"
          ? t("mobile.copied")
          : state === "failed"
            ? t("mobile.copyFailed")
            : t("mobile.copy")}
      </button>
    </div>
  );
}

export function MobileCard() {
  const { hostname, origin, pathname } = window.location;
  const onLan = !LOOPBACK.test(hostname);
  const siblingUrl = pathname.includes(MOUNT)
    ? `${origin}${pathname.replace(MOUNT, SIBLING)}`
    : null;

  return (
    <SectionCard
      title={t("mobile.title")}
      hint={onLan ? t("mobile.onLan") : t("mobile.hint")}
      icon={<Smartphone className="w-4 h-4" />}
      defaultOpen={false}
    >
      <div className="space-y-3">
        {onLan ? (
          <CopyRow value={`${origin}${pathname}`} />
        ) : (
          <>
            <p className="text-xs text-[var(--tl-text-muted)]">
              {t("mobile.launcher")}
            </p>
            <CopyRow value={LAUNCH_COMMAND} />
          </>
        )}

        {onLan && siblingUrl && (
          <a
            href={siblingUrl}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--tl-accent)] hover:text-[var(--tl-accent-strong)] tl-focusable rounded"
          >
            <ExternalLink className="w-4 h-4" />
            {t("mobile.sibling")}
          </a>
        )}

        <p className="text-[11px] text-[var(--tl-text-muted)]">
          {t("mobile.privacy")}
        </p>
      </div>
    </SectionCard>
  );
}
