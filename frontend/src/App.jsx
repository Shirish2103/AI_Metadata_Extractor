import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

export default function App() {
  const [apiConnected, setApiConnected] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      setApiConnected(res.ok);
    } catch {
      setApiConnected(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500 text-sm">Loading…</div>}>
        <Routes>
          <Route path="/" element={<LandingPage apiConnected={apiConnected} />} />
          <Route path="/app" element={<AppPage apiConnected={apiConnected} />} />
          <Route path="/dashboard/:id" element={<DashboardPage apiConnected={apiConnected} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}