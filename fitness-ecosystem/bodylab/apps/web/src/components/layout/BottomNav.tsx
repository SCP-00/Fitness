import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, User, TrendingUp, MoreHorizontal } from 'lucide-react';

/**
 * BottomNav — Mobile-only bottom navigation
 * 
 * Replaces sidebar on screens < 768px.
 * Shows 5 items: Overview, Measure (primary), Body, Progress, More
 */

const navItems = [
  { to: '/', icon: LayoutDashboard, label: { en: 'Overview', es: 'Resumen' } },
  { to: '/body', icon: User, label: { en: 'Body', es: 'Cuerpo' } },
  { to: '/measure', icon: Plus, label: { en: 'Measure', es: 'Medir' }, isCenter: true },
  { to: '/progress', icon: TrendingUp, label: { en: 'Progress', es: 'Progreso' } },
  { to: '/settings', icon: MoreHorizontal, label: { en: 'More', es: 'Más' } },
];

export default function BottomNav({ language }: { language: 'en' | 'es' }) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-border)]  md:hidden">
      <div className="flex items-center justify-around px-1 sm:px-2 py-1 safe-area-pb">
        {navItems.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-3 py-2 rounded-xl transition-all ${
                item.isCenter
                  ? 'relative -mt-4'
                  : isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-[var(--color-text-muted)] hover:text-slate-600 dark:hover:text-[var(--color-text)]'
              }`}
            >
              {item.isCenter ? (
                <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <item.icon className="w-6 h-6" strokeWidth={1.75} />
              )}
              <span className={`text-[11px] font-medium max-w-full truncate ${item.isCenter ? 'text-indigo-600 dark:text-indigo-400 mt-1' : ''}`}>
                {item.label[language]}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
