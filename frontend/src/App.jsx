import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';

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
      <Routes>
        <Route path="/" element={<LandingPage apiConnected={apiConnected} />} />
        <Route path="/app" element={<AppPage apiConnected={apiConnected} />} />
      </Routes>
    </BrowserRouter>
  );
}