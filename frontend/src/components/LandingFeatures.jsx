import React from 'react';
import { Search, Users, Smile, Mic, Clapperboard, Film } from 'lucide-react';

export default function LandingFeatures() {
  const features = [
    {
      title: "Topics & Keywords",
      subtitle: "Identify the main topics and important keywords.",
      icon: Search,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
    },
    {
      title: "Named Entities",
      subtitle: "Detect people, locations, organizations and more.",
      icon: Users,
      image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
    },
    {
      title: "Sentiment & Emotion",
      subtitle: "Understand the sentiment and underlying emotions.",
      icon: Smile,
      image: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330",
    },
    {
      title: "Speaker Identification",
      subtitle: "Identify who is speaking and map dialogues.",
      icon: Mic,
      image: "https://images.unsplash.com/photo-1589903308904-1010c2294adc",
    },
    {
      title: "Scene & Time",
      subtitle: "Break transcript into scenes with estimated timestamps.",
      icon: Clapperboard,
      image: "https://images.unsplash.com/photo-1485846234645-a62644f84728",
    },
    {
      title: "Content Classification",
      subtitle: "Classify the content into one or more genres.",
      icon: Film,
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
    },
  ];

  return (
    <section className="py-24 bg-[#050505] text-white border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-4 font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-500">
            One Transcript: Six Intelligence Layers
          </h2>
          <div className="text-sm font-bold tracking-widest text-neutral-500 uppercase mb-4">Core Capabilities</div>
          <p className="text-neutral-400 max-w-xl text-sm md:text-base leading-relaxed">
            One goal: Turn unstructured transcripts into intelligent, actionable metadata powering media workflows across the industry.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-3 pb-8 flex flex-col items-center group transition-colors hover:bg-[#0f0f0f]">
              <div className="w-full relative rounded-2xl overflow-hidden border border-white/5 bg-black aspect-[4/3] mb-8">
                <img src={feat.image} alt={feat.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90" />
                <div className="absolute top-4 left-4">
                   <div className="px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center gap-2">
                     <span className="text-xs font-bold text-white/50">0{i + 1}</span>
                     <feat.icon className="w-4 h-4 text-white/90" />
                   </div>
                </div>
              </div>
              <div className="text-center px-4 flex flex-col items-center">
                <h3 className="text-2xl font-medium tracking-tight mb-2">{feat.title}</h3>
                <p className="text-sm text-neutral-500 font-medium">{feat.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
