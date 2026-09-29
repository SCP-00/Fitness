import { Suspense, lazy, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/store';
import { ThemeProvider } from './lib/theme-context';
import { useGlobalShortcuts } from './lib/shortcuts';
import Layout from './components/layout/Layout';
import Onboarding from './components/Onboarding';

// Route-level code splitting: each page (and its heavy vendor deps — JSZip on
// /data, Recharts on /progress, the 3D stack on /body) ships as its own chunk
// and only loads when the route is first visited.
const Overview = lazy(() => import('./pages/Overview'));
const Measure = lazy(() => import('./pages/Measure'));
const MeasurementHistory = lazy(() => import('./pages/Measurements'));
const BodyView = lazy(() => import('./pages/BodyView'));
const Progress = lazy(() => import('./pages/Progress'));
const ExportImport = lazy(() => import('./pages/ExportImport'));
const References = lazy(() => import('./pages/References'));
const Settings = lazy(() => import('./pages/Settings'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-label="Loading page">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const [onboardingDone, setOnboardingDone] = useState(() => {
    return localStorage.getItem('bodylab-onboarding-done') === 'true';
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem('bodylab-onboarding-done', 'true');
    setOnboardingDone(true);
  };

  if (!onboardingDone) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // HashRouter: routing survives a hard reload on ANY static host and inside
  // the Tauri WebView without server rewrites. Required for GitHub Pages
  // project sites (no 404 rewrites) and correct for a local-first app.
  return (
    <HashRouter>
      <GlobalShortcuts />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Primary navigation */}
            <Route path="/" element={<Overview />} />
            <Route path="/measure" element={<Measure />} />
            <Route path="/history" element={<MeasurementHistory />} />
            <Route path="/body" element={<BodyView />} />
            <Route path="/progress" element={<Progress />} />

            {/* Secondary navigation */}
            <Route path="/references" element={<References />} />
            <Route path="/data" element={<ExportImport />} />
            <Route path="/settings" element={<Settings />} />

            {/* Legacy routes (backward compatibility) */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/measurements" element={<Navigate to="/history" replace />} />
            <Route path="/export" element={<Navigate to="/data" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

/** Keyboard registry (§104) — must live inside the router to navigate. */
function GlobalShortcuts() {
  useGlobalShortcuts();
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}