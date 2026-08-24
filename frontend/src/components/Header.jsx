import React from 'react';
import { Clapperboard } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Header({ apiConnected }) {
  return (
    <header className="bg-white/90 backdrop-blur border-b border-[#E4DCCB] sticky top-0 z-20 px-5 sm:px-6 py-3 mb-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#E5484D] via-[#F59E0B] to-[#0E9488] flex items-center justify-center text-white shadow-[0_6px_18px_-6px_rgba(229,72,77,0.6)]">
            <Clapperboard className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl tracking-wide text-[#221E1A]">ScriptTagger</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#FBE9E9] text-[#C93B40] border border-[#F3C6C7] uppercase tracking-wider">
                Screenplay Analyzer
              </span>
            </div>
            <div className="perf-strip w-full max-w-[180px] mt-1" aria-hidden="true" />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F1EDE4] border border-[#E4DCCB] text-xs"
            role="status"
            aria-live="polite"
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                apiConnected ? 'bg-[#1FA45C]' : 'bg-[#E5484D]'
              )}
              aria-hidden="true"
            />
            <span className="text-[#6E675B] font-medium">
              {apiConnected ? 'System Online' : 'Connecting…'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}