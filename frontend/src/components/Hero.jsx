import React from 'react';
import { ArrowRight, PlayCircle } from 'lucide-react';

export default function Hero({ onTryApp }) {
  return (
    <section className="relative pt-40 pb-20 overflow-hidden bg-[#050505] text-white flex flex-col items-center border-b border-white/5">
      {/* Background radial gradient */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-white/[0.03] rounded-full blur-[100px] pointer-events-none" />

      {/* Headline */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-medium tracking-tight leading-[1.05] mb-6 font-sans">
          ScriptTagger AI
          <br />
          Metadata Extractor
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-neutral-400 font-normal leading-relaxed mb-10">
          Presenting ScriptTagger, the ultimate AI-powered screenplay metadata extraction pipeline. Turn raw scripts into structured insights.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={onTryApp}
            className="bg-white text-black px-7 py-3 rounded-full font-medium hover:bg-neutral-200 transition-colors flex items-center gap-2"
          >
            Try the App
          </button>
          <button className="bg-transparent text-white px-7 py-3 rounded-full font-medium border border-white/20 hover:bg-white/5 transition-colors flex items-center gap-2">
            Explore Documentation
          </button>
        </div>
      </div>

      {/* Isometric Mockup Grid Simulation */}
      <div className="relative w-full max-w-[1400px] mx-auto mt-24 px-4 hidden sm:block h-[400px] overflow-hidden">
        {/* Perspective wrapper */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-[120%] grid grid-cols-4 gap-6 opacity-80"
          style={{ transform: 'perspective(1200px) rotateX(45deg) rotateY(0deg) scale(1.1) translateY(40px)' }}
        >
          {/* Mockup Cards */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 aspect-[4/5] flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${i % 2 === 0 ? '-translate-y-12' : ''}`}>
               <div className="flex items-center justify-between">
                 <div className="h-4 w-1/3 bg-white/10 rounded-full" />
                 <div className="h-4 w-4 bg-white/10 rounded-full" />
               </div>
               <div className="flex-1 rounded-xl overflow-hidden relative bg-neutral-900 border border-white/5">
                 <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/50 to-neutral-900/50" />
                 <div className="absolute bottom-4 left-4 right-4 h-16 bg-white/5 rounded-lg border border-white/5" />
               </div>
               <div className="h-3 w-2/3 bg-white/10 rounded-full mt-2" />
               <div className="h-3 w-1/2 bg-white/10 rounded-full" />
            </div>
          ))}
        </div>
        
        {/* Bottom fade to seamlessly transition into the app section */}
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#050505] to-transparent z-10" />
      </div>
    </section>
  );
}