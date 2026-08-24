import React from 'react';
import { Film, MessageSquare, AlignLeft, Smile, Frown, Meh, Tag, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function OverviewCards({ meta }) {
  if (!meta) return null;

  const overall = meta.overall || {};
  const genres = meta.genres || [];
  const knownGenres = meta.known_genres || [];
  const sentiment = overall.sentiment || {};
  const emotion = overall.emotion || {};

  const sentimentIcon = {
    positive: <Smile className="w-4 h-4 text-[#178A4C]" aria-hidden="true" />,
    negative: <Frown className="w-4 h-4 text-[#C93B40]" aria-hidden="true" />,
    default: <Meh className="w-4 h-4 text-[#8A8174]" aria-hidden="true" />,
  };

  const sentimentClass = {
    positive: 'chip-pos',
    negative: 'chip-neg',
    default: 'chip-neutral',
  };

  const genreChips = ['chip-crimson', 'chip-amber', 'chip-teal', 'chip-purple'];

  const stats = [
    {
      label: 'Total Scenes',
      value: overall.num_scenes || 0,
      icon: <Film className="w-4 h-4" aria-hidden="true" />,
      accent: 'bg-[#FBE9E9] text-[#C93B40]',
    },
    {
      label: 'Dialogue Lines',
      value: (overall.num_dialogue_lines || 0).toLocaleString(),
      icon: <MessageSquare className="w-4 h-4" aria-hidden="true" />,
      accent: 'bg-[#FEF3E2] text-[#B97A0B]',
    },
    {
      label: 'Total Words',
      value: (overall.num_words || 0).toLocaleString(),
      icon: <AlignLeft className="w-4 h-4" aria-hidden="true" />,
      accent: 'bg-[#E2F3F1] text-[#0B7F74]',
    },
  ];

  const toneKey = sentiment.label === 'positive' || sentiment.label === 'negative' ? sentiment.label : 'default';

  return (
    <div className="flex flex-col gap-4 mb-8 animate-fade-in">
      {/* Title / marquee header */}
      <div className="ui-card ui-card--top rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-2 mb-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E5484D]" aria-hidden="true" />
              Now Screening
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl tracking-wide text-[#221E1A] leading-none">
                {meta.title || 'Untitled Screenplay'}
              </h2>
              {meta.imdb_id && (
                <span className="chip chip-neutral font-mono" translate="no">
                  IMDb: {meta.imdb_id}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6E675B] mt-2">
              Metadata extraction from screenplay transcript · {overall.num_scenes || 0} scenes ·{' '}
              {overall.num_dialogue_lines || 0} lines
            </p>
          </div>

          {/* Genre badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {genres.length > 0 ? (
              genres.map((g, idx) => (
                <span key={idx} className={`chip ${genreChips[idx % genreChips.length]}`}>
                  <Tag className="w-3 h-3" aria-hidden="true" />
                  {g.genre}
                  <span className="opacity-80 font-mono tnum">{(g.score * 100).toFixed(0)}%</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-[#A49B8B] italic">No genres classified</span>
            )}
          </div>
        </div>

        {knownGenres.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-[#E4DCCB]">
            <span className="eyebrow">Ground truth</span>
            {knownGenres.map((g, i) => (
              <span key={i} className="chip chip-neutral">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="ui-card ui-card-hover rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E675B]">
                {s.label}
              </span>
              <span className={cn('p-2 rounded-lg', s.accent)}>{s.icon}</span>
            </div>
            <div className="mt-2">
              <span className="display text-4xl text-[#221E1A] tnum leading-none">{s.value}</span>
            </div>
          </div>
        ))}

        {/* Overall tone card */}
        <div className="ui-card ui-card-hover rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E675B]">
              Overall Tone
            </span>
            <span className="p-2 rounded-lg bg-[#EFECFD]">{sentimentIcon[toneKey]}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={cn('chip', sentimentClass[toneKey])}>
              {sentiment.label || 'neutral'}
              <span className="font-mono tnum opacity-80">{(sentiment.compound || 0).toFixed(2)}</span>
            </span>
            {emotion.label && (
              <span className="chip chip-purple">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {emotion.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}