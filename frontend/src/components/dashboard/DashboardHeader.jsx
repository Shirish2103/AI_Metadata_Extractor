import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react';
import { ExportDropdown } from './ExportDropdown';
import { getMovieImages, isCorpusMovieId } from '../../lib/tmdb';
import { getPosterUrl } from '../../lib/api';

export function DashboardHeader({
  meta,
  onBack,
  onExport,
  activeTab,
  className,
}) {
  const title = meta?.title || 'Untitled';
  const year = meta?.year ? `(${meta.year})` : '';

  const isCorpus = isCorpusMovieId(meta?.imdb_id);
  const [headerPoster, setHeaderPoster] = useState(null);
  const [headerPosterStage, setHeaderPosterStage] = useState(0);
  const localWithSlug = isCorpus ? getPosterUrl(meta.imdb_id, meta.title) : null;
  const localNoSlug = isCorpus ? getPosterUrl(meta.imdb_id) : null;

  useEffect(() => {
    if (!isCorpus) {
      setHeaderPoster(null);
      return;
    }
    let cancelled = false;
    setHeaderPosterStage(0);
    setHeaderPoster(null);
    getMovieImages(meta.imdb_id).then((imgs) => {
      if (cancelled) return;
      if (imgs?.poster) setHeaderPoster(imgs.poster);
      else setHeaderPosterStage(1);
    }).catch(() => {
      if (!cancelled) setHeaderPosterStage(1);
    });
    return () => { cancelled = true; };
  }, [meta?.imdb_id, isCorpus]);

  const headerSrc = headerPosterStage === 0 ? headerPoster : headerPosterStage === 1 ? localWithSlug : headerPosterStage === 2 ? localNoSlug : null;
  const onHeaderError = () => {
    if (headerPosterStage === 0) setHeaderPosterStage(1);
    else if (headerPosterStage === 1) setHeaderPosterStage(2);
    else setHeaderPosterStage(3);
  };

  return (
    <header className={cn('sticky top-0 z-30 bg-transparent border-b border-white/[0.04] py-3 sm:py-4 transition-all', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 sm:gap-6 py-2">
          <button
            onClick={onBack}
            className="flex items-center justify-center p-3 rounded-2xl text-neutral-500 hover:text-white hover:bg-white/[0.04] transition-all shrink-0 group border border-transparent hover:border-white/5"
            aria-label="Back to analysis"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>

          <div className={cn("flex-1 flex items-center gap-3 min-w-0 transition-opacity duration-300", activeTab === 'overview' ? "opacity-0 pointer-events-none" : "opacity-100")}>
            {/* Poster thumbnail — corpus movies only */}
            {isCorpus && (
              <div className="hidden sm:flex w-8 h-12 rounded-lg overflow-hidden bg-[#0a0a0a] border border-white/10 shrink-0 shadow-md">
                {headerSrc && headerPosterStage < 3 ? (
                  <img
                    src={headerSrc}
                    alt={`${title} poster`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={onHeaderError}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#E5484D]/20 to-[#7C5CF0]/20 flex items-center justify-center text-[10px] font-bold text-white">
                    {String(title).slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <h1 className="font-display text-lg sm:text-xl tracking-wider text-white truncate font-medium">
              {title}
            </h1>
            {year && (
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-neutral-400 text-[10px] font-bold tracking-widest hidden sm:inline-block">
                {year.replace('(', '').replace(')', '')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ExportDropdown meta={meta} />
            <button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard?.writeText(url);
                if (onExport) onExport('share');
              }}
              className="btn-ghost !p-2.5 hidden sm:inline-flex rounded-xl"
              aria-label="Share"
              title="Copy link"
            >
              <Share2 className="w-4 h-4 text-neutral-400" />
            </button>
            {meta?.imdb_id && /^\d+$/.test(String(meta.imdb_id).replace(/^tt/,'').replace(/^0+/,'') ) && (
              <a
                href={`https://www.imdb.com/title/tt${String(meta.imdb_id).replace(/^tt/,'').padStart(7,'0')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost !p-2.5 hidden sm:inline-flex rounded-xl"
                aria-label="View on IMDb"
              >
                <ExternalLink className="w-4 h-4 text-neutral-400" />
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}