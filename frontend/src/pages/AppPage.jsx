import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import OverviewCards from '../components/OverviewCards';
import SceneExplorer from '../components/SceneExplorer';
import AnalyticsCharts from '../components/AnalyticsCharts';
import SpeakersGrid from '../components/SpeakersGrid';
import TopicsEntities from '../components/TopicsEntities';
import JsonViewer from '../components/JsonViewer';

import {
  Film,
  Search,
  Play,
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
  Tag,
  FileJson,
  Sparkles,
  ChevronDown,
  ShieldAlert,
  Wand2,
  Brain,
  Layers,
  Zap,
  BarChart3,
  ArrowRight,
  Upload,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';

const PAGE_SIZE = 200;

const MODES = [
  { id: 'corpus', label: 'Movie Corpus', icon: Film },
  { id: 'upload', label: 'Upload Script', icon: Upload },
  { id: 'raw', label: 'Text Input', icon: FileText },
];

const STEPS = [
  {
    n: '01',
    icon: Layers,
    color: 'bg-white/5 text-neutral-300',
    title: 'Pick a Script',
    desc: 'Choose from 2,800+ movie screenplays, upload your own .txt file, or paste raw transcript text.',
  },
  {
    n: '02',
    icon: Zap,
    color: 'bg-white/5 text-neutral-300',
    title: 'Run the Pipeline',
    desc: 'The NLP engine splits the script into scenes, then tags speakers, topics, sentiment and emotion — per scene.',
  },
  {
    n: '03',
    icon: BarChart3,
    color: 'bg-white/5 text-neutral-300',
    title: 'Explore & Export',
    desc: 'Browse scene-by-scene breakdowns, character profiles and tone charts — then copy or download the full JSON.',
  },
];

export default function AppPage({ apiConnected }) {
  const [mode, setMode] = useState('corpus'); // 'corpus', 'upload', 'raw'
  const [searchQuery, setSearchQuery] = useState('');
  const [allScripts, setAllScripts] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [outputsList, setOutputsList] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [rawText, setRawText] = useState('');
  const [rawTitle, setRawTitle] = useState('Custom Script');
  const [file, setFile] = useState(null);

  const [useTransformers, setUseTransformers] = useState(false);
  const [useLlm, setUseLlm] = useState(false);

  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('scenes');
  const navigate = useNavigate();



  const fetchOutputs = async () => {
    try {
      const res = await fetch('/api/outputs');
      if (res.ok) {
        const data = await res.json();
        setOutputsList(data.results || []);
      }
    } catch (err) {
      console.error('Failed fetching outputs:', err);
    }
  };

  const fetchScripts = async () => {
    try {
      const res = await fetch('/api/scripts?limit=100000&offset=0');
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        setAllScripts(results);
      }
    } catch (err) {
      console.error('Failed fetching scripts list:', err);
    }
  };

  // Check API Health & Fetch Scripts on mount
  useEffect(() => {
        fetchScripts();
    fetchOutputs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredScripts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allScripts;
    return allScripts.filter((m) => {
      const title = (m.title || '').toLowerCase();
      const year = String(m.year || '');
      const imdbId = String(m.imdb_id || '').toLowerCase();
      const genres = Array.isArray(m.genres) ? m.genres.join(' ').toLowerCase() : '';
      return title.includes(q) || year.includes(q) || imdbId.includes(q) || genres.includes(q);
    });
  }, [searchQuery, allScripts]);

  useEffect(() => {
    if (selectedMovie && filteredScripts.length > 0) {
      if (!filteredScripts.some((m) => m.imdb_id === selectedMovie.imdb_id)) {
        setSelectedMovie(null);
      }
    }
  }, [filteredScripts, selectedMovie]);

  const handleGenerate = async (movie = selectedMovie) => {
    if (!movie && mode === 'corpus') return;
    setLoading(true);
    setError(null);

    try {
      let res;
      if (mode === 'corpus' && movie) {
        res = await fetch('/api/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imdb_id: movie.imdb_id,
            use_transformers: useTransformers,
            include_dialogue: true,
            use_llm: useLlm,
          }),
        });
      } else if (mode === 'upload' && file) {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch(
          `/api/tag/upload?use_transformers=${useTransformers}&include_dialogue=true&use_llm=${useLlm}`,
          { method: 'POST', body: formData }
        );
      } else if (mode === 'raw' && rawText) {
        res = await fetch('/api/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: rawText,
            title: rawTitle || 'Custom Script',
            use_transformers: useTransformers,
            include_dialogue: true,
            use_llm: useLlm,
          }),
        });
      }

      if (res && res.ok) {
        const resultMeta = await res.json();
        setMeta(resultMeta);
        setActiveTab('scenes');
        fetchScripts();
      } else {
        const errData = await res?.json().catch(() => ({}));
        setError(errData.detail || 'Failed to tag screenplay metadata.');
      }
    } catch (err) {
      setError(err.message || 'Network error connecting to API.');
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    if (!meta) return;
    navigator.clipboard.writeText(JSON.stringify(meta, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const tabs = [
    { id: 'scenes', label: 'Scenes', icon: Film, count: meta?.segments?.length ?? 0 },
    {
      id: 'speakers',
      label: 'Characters',
      icon: Users,
      count: meta?.speakers ? (Array.isArray(meta.speakers) ? meta.speakers.length : Object.keys(meta.speakers).length) : 0,
    },
    { id: 'analytics', label: 'Analytics & Tone', icon: TrendingUp },
    { id: 'topics', label: 'Topics', icon: Tag },
    { id: 'json', label: 'JSON', icon: FileJson },
  ];



  return (
    <div className="min-h-screen bg-base text-ink font-sans pb-16">
      <Header apiConnected={apiConnected} variant="app" onBack={() => navigate('/')} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        {/* Projector console */}
        <div className="bg-[#0a0a0a] rounded-2xl shadow-xl border border-white/10 p-6 mb-8 overflow-hidden relative">
          {/* subtle decorative background */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* Mode switcher */}
            <div className="flex justify-center mb-8">
              <nav className="seg" aria-label="Input mode">
                {MODES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    aria-pressed={mode === id}
                    className="seg-btn"
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Options Row */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Toggles */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={cn(
                    'group relative flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-all duration-200',
                    useTransformers
                      ? 'bg-white/5 border-white/20 shadow-sm'
                      : 'bg-[#111111] border-transparent hover:border-white/10'
                  )}
                  htmlFor="toggles-emotion"
                >
                  <input
                    id="toggles-emotion"
                    type="checkbox"
                    checked={useTransformers}
                    onChange={(e) => setUseTransformers(e.target.checked)}
                    className="hidden"
                  />
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    useTransformers ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400 group-hover:text-neutral-300 shadow-sm border border-white/10"
                  )}>
                    <Brain className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-medium transition-colors tracking-tight text-white")}>
                      Transformer Emotion
                    </span>
                    <span className="text-xs text-neutral-400 mt-0.5">CPU intensive analysis</span>
                  </div>
                </label>

                <label
                  className={cn(
                    'group relative flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-all duration-200',
                    useLlm
                      ? 'bg-white/5 border-white/20 shadow-sm'
                      : 'bg-[#111111] border-transparent hover:border-white/10'
                  )}
                  htmlFor="toggles-llm"
                >
                  <input
                    id="toggles-llm"
                    type="checkbox"
                    checked={useLlm}
                    onChange={(e) => setUseLlm(e.target.checked)}
                    className="hidden"
                  />
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    useLlm ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400 group-hover:text-neutral-300 shadow-sm border border-white/10"
                  )}>
                    <FileText className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className={cn("text-sm font-medium transition-colors tracking-tight text-white")}>
                      LLM Synopsis
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>

            {/* Input Sections */}

            {mode === 'corpus' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full space-y-1.5">
                    <label htmlFor="movie-select" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                      Select Screenplay
                    </label>
                    <div className="relative">
                      <select
                        id="movie-select"
                        value={selectedMovie?.imdb_id || ''}
                        onChange={(e) => {
                          const found = filteredScripts.find((m) => m.imdb_id === e.target.value);
                          if (found) {
                            setSelectedMovie(found);
                            handleGenerate(found);
                          }
                        }}
                        className="w-full appearance-none bg-[#111111] border border-white/10 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all cursor-pointer shadow-sm hover:bg-[#1a1a1a]"
                      >
                        <option value="" disabled>
                          {searchQuery.trim()
                            ? `${filteredScripts.length} movie${filteredScripts.length === 1 ? '' : 's'} matching "${searchQuery}"`
                            : `Select Movie (${allScripts.length > 0 ? allScripts.length.toLocaleString() : '...'})`}
                        </option>
                        {filteredScripts.length === 0 && searchQuery.trim() && (
                          <option value="" disabled>
                            No movies match "{searchQuery}"
                          </option>
                        )}
                        {filteredScripts.map((m) => (
                          <option key={m.imdb_id} value={m.imdb_id}>
                            {m.title || 'Untitled'} {m.year ? `(${m.year})` : ''} — IMDb: {m.imdb_id}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="w-full sm:w-72 space-y-1.5">
                    <label htmlFor="filter-titles" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                      Filter
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
                      <input
                        id="filter-titles"
                        type="text"
                        placeholder="Search titles…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all shadow-sm hover:bg-[#1a1a1a] placeholder:text-neutral-500 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => handleGenerate()} 
                    disabled={loading || !selectedMovie} 
                    className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black text-sm font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[46px] shrink-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'upload' && (
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                  Upload Script
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#111111] border border-white/10 rounded-xl p-2 pl-4 shadow-sm hover:bg-[#1a1a1a] transition-all">
                  <div className="flex-1 w-full flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 shadow-sm flex items-center justify-center border border-white/10 shrink-0">
                      <FileJson className="w-4 h-4 text-neutral-400" />
                    </div>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full text-sm font-medium text-neutral-300 file:hidden cursor-pointer"
                      aria-label="Upload a .txt screenplay"
                    />
                  </div>
                  <button 
                    onClick={() => handleGenerate()} 
                    disabled={loading || !file} 
                    className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black text-sm font-semibold py-2 px-6 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 h-10"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />}
                    Analyze Upload
                  </button>
                </div>
              </div>
            )}

            {mode === 'raw' && (
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="raw-title" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                    Script Title
                  </label>
                  <input
                    id="raw-title"
                    type="text"
                    placeholder="e.g. Inception"
                    value={rawTitle}
                    onChange={(e) => setRawTitle(e.target.value)}
                    className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all shadow-sm hover:bg-[#1a1a1a] placeholder:text-neutral-500 placeholder:font-normal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="raw-text" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                    Screenplay Text
                  </label>
                  <textarea
                    id="raw-text"
                    rows={6}
                    placeholder="Paste raw screenplay text here…"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full font-mono bg-[#111111] border border-white/10 text-white text-xs sm:text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all shadow-sm hover:bg-[#1a1a1a] placeholder:text-neutral-500 resize-y"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => handleGenerate()} 
                    disabled={loading || !rawText} 
                    className="bg-white hover:bg-neutral-200 text-black text-sm font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />}
                    Analyze Text
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* How it works (shown when no meta is generated and not loading) */}
        {!meta && !loading && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <span className="text-[10px] font-bold text-neutral-400 tracking-[0.2em] uppercase">How It Works</span>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-white mt-2 drop-shadow-sm">
                From Text to Tagged, in Three Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <div key={step.n} className="rounded-2xl p-8 relative overflow-hidden bg-[#0a0a0a] border border-white/5 transition-colors hover:bg-[#0c0c0c] hover:border-white/10 group">
                  <div className="relative z-10">
                    <span className={`inline-flex h-12 w-12 rounded-xl items-center justify-center border border-white/10 ${step.color}`}>
                      <step.icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 text-lg font-medium text-white tracking-tight">{step.title}</h3>
                    <p className="mt-2.5 text-sm text-neutral-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading status */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-4" role="status" aria-live="polite">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white/70" aria-hidden="true" />
            Running the metadata pipeline — extracting scenes, speakers, topics and tone…
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl p-4 mb-6 text-sm border bg-red-500/10 border-red-500/20 text-red-400"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {meta && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <OverviewCards meta={meta} />

            {/* AI Synopsis */}
            {meta.summary && (
              <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <FileText className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-medium text-white">Synopsis</h3>
                  {meta.summary.model && (
                    <span className="text-[10px] text-neutral-500 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">{meta.summary.model}</span>
                  )}
                </div>
                {meta.summary.synopsis && (
                  <p className="text-sm text-neutral-300 leading-relaxed">{meta.summary.synopsis}</p>
                )}
                <div className="flex flex-col gap-2 mt-2">
                  {Array.isArray(meta.summary.themes) && meta.summary.themes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {meta.summary.themes.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-neutral-300 text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {Array.isArray(meta.summary.compliance_flags) && meta.summary.compliance_flags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {meta.summary.compliance_flags.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
                          <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                          {c.toLowerCase() === 'none' ? 'Compliance Flag' : c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div role="tablist" aria-label="Metadata views" className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer border',
                    activeTab === id
                      ? 'bg-white text-black border-transparent shadow-sm'
                      : 'bg-transparent text-neutral-400 border-transparent hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                  {typeof count === 'number' && count > 0 && (
                    <span className="text-[11px] opacity-70 font-mono">({count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Active view */}
            <div>
              {activeTab === 'scenes' && <SceneExplorer key={meta.imdb_id || meta.title || 0} segments={meta.segments} />}
              {activeTab === 'speakers' && <SpeakersGrid speakers={meta.speakers} />}
              {activeTab === 'analytics' && <AnalyticsCharts overall={meta.overall} />}
              {activeTab === 'topics' && (
                <TopicsEntities topics={meta.overall?.topics} entities={meta.overall?.entities} />
              )}
              {activeTab === 'json' && <JsonViewer meta={meta} onCopy={copyJson} copied={copied} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}