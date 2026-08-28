import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { SidebarNav } from './SidebarNav';
import { DashboardHeader } from './DashboardHeader';
import { getMovieImages, isCorpusMovieId } from '../../lib/tmdb';

export default function DashboardLayout({
  meta,
  activeTab,
  onTabChange,
  onBack,
  onExport,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [images, setImages] = useState({ poster: null, background: null });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    const mid = window.matchMedia('(min-width: 768px) and (max-width: 1279px)');
    const midHandler = () => {
      if (mid.matches) setCollapsed(true);
      else if (window.innerWidth >= 1280) setCollapsed(false);
    };
    midHandler();
    window.addEventListener('resize', midHandler);
    mq.addEventListener('change', handler);
    return () => {
      window.removeEventListener('resize', midHandler);
      mq.removeEventListener('change', handler);
    };
  }, []);

  useEffect(() => {
    if (meta?.imdb_id && isCorpusMovieId(meta.imdb_id)) {
      getMovieImages(meta.imdb_id).then(setImages).catch(console.error);
    } else {
      setImages({ poster: null, background: null });
    }
  }, [meta?.imdb_id]);

  const bgUrl = images.background || images.poster;

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Cinematic Ambient Background */}
      {bgUrl && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-[0.15] blur-[100px] saturate-200 scale-110"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 via-[#050505]/80 to-[#050505]" />
        </div>
      )}

      <div className="relative z-10 flex min-h-screen w-full">
        {/* Sidebar - desktop/tablet space reservation */}
        <div className={cn('hidden md:block flex-shrink-0 transition-all duration-200', collapsed ? 'w-16' : 'w-64')}>
          <SidebarNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </div>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full transition-all duration-200">
          <DashboardHeader meta={meta} onBack={onBack} onExport={onExport} activeTab={activeTab} />


        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 md:pb-6">
          <div className="animate-fade-in">{children}</div>

          <footer className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
            <span>Powered by ScriptTagger · AI Metadata Extractor</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
              Cinematic analytics dashboard
            </span>
          </footer>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/5"
        aria-label="Mobile dashboard navigation"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'scenes', label: 'Scenes' },
            { id: 'characters', label: 'Chars' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'json', label: 'JSON' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors',
                activeTab === item.id ? 'text-white bg-white/10' : 'text-neutral-500'
              )}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeTab === item.id ? '#ffffff' : 'transparent' }} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      </div>
    </div>
  );
}
