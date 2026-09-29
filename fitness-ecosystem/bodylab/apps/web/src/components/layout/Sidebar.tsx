import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Plus, User, TrendingUp, Ruler,
  Target, Database, Settings, Globe, WifiOff
} from 'lucide-react';
import { useApp } from '../../lib/store';
import { ROUTE_SHORTCUTS } from '../../lib/shortcuts';
import ThemeToggle from '../ThemeToggle';

/**
 * Sidebar — Primary navigation (spec §7)
 *
 * Product v2: light-first neutral surface, hairline divider, one soft indigo
 * active pill per section (no near-black blocks), Measure as the single filled
 * CTA, and "Local • Offline" always visible.
 */

const primaryNav = [
  { to: '/', icon: LayoutDashboard, label: { en: 'Overview', es: 'Resumen' } },
];

const actionNav = [
  { to: '/measure', icon: Plus, label: { en: 'Measure', es: 'Medir' }, isAction: true },
];

const secondaryNav = [
  { to: '/body', icon: User, label: { en: 'Body', es: 'Cuerpo' } },
  { to: '/progress', icon: TrendingUp, label: { en: 'Progress', es: 'Progreso' } },
  { to: '/history', icon: Ruler, label: { en: 'History', es: 'Historial' } },
];

const tertiaryNav = [
  { to: '/references', icon: Target, label: { en: 'Reference', es: 'Referencia' } },
  { to: '/data', icon: Database, label: { en: 'Data', es: 'Datos' } },
  { to: '/settings', icon: Settings, label: { en: 'Settings', es: 'Ajustes' } },
];

function NavItem({
  to,
  icon: Icon,
  label,
  isAction = false,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: { en: string; es: string };
  isAction?: boolean;
}) {
  const { state } = useApp();
  const text = label[state.language];

  const shortcut = ROUTE_SHORTCUTS[to];

  if (isAction) {
    return (
      <NavLink
        to={to}
        title={shortcut ? `${text} (${shortcut})` : undefined}
        className="flex items-center gap-3 px-4 h-11 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors duration-150 shadow-sm"
      >
        <Icon className="w-5 h-5" />
        <span className="text-sm font-semibold">{text}</span>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={shortcut ? `${text} (${shortcut})` : undefined}
      className={({ isActive: active }) =>
        `flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors duration-150 ${
          active
            ? 'bg-[var(--color-sidebar-active)] text-[var(--color-primary)] font-semibold'
            : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-text-active)]'
        }`
      }
    >
      <Icon className="w-[18px] h-[18px]" />
      <span>{text}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { state, setLanguage } = useApp();

  return (
    <aside className="w-60 shrink-0 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          {/* The real app mark (resources/brand/bodylab-icon.jpg), rasterised by
              scripts/render-brand-icons.mjs — same asset the tab icon uses. */}
          <img
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl shrink-0"
          />
          <div className="min-w-0">
            <span className="block font-bold text-[15px] text-[var(--color-text)] tracking-tight leading-tight">BodyLab</span>
            <span className="block text-[11px] text-[var(--color-text-muted)] leading-tight mt-0.5">
              {state.language === 'es' ? 'Análisis corporal' : 'Body Analysis'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {primaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="pt-2 pb-3">
          {actionNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        {secondaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="my-3 border-t border-[var(--color-sidebar-border)]" />

        {tertiaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Theme + Language */}
      <div className="px-3 pb-3 space-y-2">
        <ThemeToggle />
        <div className="flex items-center gap-1 bg-[var(--color-surface-sunken)] p-1 rounded-lg">
          <button
            onClick={() => setLanguage('en')}
            aria-pressed={state.language === 'en'}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              state.language === 'en'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Globe className="w-3 h-3" />
            EN
          </button>
          <button
            onClick={() => setLanguage('es')}
            aria-pressed={state.language === 'es'}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              state.language === 'es'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Globe className="w-3 h-3" />
            ES
          </button>
        </div>
      </div>

      {/* Local • Offline */}
      <div className="px-5 py-3.5 border-t border-[var(--color-sidebar-border)]">
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-[var(--color-success)]" />
          <span className="text-xs text-[var(--color-text-muted)]">
            {state.language === 'es' ? 'Local · Sin conexión' : 'Local · Offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
