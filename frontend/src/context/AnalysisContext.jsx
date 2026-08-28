import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children, imdbId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    if (!imdbId) return;
    setLoading(true);
    setError(null);
    try {
      const raw = String(imdbId).trim();
      // decode URI component (route may contain encoded title)
      const decoded = decodeURIComponent(raw);
      const result = await api.getAnalysis(decoded);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [imdbId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const refetch = useCallback(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return (
    <AnalysisContext.Provider value={{ data, loading, error, refetch, imdbId }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return ctx;
}