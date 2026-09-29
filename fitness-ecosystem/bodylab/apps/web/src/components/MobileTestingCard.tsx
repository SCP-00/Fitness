import { useState } from 'react';
import { Smartphone, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { t } from '../i18n';

/**
 * MobileTestingCard — "open it on your phone" instructions.
 *
 * A browser cannot open a listening socket, so the card cannot start the LAN
 * server itself; what it *can* do is tell the truth about the current page:
 * either the app is already being served over the network (show the address
 * worth typing on the phone, plus the sibling app on the same server), or it is
 * on localhost (show the one command that starts the server).
 *
 * @module components/MobileTestingCard
 */

/** Mount paths used by scripts/serve-lan.mjs. */
const MOUNT = '/bodylab/';
const SIBLING = '/traininglab/';

const LAUNCH_COMMAND = 'pnpm lan';

const LOOPBACK = /^(localhost|127(\.\d+){3}|\[?::1\]?)$/i;

/**
 * Copy to the clipboard, tolerating non-secure contexts.
 *
 * `navigator.clipboard` only exists on HTTPS or localhost, and the whole point
 * of this card is `http://192.168.x.x`. The legacy textarea + execCommand path
 * still works there.
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
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function CopyRow({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--color-input-bg)] text-[13px] font-medium break-all">
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          const ok = await copyText(value);
          setState(ok ? 'done' : 'failed');
          setTimeout(() => setState('idle'), 1800);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors"
      >
        {state === 'done' ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        {state === 'done'
          ? t('mobile.copied')
          : state === 'failed'
            ? t('mobile.copyFailed')
            : label}
      </button>
    </div>
  );
}

export default function MobileTestingCard() {
  const { hostname, origin, pathname } = window.location;
  const onLan = !LOOPBACK.test(hostname);
  // Only offer the sibling app when we recognise the LAN server's layout.
  const siblingUrl = pathname.includes(MOUNT)
    ? `${origin}${pathname.replace(MOUNT, SIBLING)}`
    : null;

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-[var(--color-primary)]" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)]">
          {t('mobile.title')}
        </h2>
      </div>

      <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
        {onLan ? t('mobile.onLan') : t('mobile.hint')}
      </p>

      {onLan ? (
        <CopyRow value={`${origin}${pathname}`} label={t('mobile.copy')} />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
            {t('mobile.launcher')}
          </p>
          <CopyRow value={LAUNCH_COMMAND} label={t('mobile.copy')} />
        </>
      )}

      {onLan && siblingUrl && (
        <a
          href={siblingUrl}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
        >
          <ExternalLink className="w-4 h-4" />
          {t('mobile.sibling')}
        </a>
      )}

      <p className="flex items-start gap-1.5 text-xs text-slate-400 dark:text-[var(--color-text-muted)]">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {t('mobile.privacy')}
      </p>
    </div>
  );
}
