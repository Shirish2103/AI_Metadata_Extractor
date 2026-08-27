import React from 'react';
import { Mic, BadgeCheck } from 'lucide-react';

export default function SpeakersGrid({ speakers }) {
  if (!speakers || speakers.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Mic className="w-4 h-4 text-[#E5484D]" aria-hidden="true" />
        Speaker Profile
        <span className="text-xs font-medium text-neutral-500">({speakers.length})</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {speakers.map((sp) => (
          <div key={sp.name} className="ui-card ui-card-hover rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-9 w-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-sm font-bold text-red-500 font-mono">
                {sp.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white truncate">{sp.name}</span>
                  {sp.is_lead && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-500" title="Lead role">
                      <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> LEAD
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-neutral-400 capitalize">
                  {sp.gender || 'unknown'} · {sp.role || 'unidentified'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Dialogue share</span>
                <span className="font-mono tnum text-neutral-400">{(sp.dialogue_percentage || 0).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E5484D] to-[#F59E0B]"
                  style={{ width: `${Math.min(sp.dialogue_percentage || 0, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                {sp.dialogue_count || 0} lines · {sp.words || 0} words
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}