import React, { useState } from 'react';
import { Sparkles, ShieldAlert, Brain, Tag, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';

export default function AIInsightsPanel({ meta }) {
  const { updateSummary, imdbId } = useAnalysis();
  const summary = meta?.summary;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const handleRefresh = async () => {
    const id = meta?.imdb_id || meta?.imdbId || imdbId;
    if (!id) return;
    setRefreshing(true);
    setRefreshError(null);
    setJustRefreshed(false);
    try {
      const res = await fetch(`/api/metadata/${encodeURIComponent(id)}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Failed to generate summary (${res.status})`);
      }
      const data = await res.json();
      if (data?.summary) {
        updateSummary(data.summary);
        setJustRefreshed(true);
        setTimeout(() => setJustRefreshed(false), 3000);
      }
    } catch (err) {
      setRefreshError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (!summary) {
    return (
      <div className="ui-card rounded-2xl p-10 text-center">
        <Brain className="w-10 h-10 text-neutral-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white">No AI Insights yet</h3>
        <p className="text-sm text-neutral-400 mt-1 max-w-lg mx-auto mb-6">
          Generate an AI synopsis, logline, thematic breakdown, and compliance analysis using Google Gemini.
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 bg-white hover:bg-neutral-200 text-black px-6 py-3 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {refreshing ? 'Generating AI Summary…' : 'Generate AI Summary Now'}
        </button>
        {refreshError && (
          <p className="text-xs text-red-400 mt-3">{refreshError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Synopsis full-width gradient */}
      <div className="ui-card ui-card--top rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff]/10 via-transparent to-[#404040]/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-white text-black">
                <Sparkles className="w-4 h-4" /> Synopsis
              </span>
              {summary.model && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                  <Brain className="w-3.5 h-3.5" /> {summary.model}
                </span>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
              title="Re-generate summary using Google Gemini"
            >
              {refreshing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : justRefreshed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {refreshing ? 'Regenerating…' : justRefreshed ? 'Updated!' : 'Regenerate'}
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-medium leading-relaxed tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-neutral-300">
            {summary.synopsis || 'No synopsis generated.'}
          </h2>

          {summary.logline && (
            <div className="mt-2 border-l-2 border-white/20 pl-4 py-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-0.5">Logline</span>
              <p className="text-sm sm:text-base text-neutral-300 italic leading-snug">{summary.logline}</p>
            </div>
          )}

          {refreshError && (
            <p className="text-xs text-red-400 mt-2">{refreshError}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Themes */}
        <div className="ui-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-[#ffffff]" /> Themes
          </h3>
          {Array.isArray(summary.themes) && summary.themes.length ? (
            <div className="flex flex-wrap gap-2">
              {summary.themes.map((t, i) => (
                <span key={i} className="chip chip-neutral hover:bg-white/10 transition-colors cursor-default">{t}</span>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-500 italic">No themes extracted.</p>}
        </div>

        {/* Compliance */}
        <div className="ui-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-[#ffffff]" /> Compliance Flags
          </h3>
          {Array.isArray(summary.compliance_flags) && summary.compliance_flags.length && summary.compliance_flags[0].toLowerCase() !== 'none' ? (
            <div className="flex flex-wrap gap-2">
              {summary.compliance_flags.map((c, i) => (
                <span key={i} className="chip chip-crimson flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> {c}
                </span>
              ))}
            </div>
          ) : (
            <span className="chip chip-teal">No compliance issues flagged</span>
          )}
        </div>
      </div>

      {summary.characters && (
        <div className="ui-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-3">AI Character Notes</h3>
          <p className="text-sm text-neutral-300 leading-relaxed">{typeof summary.characters === 'string' ? summary.characters : JSON.stringify(summary.characters)}</p>
        </div>
      )}
    </div>
  );
}
