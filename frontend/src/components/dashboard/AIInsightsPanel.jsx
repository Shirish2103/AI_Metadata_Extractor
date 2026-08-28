import React from 'react';
import { Sparkles, ShieldAlert, Brain, Tag } from 'lucide-react';

export default function AIInsightsPanel({ meta }) {
  const summary = meta?.summary;
  if (!summary) {
    return (
      <div className="ui-card rounded-2xl p-10 text-center">
        <Brain className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
        <h3 className="font-bold text-white">No AI Insights yet</h3>
        <p className="text-sm text-neutral-500 mt-1 max-w-lg mx-auto">
          Re-run analysis with <span className="text-white font-medium">LLM Synopsis</span> enabled to generate a synopsis, themes, compliance flags and model badge.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Synopsis full-width gradient */}
      <div className="ui-card ui-card--top rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff]/10 via-transparent to-[#404040]/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
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
          <h2 className="text-2xl sm:text-3xl font-medium leading-snug tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
            {summary.synopsis || 'No synopsis generated.'}
          </h2>
          {summary.logline && (
            <p className="text-sm text-neutral-400 italic border-l-2 border-white/10 pl-4">Logline: {summary.logline}</p>
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
          <p className="text-sm text-neutral-400 leading-relaxed">{typeof summary.characters === 'string' ? summary.characters : JSON.stringify(summary.characters)}</p>
        </div>
      )}
    </div>
  );
}
