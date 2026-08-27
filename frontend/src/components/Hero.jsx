import React from 'react';
import { ArrowRight, PlayCircle } from 'lucide-react';

const POSTERS = [
  '/posters/969681-spider-man-brand-new-day.webp',
  '/posters/1368337-the-odyssey.webp',
  '/posters/1288445-mutiny.webp',
  '/posters/1323244-rage-of-stars.webp',
  '/posters/1621552-facing-el-chapo.webp',
  '/posters/1084244-toy-story-5.webp',
  '/posters/1339713-obsession.webp',
  '/posters/1108427-moana.webp',
  '/posters/634649-spider-man-no-way-home.webp',
  '/posters/1315772-minions-monsters.webp',
  '/posters/1375646-colony.webp',
  '/posters/82023-hotel-desire.webp',
  '/posters/1212763-evil-dead-burn.webp',
  '/posters/391312-mourning-wife.webp',
  '/posters/1284465-the-death-of-robin-hood.webp',
  '/posters/1083381-backrooms.webp',
  '/posters/1232569-pinocchio-unstrung.webp',
  '/posters/1275779-disclosure-day.webp',
  '/posters/1130948-rosebush-pruning.webp',
  '/posters/1284041-the-last-house.webp'
];

export default function Hero({ onTryApp }) {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center pt-32 pb-20 overflow-hidden bg-[#050505] text-white border-b border-white/5">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        .animate-marquee-reverse {
          animation: marquee 65s linear infinite reverse;
        }
      `}</style>

      {/* Tilted Ambient Background Marquee */}
      <div className="absolute top-[-30%] left-[-10%] w-[120%] h-[160%] pointer-events-none z-0 opacity-60 -rotate-[12deg] flex flex-col justify-center gap-6">
        <div className="flex gap-6 w-max animate-marquee">
          {[...POSTERS, ...POSTERS, ...POSTERS].map((src, i) => (
            <div key={`row1-${i}`} className="w-[180px] md:w-[240px] shrink-0 rounded-2xl overflow-hidden aspect-[2/3] bg-[#0a0a0a] border border-white/5 shadow-2xl">
              <img src={src} alt="Poster" className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
            </div>
          ))}
        </div>
        <div className="flex gap-6 w-max animate-marquee-reverse ml-[-20%]">
          {[...POSTERS].reverse().concat([...POSTERS].reverse(), [...POSTERS].reverse()).map((src, i) => (
            <div key={`row2-${i}`} className="w-[180px] md:w-[240px] shrink-0 rounded-2xl overflow-hidden aspect-[2/3] bg-[#0a0a0a] border border-white/5 shadow-2xl">
              <img src={src} alt="Poster" className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
            </div>
          ))}
        </div>
      </div>

      {/* Gradients to blend the marquee into the background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/10 via-[#050505]/60 to-[#050505] z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] z-0 pointer-events-none" />
      
      {/* Background radial glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Headline & Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center mt-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight mb-6 font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-500 drop-shadow-sm">
          From Content Overload <span className="text-neutral-500">To Content Intelligence</span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-neutral-400 font-normal leading-relaxed mb-10 drop-shadow-md">
          Transforming unstructured transcripts into searchable, actionable insights. Media teams generate transcripts faster than people can review them — ScriptTagger makes it instant and consistent.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={onTryApp}
            className="bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-neutral-200 transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95"
          >
            Try the App
          </button>
          <button className="bg-black/50 backdrop-blur-md text-white px-8 py-3.5 rounded-full font-medium border border-white/20 hover:bg-white/10 transition-all flex items-center gap-2 shadow-xl">
            Explore Documentation
          </button>
        </div>
      </div>
    </section>
  );
}