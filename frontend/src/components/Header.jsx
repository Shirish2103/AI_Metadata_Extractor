import React from 'react';
import { Clapperboard, Menu, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Header({ apiConnected, variant = 'landing', onBack }) {
  if (variant === 'app') {
    return (
      <header className="bg-[#050505]/90 backdrop-blur border-b border-white/10 sticky top-0 z-20 px-5 sm:px-6 py-3 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack} 
                className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white"
                aria-label="Back to landing page"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#ffffff] via-[#a3a3a3] to-[#404040] flex items-center justify-center text-white shadow-[0_6px_18px_-6px_rgba(229,72,77,0.6)]">
                <Clapperboard className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl tracking-wide text-white">ScriptTagger</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-white/5 text-white border border-white/10 uppercase tracking-wider">
                    Screenplay Analyzer
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs" role="status" aria-live="polite">
              <span className={cn('h-2 w-2 rounded-full', apiConnected ? 'bg-[#ffffff]' : 'bg-[#ffffff]')} aria-hidden="true" />
              <span className="text-neutral-400 font-medium">{apiConnected ? 'System Online' : 'Connecting…'}</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="absolute top-0 w-full z-20 px-4 sm:px-6 py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 text-white">
          <Clapperboard className="w-8 h-8" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-sans font-bold tracking-tight text-xl hidden sm:block">ScriptTagger</span>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-2 bg-[#1A1A1A]/80 backdrop-blur-md rounded-full p-1.5 border border-white/10">
          <nav className="hidden md:flex items-center px-5 gap-6 text-sm font-medium text-neutral-300">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#" className="hover:text-white transition-colors">Portfolio</a>
            <a href="#" className="hover:text-white transition-colors">Blog</a>
          </nav>
          <button className="h-10 w-10 flex items-center justify-center bg-[#2A2A2A] rounded-full text-white hover:bg-[#3A3A3A] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}