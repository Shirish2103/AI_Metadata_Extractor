import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import OverviewCards from './components/OverviewCards';
import SceneExplorer from './components/SceneExplorer';
import AnalyticsCharts from './components/AnalyticsCharts';
import SpeakersGrid from './components/SpeakersGrid';
import TopicsEntities from './components/TopicsEntities';
import JsonViewer from './components/JsonViewer';

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
import { cn } from './lib/utils';

const PAGE_SIZE = 200;
const THEME_CHIPS = ['chip-crimson', 'chip-amber', 'chip-teal', 'chip-purple'];

const MODES = [
  { id: 'corpus', label: 'Movie Corpus', icon: Film },
  { id: 'upload', label: 'Upload Script', icon: Upload },
  { id: 'raw', label: 'Text Input', icon: FileText },
];

const STEPS = [
  {
    n: '01',
    icon: Layers,
    color: 'bg-[#FBE9E9] text-[#C93B40]',
    chip: 'chip-crimson',
    title: 'Pick a Script',
    desc: 'Choose from 2,800+ movie screenplays, upload your own .txt file, or paste raw transcript text.',
  },
  {
    n: '02',
    icon: Zap,
    color: 'bg-[#FEF3E2] text-[#B97A0B]',
    chip: 'chip-amber',
    title: 'Run the Pipeline',
    desc: 'The NLP engine splits the script into scenes, then tags speakers, topics, sentiment and emotion — per scene.',
  },
  {
    n: '03',
    icon: BarChart3,
    color: 'bg-[#E2F3F1] text-[#0B7F74]',
    chip: 'chip-teal',
    title: 'Explore & Export',
    desc: 'Browse scene-by-scene breakdowns, character profiles and tone charts — then copy or download the full JSON.',
  },
];

export default function App() {
  const [mode, setMode] = useState('corpus'); // 'corpus', 'upload', 'raw'
  const [searchQuery, setSearchQuery] = useState('');
  const [allScripts, setAllScripts] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rawText, setRawText] = useState('');
  const [rawTitle, setRawTitle] = useState('Custom Script');
  const [file, setFile] = useState(null);

  const [useTransformers, setUseTransformers] = useState(false);
  const [useLlm, setUseLlm] = useState(false);

  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('scenes');

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      setApiConnected(res.ok);
    } catch {
      setApiConnected(false);
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
    fetchHealth();
    fetchScripts();
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
      <Header apiConnected={apiConnected} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Hero />

        {/* Projector console */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E4DCCB] p-6 mb-8 overflow-hidden relative">
          {/* subtle decorative background */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#F9F6F0] rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          
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
                      ? 'bg-[#FEF9F9] border-[#E5484D]/30 shadow-sm'
                      : 'bg-[#F9F7F3] border-transparent hover:border-[#E4DCCB]'
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
                    useTransformers ? "bg-[#E5484D]/10 text-[#E5484D]" : "bg-white text-[#A49B8B] group-hover:text-[#6E675B] shadow-sm border border-[#E4DCCB]/50"
                  )}>
                    <Brain className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-bold transition-colors tracking-tight", useTransformers ? "text-[#C93B40]" : "text-[#221E1A]")}>
                      Transformer Emotion
                    </span>
                    <span className="text-xs text-[#A49B8B] mt-0.5">CPU intensive analysis</span>
                  </div>
                  {useTransformers && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E5484D] animate-pulse"></div>
                  )}
                </label>

                <label
                  className={cn(
                    'group relative flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-all duration-200',
                    useLlm
                      ? 'bg-[#F7F5FE] border-[#7C5CF0]/30 shadow-sm'
                      : 'bg-[#F9F7F3] border-transparent hover:border-[#E4DCCB]'
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
                    useLlm ? "bg-[#7C5CF0]/10 text-[#7C5CF0]" : "bg-white text-[#A49B8B] group-hover:text-[#6E675B] shadow-sm border border-[#E4DCCB]/50"
                  )}>
                    <Wand2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-bold transition-colors tracking-tight", useLlm ? "text-[#6444D8]" : "text-[#221E1A]")}>
                      LLM Synopsis
                    </span>
                  </div>
                  {useLlm && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#7C5CF0] animate-pulse"></div>
                  )}
                </label>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#E4DCCB] to-transparent my-6"></div>

            {/* Input Sections */}
            {mode === 'corpus' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full space-y-1.5">
                    <label htmlFor="movie-select" className="text-[10px] font-bold text-[#A49B8B] uppercase tracking-widest ml-1">
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
                        className="w-full appearance-none bg-[#F9F7F3] border border-[#E4DCCB] text-[#221E1A] text-sm font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#E5484D]/20 focus:border-[#E5484D] transition-all cursor-pointer shadow-sm hover:bg-white"
                      >
                        <option value="" disabled>
                          {searchQuery.trim()
                            ? `🔍 ${filteredScripts.length} movie${filteredScripts.length === 1 ? '' : 's'} matching "${searchQuery}"`
                            : `🎥 Select Movie (${allScripts.length > 0 ? allScripts.length.toLocaleString() : '...'})`}
                        </option>
                        {filteredScripts.length === 0 && searchQuery.trim() && (
                          <option value="" disabled>
                            ❌ No movies match "{searchQuery}"
                          </option>
                        )}
                        {filteredScripts.map((m) => (
                          <option key={m.imdb_id} value={m.imdb_id}>
                            {m.title || 'Untitled'} {m.year ? `(${m.year})` : ''} — IMDb: {m.imdb_id}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A49B8B] pointer-events-none" />
                    </div>
                  </div>

                  <div className="w-full sm:w-72 space-y-1.5">
                    <label htmlFor="filter-titles" className="text-[10px] font-bold text-[#A49B8B] uppercase tracking-widest ml-1">
                      Filter
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#A49B8B] absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
                      <input
                        id="filter-titles"
                        type="text"
                        placeholder="Search titles…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F9F7F3] border border-[#E4DCCB] text-[#221E1A] text-sm font-medium rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#E5484D]/20 focus:border-[#E5484D] transition-all shadow-sm hover:bg-white placeholder:text-[#A49B8B] placeholder:font-normal"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => handleGenerate()} 
                    disabled={loading || !selectedMovie} 
                    className="w-full sm:w-auto bg-[#221E1A] hover:bg-[#15120F] text-white text-sm font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[46px] shrink-0"
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
                <label className="text-[10px] font-bold text-[#A49B8B] uppercase tracking-widest ml-1">
                  Upload Script
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F9F7F3] border border-[#E4DCCB] rounded-xl p-2 pl-4 shadow-sm hover:bg-white transition-all">
                  <div className="flex-1 w-full flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-[#E4DCCB] shrink-0">
                      <FileJson className="w-4 h-4 text-[#A49B8B]" />
                    </div>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full text-sm font-medium text-[#6E675B] file:hidden cursor-pointer"
                      aria-label="Upload a .txt screenplay"
                    />
                  </div>
                  <button 
                    onClick={() => handleGenerate()} 
                    disabled={loading || !file} 
                    className="w-full sm:w-auto bg-[#221E1A] hover:bg-[#15120F] text-white text-sm font-semibold py-2 px-6 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 h-10"
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
                  <label htmlFor="raw-title" className="text-[10px] font-bold text-[#A49B8B] uppercase tracking-widest ml-1">
                    Script Title
                  </label>
                  <input
                    id="raw-title"
                    type="text"
                    placeholder="e.g. Inception"
                    value={rawTitle}
                    onChange={(e) => setRawTitle(e.target.value)}
                    className="w-full bg-[#F9F7F3] border border-[#E4DCCB] text-[#221E1A] text-sm font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#E5484D]/20 focus:border-[#E5484D] transition-all shadow-sm hover:bg-white placeholder:text-[#A49B8B] placeholder:font-normal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="raw-text" className="text-[10px] font-bold text-[#A49B8B] uppercase tracking-widest ml-1">
                    Screenplay Text
                  </label>
                  <textarea
                    id="raw-text"
                    rows={6}
                    placeholder="Paste raw screenplay text here…"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full font-mono bg-[#F9F7F3] border border-[#E4DCCB] text-[#221E1A] text-xs sm:text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#E5484D]/20 focus:border-[#E5484D] transition-all shadow-sm hover:bg-white placeholder:text-[#A49B8B] resize-y"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => handleGenerate()} 
                    disabled={loading || !rawText} 
                    className="bg-[#221E1A] hover:bg-[#15120F] text-white text-sm font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
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
              <span className="text-[10px] font-bold text-[#A49B8B] tracking-[0.2em] uppercase">How It Works</span>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-[#221E1A] mt-2 drop-shadow-sm">
                From Text to Tagged, in Three Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <div key={step.n} className="ui-card ui-card-hover rounded-xl p-8 relative overflow-hidden bg-gradient-to-b from-white to-[#F9F7F3]/50">
                  <span
                    className="font-display text-[80px] leading-none text-[#EDE7DA] absolute -top-4 right-1 select-none"
                    aria-hidden="true"
                  >
                    {step.n}
                  </span>
                  <div className="relative">
                    <span className={`inline-flex h-12 w-12 rounded-xl items-center justify-center shadow-sm ${step.color}`}>
                      <step.icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 text-lg font-black text-black tracking-wide">{step.title}</h3>
                    <p className="mt-2.5 text-sm text-[#6E675B] leading-relaxed font-medium">{step.desc}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight
                      className="hidden md:block w-4 h-4 text-[#E4DCCB] absolute top-1/2 -right-3 -translate-y-1/2 z-10"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading status */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#6E675B] mb-4" role="status" aria-live="polite">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E5484D]" aria-hidden="true" />
            Running the metadata pipeline — extracting scenes, speakers, topics and tone…
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-lg p-3 mb-6 text-xs border bg-[#FBE9E9] border-[#F3C6C7] text-[#C93B40]"
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
              <div className="ui-card ui-card--top rounded-xl p-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-2 rounded-lg bg-[#FEF3E2]">
                    <Sparkles className="w-4 h-4 text-[#B97A0B]" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-bold text-[#221E1A]">AI Synopsis</h3>
                  {meta.summary.model && (
                    <span className="text-[10px] font-mono text-[#A49B8B]">{meta.summary.model}</span>
                  )}
                </div>
                {meta.summary.synopsis && (
                  <p className="text-xs text-[#221E1A] leading-relaxed">{meta.summary.synopsis}</p>
                )}
                <div className="flex flex-col gap-2">
                  {Array.isArray(meta.summary.themes) && meta.summary.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {meta.summary.themes.map((t, i) => (
                        <span key={i} className={`chip ${THEME_CHIPS[i % THEME_CHIPS.length]}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {Array.isArray(meta.summary.compliance_flags) && meta.summary.compliance_flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {meta.summary.compliance_flags.map((c, i) => (
                        <span key={i} className="chip chip-neg">
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
            <div role="tablist" aria-label="Metadata views" className="flex items-center gap-1 border-b border-[#E4DCCB] pb-1 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer',
                    activeTab === id
                      ? 'bg-[#E5484D] text-white font-semibold'
                      : 'text-[#6E675B] hover:text-[#221E1A] hover:bg-[#F1EDE4]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {label}
                  {typeof count === 'number' && count > 0 && (
                    <span className="font-mono text-[10px] opacity-70 tnum">({count})</span>
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