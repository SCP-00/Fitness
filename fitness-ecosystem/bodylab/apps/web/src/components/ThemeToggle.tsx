import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../lib/theme-context';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycle = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      title={`Theme: ${theme} (${resolvedTheme})`}
    >
      {theme === 'system' ? (
        <Monitor className="w-4 h-4" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
      <span className="text-xs">
        {theme === 'system' ? 'Auto' : resolvedTheme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
