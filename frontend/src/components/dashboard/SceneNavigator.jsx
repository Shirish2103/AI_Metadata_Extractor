import React, { useState, useEffect, useRef } from 'react';
import { Film, MapPin, Clock, Users, Tag, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function SceneNavigator({ segments }) {
  const [idx, setIdx] = useState(0);
  const detailRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIdx((v) => Math.min(v + 1, segments.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIdx((v) => Math.max(v - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [segments.length]);

  if (!segments || segments.length === 0) {
    return (
      <div className="ui-card rounded-xl p-10 text-center">
        <Film className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
        <p className="text-sm text-neutral-400">No scene segments parsed.</p>
      </div>
    );
  }

  const cur = segments[Math.min(idx, segments.length - 1)] || segments[0];
  const dialogue = cur.dialogue || [];
  const topics = cur.topics || [];
  const sentiment = cur.sentiment || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      {/* Scene Index */}
      <div className="ui-card rounded-[24px] overflow-hidden flex flex-col max-h-[70vh] lg:max-h-[720px] shadow-2xl">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <span className="text-sm font-bold tracking-wide text-neutral-300 flex items-center gap-2"><Film className="w-4 h-4 text-neutral-400" /> Scene Index</span>
          <span className="text-[11px] font-mono text-neutral-500 bg-white/5 px-2 py-1 rounded-full">{idx + 1} / {segments.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {segments.map((s, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                'w-full text-left rounded-xl p-4 transition-all duration-300 flex flex-col gap-2 group',
                i === idx
                  ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-lg shadow-black/20'
                  : 'bg-transparent border border-transparent hover:bg-white/[0.04] hover:border-white/5'
              )}
              aria-current={i === idx ? 'true' : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center min-w-[28px]', i===idx ? 'bg-white text-black' : 'bg-white/10 text-neutral-400 group-hover:text-white transition-colors')}>
                  {s.segment_id || i + 1}
                </span>
                <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1 group-hover:text-neutral-400 transition-colors">
                  <Clock className="w-3 h-3" /> {s.start} – {s.end}
                </span>
              </div>
              <div className={cn("text-sm font-medium leading-snug line-clamp-2 transition-colors", i===idx ? 'text-white' : 'text-neutral-300 group-hover:text-white')}>
                {s.heading || s.location || `Scene ${i + 1}`}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {s.location && <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">{s.location}</span>}
                {s.time_of_day && <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">{s.time_of_day}</span>}
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/5 flex items-center justify-between gap-2">
          <button
            onClick={() => setIdx((v) => Math.max(v - 1, 0))}
            disabled={idx === 0}
            className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-40 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
            aria-label="Previous scene (J or ←)"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() => setIdx((v) => Math.min(v + 1, segments.length - 1))}
            disabled={idx === segments.length - 1}
            className="flex-1 py-2 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 hover:bg-neutral-100 transition-colors"
            aria-label="Next scene (K or →)"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected scene detail */}
      <div ref={detailRef} className="ui-card rounded-[24px] p-6 sm:p-8 flex flex-col gap-6 animate-fade-in shadow-2xl">
        <div className="flex flex-col gap-3 pb-6 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-neutral-400">
            <span className="text-black bg-white px-2 py-0.5 rounded-full shadow-sm">Scene {cur.segment_id || idx + 1}</span>
            <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10"><Clock className="w-3 h-3" /> {cur.start} – {cur.end}</span>
          </div>
          
          <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mt-1 leading-tight drop-shadow-md break-words">
            {cur.heading || 'UNNAMED SCENE'}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {cur.location && <span className="px-2.5 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {cur.location}</span>}
            {cur.time_of_day && <span className="px-2.5 py-1 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {cur.time_of_day}</span>}
            {cur.interior !== null && cur.interior !== undefined && <span className="px-2.5 py-1 bg-white/10 text-white border border-white/20 rounded-lg text-xs font-semibold">{cur.interior ? 'INT' : 'EXT'}</span>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05] shadow-inner">
            <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-500 flex items-center gap-1.5 mb-3"><Users className="w-3.5 h-3.5" /> Speakers</div>
            <div className="flex flex-wrap gap-1.5">
              {cur.speakers?.length ? cur.speakers.map((sp, i) => <span key={i} className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium">{sp}</span>) : <span className="text-xs text-neutral-500 italic">No speakers</span>}
            </div>
          </div>
          <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05] shadow-inner">
            <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-500 flex items-center gap-1.5 mb-3"><Tag className="w-3.5 h-3.5" /> Topics</div>
            <div className="flex flex-wrap gap-1.5">
              {topics.length ? topics.slice(0,5).map((t,i)=><span key={i} className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-medium">{t.keyword}</span>) : <span className="text-xs text-neutral-500 italic">No topics</span>}
            </div>
          </div>
          <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05] shadow-inner">
            <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-500 flex items-center justify-between mb-3">
              <span>Tone &amp; Score</span>
              <span className="font-mono text-neutral-400">{(sentiment.compound||0).toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-1 rounded border text-xs font-medium ${sentiment.label==='positive'?'bg-emerald-500/10 text-emerald-300 border-emerald-500/20':sentiment.label==='negative'?'bg-rose-500/10 text-rose-300 border-rose-500/20':'bg-neutral-500/10 text-neutral-300 border-neutral-500/20'}`}>{sentiment.label||'neutral'}</span>
              {cur.emotion?.label && <span className="px-2 py-1 rounded bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 text-xs font-medium">{cur.emotion.label}</span>}
            </div>
          </div>
        </div>

        {/* Dialogue list */}
        <div className="mt-2">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Dialogue · {dialogue.length} lines
            <span className="text-[10px] font-mono text-neutral-500 ml-auto bg-white/5 px-2 py-1 rounded hidden sm:inline-block">j/k or ←/→ to scrub</span>
          </h4>
          {dialogue.length ? (
            <ul className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {dialogue.map((d,i)=>{
                const tone = d.sentiment?.label==='positive' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : d.sentiment?.label==='negative' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : null;
                return (
                  <li key={i} className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05] shadow-inner flex items-start gap-4 hover:bg-white/[0.04] transition-colors group">
                    <span className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-200 shrink-0 font-mono shadow-sm">
                      {(d.speaker||'?').charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">{d.speaker||'UNKNOWN'}</span>
                        {d.parenthetical && <span className="text-[11px] text-neutral-500 italic">({d.parenthetical})</span>}
                        {tone && <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border', tone)}>{d.sentiment.label}</span>}
                      </div>
                      <p className="text-sm text-neutral-200 leading-relaxed break-words">{d.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="bg-white/[0.02] rounded-2xl p-8 text-center text-sm text-neutral-400 border border-white/[0.05]">
              Dialogue lines not cached for this scene — re-analyze with dialogue included to view them.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
