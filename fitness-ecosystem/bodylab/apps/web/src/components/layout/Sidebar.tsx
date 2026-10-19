import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Plus, User, TrendingUp, Ruler,
  Target, Database, Settings, Globe, WifiOff
} from 'lucide-react';
import { useApp } from '../../lib/store';
import { ROUTE_SHORTCUTS } from '../../lib/shortcuts';
import ThemeToggle from '../ThemeToggle';

/**
 * Sidebar — Primary navigation (spec §7, reworked 2026-10-07)
 *
 * v3 shell: grouped rows with an icon chip, an accent indicator bar on the
 * active row and a gradient pill for the single primary action. The route
 * list, the keyboard shortcuts and the bilingual labels are unchanged — this
 * is form only (see docs/UI_DESIGN.md "what we deliberately don't do": no
 * hamburger, every destination always visible).
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
        className="bl-btn bl-btn-primary bl-nav-cta w-full"
      >
        <Icon className="w-[18px] h-[18px]" />
        <span>{text}</span>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={shortcut ? `${text} (${shortcut})` : text}
      className={({ isActive: active }) =>
        `bl-nav-item ${active ? 'is-active' : ''}`
      }
    >
      <span className="bl-nav-icon">
        <Icon className="w-[17px] h-[17px]" />
      </span>
      <span>{text}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { state, setLanguage } = useApp();

  return (
    <aside className="w-[248px] shrink-0 bg-[var(--color-sidebar-bg)] backdrop-blur-xl border-r border-[var(--color-sidebar-border)] flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          {/* The real app mark (resources/brand/bodylab-icon.jpg), rasterised by
              scripts/render-brand-icons.mjs — same asset the tab icon uses. */}
          <img
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            width={38}
            height={38}
            className="w-[38px] h-[38px] rounded-[11px] shrink-0 shadow-[var(--elev-1)]"
          />
          <div className="min-w-0">
            <span className="block font-extrabold text-[15.5px] text-[var(--color-text)] tracking-[-0.02em] leading-tight">
              BodyLab
            </span>
            <span className="block text-[11px] text-[var(--color-text-muted)] leading-tight mt-0.5">
              {state.language === 'es' ? 'Análisis corporal' : 'Body Analysis'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <p className="bl-nav-group">
          {state.language === 'es' ? 'Hoy' : 'Today'}
        </p>
        {primaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="pt-2.5">
          {actionNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        <p className="bl-nav-group">
          {state.language === 'es' ? 'Análisis' : 'Analysis'}
        </p>
        {secondaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="my-2.5 border-t border-[var(--color-sidebar-border)]" />

        {tertiaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Theme + Language */}
      <div className="px-3 pb-3 pt-2 space-y-2">
        <ThemeToggle />
        <div className="flex items-center gap-1 bg-[var(--color-surface-sunken)] p-1 rounded-[var(--radius-lg)]">
          <button
            onClick={() => setLanguage('en')}
            aria-pressed={state.language === 'en'}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all ${
              state.language === 'en'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--elev-1)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <Globe className="w-3 h-3" />
            EN
          </button>
          <button
            onClick={() => setLanguage('es')}
            aria-pressed={state.language === 'es'}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all ${
              state.language === 'es'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--elev-1)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <Globe className="w-3 h-3" />
            ES
          </button>
        </div>
      </div>

      {/* Local • Offline */}
      <div className="px-4 py-3.5 border-t border-[var(--color-sidebar-border)]">
        <span className="bl-status">
          <WifiOff className="w-3.5 h-3.5" />
          {state.language === 'es' ? 'Local · Sin conexión' : 'Local · Offline'}
        </span>
      </div>
    </aside>
  );
}
