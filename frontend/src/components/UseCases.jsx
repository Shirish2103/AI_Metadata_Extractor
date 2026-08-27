import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function UseCases() {
  const cases = [
    {
      title: "Content Tagging",
      description: "Replace manual data entry with instant metadata generation for massive transcript volumes.",
      image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d",
    },
    {
      title: "Media Archival",
      description: "Transform unstructured text into highly searchable archives using named entities.",
      image: "https://images.unsplash.com/photo-1578022761797-b8636ac1773c",
    },
    {
      title: "Post-Production",
      description: "Integrate directly into post-production pipelines to organize content seamlessly.",
      image: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0",
    },
    {
      title: "Automated Moderation",
      description: "Detect sentiment and tone to automatically flag or categorize scenes.",
      image: "https://images.unsplash.com/photo-1616469829941-c7200edec809",
    }
  ];

  return (
    <section className="py-32 bg-[#050505] text-white border-b border-white/5 relative">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mb-16 gap-6">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6 font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-500">
              Built for Modern Media
            </h2>
            <p className="text-neutral-400 text-lg md:text-xl leading-relaxed mx-auto">
              Powering intelligent workflows across the industry. Whether you're managing a massive archive or streamlining post-production, ScriptTagger brings structure to the chaos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cases.map((item, i) => (
            <div key={i} className="relative rounded-3xl bg-[#0a0a0a] border border-white/10 overflow-hidden group h-[300px] sm:h-[400px]">
              <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-medium tracking-tight mb-3 text-white">{item.title}</h3>
                    <p className="text-base text-neutral-300 leading-relaxed max-w-sm">{item.description}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-black transition-colors shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
