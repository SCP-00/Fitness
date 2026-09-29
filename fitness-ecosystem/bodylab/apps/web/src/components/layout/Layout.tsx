import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useApp } from '../../lib/store';

export default function Layout() {
  const { state } = useApp();

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav language={state.language} />
    </div>
  );
}
