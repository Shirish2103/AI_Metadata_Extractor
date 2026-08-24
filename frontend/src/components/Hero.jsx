import React from 'react';
import { Clapperboard } from 'lucide-react';

const FEATURES = [
  { label: '2,800+ Movie Scripts', chip: 'chip-crimson' },
  { label: 'Scene-by-Scene Analysis', chip: 'chip-amber' },
  { label: 'Sentiment & Emotion', chip: 'chip-teal' },
  { label: 'Optional LLM Synopsis', chip: 'chip-purple' },
];

export default function Hero() {
  return (
    <section className="mb-0">
      {/* Headline */}
      <div className="relative text-center px-4 pt-8 pb-4">
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E4DCCB] shadow-sm">
            <Clapperboard className="w-3.5 h-3.5 text-[#E5484D]" aria-hidden="true" />
            <span className="text-[10px] font-bold text-[#221E1A] tracking-[0.2em] uppercase">
              AI-Powered Screenplay Analytics
            </span>
          </div>
        </div>

        <h1 className="font-display text-6xl sm:text-7xl lg:text-[5.5rem] tracking-tight leading-[0.85] text-[#221E1A] drop-shadow-sm">
          Turn Scripts Into
          <br />
          <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-[#E5484D] via-[#f59e0b] to-[#0e9488]">
            Structured Metadata
          </span>
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-[#6E675B] leading-relaxed font-medium">
          ScriptTagger reads any screenplay transcript and extracts scenes, characters, key topics,
          tone and emotion — turning raw text into a clean, structured metadata report you can
          browse, copy or export.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {FEATURES.map((f) => (
            <span key={f.label} className={`chip ${f.chip} shadow-sm px-3 py-1`}>
              {f.label}
            </span>
          ))}
        </div>

        <div className="perf-strip max-w-xl mx-auto mt-6 opacity-80" aria-hidden="true" />
      </div>
    </section>
  );
}