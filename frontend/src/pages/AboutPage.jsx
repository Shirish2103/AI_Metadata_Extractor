import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Play, Pause } from 'lucide-react';

export default function AboutPage({ apiConnected }) {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const audioRef = useRef(null);

  const teamMembers = [
    { name: 'Shrish Tiwari', role: 'TEAM LEAD' },
    { name: 'Shaury Chaudhary', role: 'LEAD ARCHITECT' },
    { name: 'Pragya Badhauria', role: 'FRONTEND ENGINEER' },
    { name: 'Mohammad Asshar', role: 'BACKEND ENGINEER' },
    { name: 'Kunal', role: 'NLP SPECIALIST' },
    { name: 'Rishi Mani', role: 'DATA ENGINEER' },
    { name: 'Kashish', role: 'UI/UX DESIGNER' },
    { name: 'Krish', role: 'QA ENGINEER' },
  ];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!hasStarted) {
      setHasStarted(true);
    }
    
    if (!isPlaying) {
      audioRef.current?.play().catch(e => console.log("Audio play failed:", e));
    } else {
      audioRef.current?.pause();
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-300 font-sans overflow-hidden flex flex-col relative selection:bg-white/20">
      
      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src="/hotel_california_solo.mp3"
        preload="auto" 
        loop 
      />

      {/* Cinematic Letterboxing (Top & Bottom black bars) */}
      <div className="fixed top-0 left-0 w-full h-[12vh] bg-black z-[100] pointer-events-none shadow-[0_20px_40px_rgba(0,0,0,1)]" />
      <div className="fixed bottom-0 left-0 w-full h-[12vh] bg-black z-[100] pointer-events-none shadow-[0_-20px_40px_rgba(0,0,0,1)]" />

      {/* Theater Screen Glow & Film Grain simulation */}
      <div className="fixed inset-0 pointer-events-none bg-black z-0" />
      
      {/* Intense Center Projector Beam */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_100%_100%_at_50%_-10%,rgba(255,255,255,0.15)_0%,rgba(0,0,0,0)_60%)] z-0 mix-blend-screen animate-projector" />
      
      {/* Secondary Wide Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,rgba(138,43,226,0.03)_0%,rgba(0,0,0,0)_70%)] z-0 mix-blend-screen" />

      {/* Heavy Film Grain with flicker */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0 mix-blend-screen animate-projector" />
      
      {/* Vignette (darken corners) */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] z-[105]" />

      <div className="relative z-[110]">
        <Header apiConnected={apiConnected} variant="app" onBack={() => navigate('/')} />
      </div>
      
      {/* Start Overlay (Forces User Interaction for Audio Autoplay) */}
      {!hasStarted && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button 
            onClick={togglePlay}
            className="group relative px-10 py-5 bg-transparent border border-white/20 rounded-full overflow-hidden transition-all hover:border-white/50 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            <span className="relative z-10 flex items-center gap-4 text-xl tracking-[0.3em] uppercase font-display text-white">
              <Play className="w-6 h-6 fill-white" /> Start Credits
            </span>
            <div className="absolute inset-0 bg-white/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
          </button>
        </div>
      )}

      {/* Play/Pause Control */}
      {hasStarted && (
        <button 
          onClick={togglePlay}
          className="absolute bottom-[14vh] right-8 z-[110] w-14 h-14 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/70 hover:bg-white hover:text-black hover:border-transparent transition-all backdrop-blur-xl hover:scale-105"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1 fill-current" />}
        </button>
      )}

      <main className="flex-1 relative w-full overflow-hidden credits-mask z-10">
        <div className="absolute inset-0 flex justify-center items-start h-full">
          {/* Scroll container */}
          <div 
            className={`w-full max-w-3xl px-6 flex flex-col items-center text-center space-y-40 py-10 ${hasStarted && isPlaying ? 'credits-scroll' : 'credits-scroll-paused'}`}
            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
          >
            
            {/* Title Sequence */}
            <div className="space-y-8">
              <p className="text-xs md:text-sm tracking-[0.5em] text-neutral-500 font-semibold uppercase">
                Cognizant Hackathon • Team 11 Presents
              </p>
              <h1 className="text-7xl md:text-9xl font-display font-bold tracking-[0.1em] text-white uppercase">
                Script<br/>Tagger
              </h1>
              <p className="text-xl md:text-2xl tracking-[0.4em] text-neutral-400 uppercase mt-4">
                AI-Powered Metadata Tagging
              </p>
            </div>

            {/* The Challenge */}
            <div className="space-y-16 w-full">
              <h2 className="text-sm tracking-[0.5em] text-neutral-600 font-bold uppercase">The Challenge</h2>
              <div className="space-y-12 text-2xl md:text-5xl font-display tracking-widest text-neutral-400">
                <p>Manual Tagging Doesn't Scale</p>
                <p>Poor Discoverability</p>
                <p>Slow Time-to-Market</p>
              </div>
            </div>

            {/* The Solution */}
            <div className="space-y-16 w-full">
              <h2 className="text-sm tracking-[0.5em] text-neutral-600 font-bold uppercase">The Solution</h2>
              <div className="space-y-12 text-2xl md:text-5xl font-display tracking-widest text-white">
                <p>One Pipeline. Zero Setup.</p>
                <p>Every Scene Time-Mapped</p>
                <p>People & Entities Auto-Indexed</p>
                <p>Emotion Surfaced Instantly</p>
              </div>
            </div>

            {/* Cast & Crew (Team 11) */}
            <div className="space-y-24 w-full pt-20">
              <h2 className="text-sm tracking-[0.6em] text-neutral-600 font-bold uppercase mb-20">The Team</h2>
              <div className="space-y-20">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-xs md:text-sm tracking-[0.5em] text-neutral-500 mb-4">{member.role}</span>
                    <span className="text-4xl md:text-6xl font-display tracking-[0.2em] text-white">{member.name.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Special Thanks */}
            <div className="space-y-20 w-full pt-32">
              <h2 className="text-sm tracking-[0.6em] text-neutral-600 font-bold uppercase mb-12">Special Thanks To</h2>
              
              <div className="space-y-12 text-2xl md:text-4xl font-display tracking-widest text-white">
                <p>Our Respected Dean</p>
                <p>Our Faculty Mentor</p>
                <p>Our Cognizant Mentor</p>
              </div>

              <div className="pt-16 max-w-2xl mx-auto">
                <p className="text-sm md:text-base font-sans tracking-[0.3em] text-neutral-500 uppercase leading-relaxed">
                  And our deepest gratitude to Cognizant for making this incredible opportunity possible.
                </p>
              </div>
            </div>
            
            {/* Outro */}
            <div className="pt-[20vh] pb-[50vh] space-y-12">
              <div className="w-24 h-24 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-12">
                <span className="text-4xl font-display tracking-widest text-white/80">11</span>
              </div>
              <p className="text-xs tracking-[0.5em] text-neutral-600 uppercase">
                © {new Date().getFullYear()} ScriptTagger
              </p>
              <p className="text-xs tracking-[0.4em] text-neutral-600 uppercase">
                A Cognizant Hackathon Submission
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
