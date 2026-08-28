import React, { useState, useEffect } from 'react';
import { Mic, X, MessageSquare, Hash, Heart, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getCharacterImages } from '../../lib/tmdb';

export default function SpeakerProfileGrid({ speakers = [], segments = [], imdbId }) {
  const [selected, setSelected] = useState(null);
  const [avatars, setAvatars] = useState({});

  useEffect(() => {
    if (imdbId && speakers.length > 0) {
      const names = speakers.map(s => s.name);
      getCharacterImages(imdbId, names).then(setAvatars).catch(console.error);
    }
  }, [imdbId, speakers]);

  if (!speakers || speakers.length === 0) {
    // fallback derive from segments speakers
    const derived = [...new Set(segments.flatMap((s) => s.speakers || []))].map((name) => ({ name, lines: 0, words: 0 }));
    if (derived.length === 0) {
      return (
        <div className="ui-card rounded-2xl p-10 text-center">
          <Mic className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">No speaker profiles available.</p>
        </div>
      );
    }
    speakers = derived;
  }

  // compute per-speaker sentiment arc if segments contain dialogue
  const getSpeakerLines = (name) => {
    const lines = [];
    segments.forEach((seg) => {
      (seg.dialogue || []).forEach((d) => {
        const norm = (d.speaker || '').trim().toUpperCase();
        if (norm === String(name).trim().toUpperCase() || norm.includes(String(name).trim().toUpperCase())) {
          lines.push({ ...d, scene: seg.segment_id || seg.scene_index });
        }
      });
    });
    return lines;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
          <Users className="w-7 h-7 text-indigo-400" /> Cast & Characters
          <span className="text-base font-medium text-neutral-500 px-3 py-0.5 bg-white/5 rounded-full border border-white/10 shadow-inner">{speakers.length}</span>
        </h3>
        <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-neutral-500 hidden sm:block">Click card for dialogue history</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {speakers.map((sp, idx) => {
          const lines = sp.lines ?? sp.dialogue_count ?? 0;
          const words = sp.words ?? 0;
          const pct = sp.dialogue_percentage ?? (speakers.length ? (lines / Math.max(...speakers.map((s) => s.lines || s.dialogue_count || 1)) * 100) : 0);
          const avatarUrl = avatars[sp.name];
          
          return (
            <button
              key={sp.name || idx}
              onClick={() => setSelected(sp)}
              className="ui-card rounded-[24px] p-5 text-left flex flex-col gap-4 group hover:bg-white/[0.04] transition-all duration-300 border border-white/[0.05] hover:border-indigo-500/30 shadow-xl"
            >
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={sp.name} className="h-12 w-12 rounded-2xl object-cover border border-indigo-500/30 shadow-sm group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-lg font-bold text-indigo-200 font-mono shadow-sm group-hover:scale-105 transition-transform duration-300">
                    {String(sp.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{sp.name}</div>
                  <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-500 flex items-center gap-1.5 mt-1">
                    <Hash className="w-3 h-3 text-neutral-600" /> {words ? `${words} words` : 'No word count'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <span>Dialogue share</span>
                  <span className="font-mono text-indigo-300">{pct?.toFixed?.(1) ?? '0.0'}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden shadow-inner">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(pct || 0, 100)}%` }} />
                </div>
                <p className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5 mt-1">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-500" /> {lines} lines · {words} words
                </p>
              </div>
              {/* placeholder network hint */}
              <div className="mt-2 pt-3 border-t border-white/[0.05] flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-neutral-500 group-hover:text-indigo-400 transition-colors">
                <Heart className="w-3 h-3" /> View Character Arc
              </div>
            </button>
          );
        })}
      </div>

      {/* Drawer / side panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setSelected(null)} />
          <div className="w-full max-w-xl bg-[#050505]/95 backdrop-blur-3xl border-l border-white/10 h-full overflow-y-auto animate-fade-in flex flex-col shadow-2xl">
            <div className="sticky top-0 bg-[#050505]/80 backdrop-blur-xl p-6 border-b border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                {avatars[selected.name] ? (
                  <img src={avatars[selected.name]} alt={selected.name} className="h-12 w-12 rounded-2xl object-cover border border-indigo-500/30 shadow-sm" />
                ) : (
                  <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-lg font-bold text-indigo-200 font-mono shadow-sm">
                    {String(selected.name).charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <div className="font-display text-2xl font-bold text-white leading-tight tracking-wide drop-shadow-sm">{selected.name}</div>
                  <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-500 mt-1 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-neutral-600" /> {selected.lines || selected.dialogue_count || 0} lines 
                    <span className="text-white/20">•</span> 
                    <Hash className="w-3 h-3 text-neutral-600" /> {selected.words || 0} words
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-neutral-400 hover:text-white transition-all shadow-sm" aria-label="Close drawer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Sentiment arc placeholder */}
              <div className="bg-white/[0.02] rounded-[24px] p-6 border border-white/[0.05] shadow-inner">
                <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-500 flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-indigo-400" /> Dialogue History
                </div>
                {(() => {
                  const lines = getSpeakerLines(selected.name);
                  if (!lines.length) return <p className="text-sm text-neutral-500 italic bg-white/5 p-4 rounded-xl border border-white/10 text-center">No dialogue lines cached for this character.</p>;
                  return (
                    <ul className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {lines.slice(0, 80).map((d, i) => {
                        const tone = d.sentiment?.label==='positive' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : d.sentiment?.label==='negative' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : null;
                        return (
                          <li key={i} className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors rounded-2xl p-4 border border-white/10 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Scene {d.scene ?? i + 1}</span>
                              {d.parenthetical && <span className="text-[11px] text-neutral-500 italic">({d.parenthetical})</span>}
                              {tone && (
                                <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ml-auto', tone)}>
                                  {d.sentiment.label}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-neutral-200 leading-relaxed font-medium">{d.text}</p>
                          </li>
                        );
                      })}
                      {lines.length > 80 && <li className="text-xs text-neutral-500 text-center mt-2 font-bold tracking-widest uppercase">+{lines.length - 80} more lines (truncated)</li>}
                    </ul>
                  );
                })()}
              </div>

              {/* Co-occurrence network simple */}
              <div className="bg-white/[0.02] rounded-[24px] p-6 border border-white/[0.05] shadow-inner">
                <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-500 flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-rose-400" /> Frequent Co-stars
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const co = new Set();
                    segments.forEach((seg) => {
                      if ((seg.speakers || []).map((s) => String(s).toUpperCase()).includes(String(selected.name).toUpperCase())) {
                        (seg.speakers || []).forEach((s) => { if (String(s).toUpperCase() !== String(selected.name).toUpperCase()) co.add(s); });
                      }
                    });
                    const coArr = [...co].slice(0, 8);
                    if (coArr.length === 0) return <span className="text-xs text-neutral-500 italic">No co-stars found</span>;
                    return coArr.map((c, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-neutral-300 uppercase tracking-wider shadow-sm">
                        {c}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
