import React, { useState, useEffect } from 'react';
import { Film, Users, Clock, Smile, Sparkles, Hash, Play, Info, ImageOff } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getMovieImages, isCorpusMovieId } from '../../lib/tmdb';
import { getPosterUrl } from '../../lib/api';

export default function OverviewTab({ meta }) {
  if (!meta) return null;
  const overall = meta.overall || {};
  const speakers = meta.speakers || [];
  const segments = meta.segments || [];
  const sentiment = overall.sentiment || {};
  const emotion = overall.emotion || {};
  // runtime from segments end_sec
  const runtimeSec = segments.length ? Math.max(...segments.map((s) => s.end_sec || 0)) : null;
  const runtime = runtimeSec ? `${Math.floor(runtimeSec / 60)}m ${Math.round(runtimeSec % 60)}s` : '—';
  const avgSentiment = sentiment.label || 'neutral';
  const avgCompound = typeof sentiment.compound === 'number' ? sentiment.compound.toFixed(2) : '0.00';

  const sparklineData = (overall.sentiment_timeline || segments.map((s, i) => ({ scene: `S${i + 1}`, score: s.sentiment?.compound || 0 }))).slice(0, 20);
  // if no timeline, build from segments sentiment
  const timeline = sentiment_timeline_or_segments(overall, segments);

  const topics = (overall.topics || []).slice(0, 5);

  const totalScenes = overall.num_scenes || segments.length || 0;
  const uniqueSpeakers = speakers.length || new Set(segments.flatMap((s) => s.speakers || [])).size;

  const isCorpus = isCorpusMovieId(meta?.imdb_id);
  const [posterRemote, setPosterRemote] = useState(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterErrorStage, setPosterErrorStage] = useState(0); // 0 = remote, 1 = local with slug, 2 = local without slug, 3 = placeholder

  const localWithSlug = isCorpus ? getPosterUrl(meta.imdb_id, meta.title) : null;
  const localNoSlug = isCorpus ? getPosterUrl(meta.imdb_id) : null;

  useEffect(() => {
    if (!isCorpus) return;
    let cancelled = false;
    setPosterLoading(true);
    setPosterErrorStage(0);
    setPosterRemote(null);
    getMovieImages(meta.imdb_id).then((imgs) => {
      if (cancelled) return;
      if (imgs?.poster) setPosterRemote(imgs.poster);
      else setPosterErrorStage(1);
    }).catch(() => {
      if (!cancelled) setPosterErrorStage(1);
    }).finally(() => {
      if (!cancelled) setPosterLoading(false);
    });
    return () => { cancelled = true; };
  }, [meta.imdb_id, isCorpus]);

  const handleImgError = () => {
    if (posterErrorStage === 0) setPosterErrorStage(1);
    else if (posterErrorStage === 1) setPosterErrorStage(2);
    else setPosterErrorStage(3);
  };

  const posterSrc = posterErrorStage === 0 ? posterRemote : posterErrorStage === 1 ? localWithSlug : posterErrorStage === 2 ? localNoSlug : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Cinematic Hero — with poster for corpus movies */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start lg:items-end min-h-[45vh] mb-4 relative z-10 pt-12">
        {/* Poster — corpus only */}
        {isCorpus && (
          <div className="shrink-0 w-[180px] sm:w-[200px] lg:w-[220px] aspect-[2/3] rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-2xl shadow-black/60 relative group">
            {posterLoading && (
              <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {posterSrc && posterErrorStage < 3 ? (
              <img
                src={posterSrc}
                alt={`${meta.title} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleImgError}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-4 text-center">
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <ImageOff className="w-7 h-7 text-neutral-600" aria-hidden="true" />
                </div>
                <span className="font-display text-lg text-white tracking-wide line-clamp-2">{meta.title}</span>
                <span className="text-[11px] font-mono text-neutral-500 mt-1">{meta.imdb_id}</span>
              </div>
            )}
            <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl pointer-events-none" aria-hidden="true" />
          </div>
        )}

        <div className="flex flex-col items-start flex-1 min-w-0">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-display font-bold text-white tracking-tight leading-none mb-6 drop-shadow-2xl">
            {meta.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-neutral-300 mb-6 drop-shadow-md">
            {meta.year && <span className="text-white font-semibold">{meta.year}</span>}
            {runtimeSec > 0 && <span className="px-1.5 py-0.5 border border-white/20 rounded text-[11px] font-bold text-neutral-400">HD</span>}
            {runtime && <span>{runtime}</span>}
            <div className="flex items-center gap-2">
              {(Array.isArray(meta.genres) ? meta.genres : Array.isArray(meta.known_genres) ? meta.known_genres : []).slice(0, 3).map((g, i) => (
                <span key={i} className="flex items-center before:content-['•'] before:mr-2 before:text-white/20 text-neutral-400 capitalize">
                  {typeof g === 'string' ? g : g.genre || g.name || 'Unknown'}
                </span>
              ))}
            </div>
          </div>
          
          <p className="max-w-3xl text-lg sm:text-xl text-neutral-200 leading-relaxed drop-shadow-md mb-8">
            {meta.summary?.synopsis || 'No synopsis available. Enable LLM Synopsis during analysis to generate an AI synopsis and compliance flags.'}
          </p>
          
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-xl font-bold hover:bg-neutral-200 transition-colors shadow-2xl shadow-black">
                <Play className="w-5 h-5 fill-current" /> Play Analysis
             </button>
             <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-xl font-bold backdrop-blur-md transition-colors border border-white/10 shadow-2xl shadow-black">
                <Info className="w-5 h-5" /> More Info
             </button>
          </div>
          
          {Array.isArray(meta.summary?.compliance_flags) && meta.summary.compliance_flags.length > 0 && meta.summary.compliance_flags[0].toLowerCase() !== 'none' && (
             <div className="mt-8 flex flex-wrap gap-2 relative z-10">
               {meta.summary.compliance_flags.map((c, i) => (
                 <span key={i} className="chip chip-crimson text-xs backdrop-blur-md shadow-lg">{c}</span>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard icon={Film} label="Scenes" value={totalScenes} subvalue={`${overall.num_dialogue_lines || 0} lines`} accent="crimson"
          trend={<MiniSparkline data={timeline.map(t=>t.score)} color="#ffffff" />} />
        <MetricCard icon={Users} label="Speakers" value={uniqueSpeakers} subvalue={`${overall.num_words || 0} words`} accent="amber"
          trend={<MiniSparkline data={topics.map(t=>t.score*100)} color="#a3a3a3" />} />
        <MetricCard icon={Clock} label="Runtime" value={runtime} subvalue={runtimeSec ? `${Math.floor(runtimeSec/60)} min` : 'est.'} accent="teal" />
        <MetricCard icon={Smile} label="Sentiment" value={avgSentiment} subvalue={avgCompound} accent={avgSentiment==='positive' ? 'teal' : avgSentiment==='negative' ? 'crimson' : 'default'} />
        <MetricCard icon={Sparkles} label="Top Emotion" value={emotion.label || '—'} subvalue={emotion.label ? `${(emotion.distribution?.[emotion.label]*100 || 0).toFixed(0)}%` : 'neutral'} accent="purple" />
      </div>

      {/* Secondary: mini sentiment timeline + topics bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ui-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">Sentiment Timeline · {timeline.length} scenes</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#404040" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#404040" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="scene" tick={{ fill: '#737373', fontSize: 10 }} interval={Math.ceil(timeline.length/10)} />
                <YAxis domain={[-1,1]} tick={{ fill: '#737373', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#fff' }} />
                <Area type="monotone" dataKey="score" stroke="#404040" strokeWidth={2} fill="url(#ovSent)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ui-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Hash className="w-4 h-4 text-[#ffffff]" /> Top 5 Topics</h3>
          {topics.length ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics.map(t=>({ name: t.keyword.slice(0,16), score: Number((t.score*10).toFixed(1)) }))} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#737373', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#A3A3A3', fontSize: 11 }} width={110} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="score" fill="#ffffff" radius={[0,8,8,0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-neutral-500 italic">No topics extracted.</p>}
        </div>
      </div>
    </div>
  );
}

function sentiment_timeline_or_segments(overall, segments) {
  if (overall.sentiment_timeline && overall.sentiment_timeline.length) {
    return overall.sentiment_timeline.map((s, i) => ({ scene: `S${i+1}`, score: Number(s.compound?.toFixed?.(2) ?? s.compound ?? 0) }));
  }
  return segments.map((s, i) => ({ scene: `S${i+1}`, score: Number((s.sentiment?.compound || 0).toFixed(2)) }));
}

function MiniSparkline({ data, color = '#ffffff' }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-full h-6" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
