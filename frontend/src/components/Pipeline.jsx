import React from 'react';
import { 
  Database, FileUp, Keyboard, 
  FileSearch, Clapperboard, 
  Users, ListTree, Box, Smile, 
  Film, 
  Settings, Zap, Layout, 
  Cpu
} from 'lucide-react';

const Node = ({ icon: Icon, title, desc }) => (
  <div className="flex items-center gap-3 lg:gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-300 group relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-black/60 border border-white/5 flex items-center justify-center shrink-0 shadow-inner">
       <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-neutral-400 group-hover:text-white transition-colors" />
    </div>
    <div className="relative z-10 pr-2 py-0.5">
      <div className="text-xs lg:text-sm font-semibold text-white tracking-wide whitespace-nowrap">{title}</div>
      <div className="text-[9px] lg:text-[10px] text-neutral-500 uppercase tracking-widest mt-1 whitespace-nowrap">{desc}</div>
    </div>
  </div>
);

const AnimatedConnection = () => (
  <>
    {/* Desktop Horizontal */}
    <div className="hidden lg:flex items-center justify-center w-12 xl:w-24 relative shrink-0">
       <div className="w-full h-px bg-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
       </div>
       <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-white/40 absolute right-0" />
    </div>
    {/* Mobile Vertical */}
    <div className="flex lg:hidden justify-center my-6 relative h-16 shrink-0">
       <div className="h-full w-px bg-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/80 to-transparent -translate-y-full animate-[shimmer-vertical_1.5s_infinite]" />
       </div>
       <div className="w-0 h-0 border-x-[4px] border-x-transparent border-t-[6px] border-t-white/40 absolute bottom-0" />
    </div>
  </>
);

export default function Pipeline() {
  return (
    <section className="py-32 bg-[#050505] text-white border-b border-white/5 relative overflow-hidden">
      {/* CSS for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes shimmer-vertical {
          100% { transform: translateY(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
      `}} />

      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-12 relative z-10">
        <div className="text-center mb-20 flex flex-col items-center">
       
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-500">
            Intelligence Pipeline
          </h2>
          <p className="text-neutral-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Data flows seamlessly from raw text into our multi-layered NLP engine, emerging as structured, production-ready metadata.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-6 lg:gap-0">
          
          {/* Phase 1: Ingestion */}
          <div className="flex-1 rounded-3xl bg-[#0a0a0a] border border-white/10 p-8 flex flex-col relative group shadow-2xl animate-float" style={{animationDelay: '0s'}}>
             <div className="text-xs font-bold tracking-widest text-white/80 uppercase mb-8 text-center">1. Ingestion</div>
             <div className="flex flex-col gap-4 justify-center h-full">
               <Node icon={Database} title="Movie Corpus" desc="Existing Library" />
               <Node icon={FileUp} title="Upload Script" desc=".txt or .pdf file" />
               <Node icon={Keyboard} title="Raw Text" desc="Pasted Input" />
             </div>
          </div>

          <AnimatedConnection />

          {/* Phase 2: Core Processing */}
          <div className="flex-[2.5] xl:flex-[2] rounded-3xl bg-[#0a0a0a] border border-white/10 p-8 flex flex-col relative group shadow-2xl animate-float" style={{animationDelay: '0.2s'}}>
             <div className="text-xs font-bold tracking-widest text-white/80 uppercase mb-8 text-center">2. NLP Engine</div>
             
             <div className="flex flex-col gap-6">
               {/* Parsers */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                 <Node icon={FileSearch} title="Parser" desc="Dialogue & Scene" />
                 <Node icon={Clapperboard} title="Segmentation" desc="Timestamps" />
               </div>
               
               {/* NLP Models */}
               <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 relative">
                 <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-4 text-center font-semibold">Parallel Analysis</div>
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                   <Node icon={Users} title="Speakers" desc="spaCy NER" />
                   <Node icon={ListTree} title="Topics" desc="TF-IDF + RAKE" />
                   <Node icon={Box} title="Entities" desc="spaCy NER" />
                   <Node icon={Smile} title="Sentiment" desc="VADER NLP" />
                 </div>
               </div>

               {/* Final classification */}
               <Node icon={Film} title="Genre Classification" desc="Multi-label Model" />
             </div>
          </div>

          <AnimatedConnection />

          {/* Phase 3: Delivery */}
          <div className="flex-1 rounded-3xl bg-[#0a0a0a] border border-white/10 p-8 flex flex-col relative group shadow-2xl animate-float" style={{animationDelay: '0.4s'}}>
             <div className="text-xs font-bold tracking-widest text-white/80 uppercase mb-8 text-center">3. Delivery</div>
             <div className="flex flex-col gap-4 justify-center h-full">
               <Node icon={Settings} title="Orchestrator" desc="Compiles JSON" />
               <Node icon={Zap} title="FastAPI Backend" desc="REST Endpoints" />
               <Node icon={Layout} title="React UI" desc="Visual Dashboard" />
             </div>
          </div>

        </div>
      </div>
    </section>
  );
}
