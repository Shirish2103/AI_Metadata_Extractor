import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LandingFeatures from '../components/LandingFeatures';
import Pipeline from '../components/Pipeline';
import UseCases from '../components/UseCases';

export default function LandingPage({ apiConnected }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <Header apiConnected={apiConnected} variant="landing" />
      <Hero onTryApp={() => navigate('/app')} />
      <LandingFeatures />
      <Pipeline />
      <UseCases />
      
      <footer className="py-12 border-t border-white/5 text-center mt-20">
        <p className="text-sm text-neutral-500 font-medium">
          © {new Date().getFullYear()} ScriptTagger AI. Built for advanced NLP metadata extraction.
        </p>
      </footer>
    </div>
  );
}
