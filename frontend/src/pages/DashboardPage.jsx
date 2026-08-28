import React, { Suspense, lazy, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnalysisProvider, useAnalysis } from '../context/AnalysisContext';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

// Lazy tabs for bundle splitting (v1 requirement: lazy-load non-default tabs)
const OverviewTab = lazy(() => import('../components/dashboard/OverviewTab'));
const SceneNavigator = lazy(() => import('../components/dashboard/SceneNavigator'));
const SpeakerProfileGrid = lazy(() => import('../components/dashboard/SpeakerProfileGrid'));
const AnalyticsDeepDive = lazy(() => import('../components/dashboard/AnalyticsDeepDive'));
const TopicEntityExplorer = lazy(() => import('../components/dashboard/TopicEntityExplorer'));
const AIInsightsPanel = lazy(() => import('../components/dashboard/AIInsightsPanel'));
const RawJSONViewer = lazy(() => import('../components/dashboard/RawJSONViewer'));

function DashboardInner({ apiConnected }) {
  const { data: meta, loading, error } = useAnalysis();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleExport = useCallback((format) => {
    if (!meta) return;
    if (format === 'json' || format === 'share') {
      api.exportJson(meta);
    }
  }, [meta]);

  const handleBack = () => navigate('/app');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffffff]" />
        <p className="text-sm text-neutral-400">Loading analysis… fetching <span className="font-mono text-white">/api/metadata/:id</span></p>
        <div className="w-full max-w-xl space-y-3 mt-4">
          {[1,2,3].map((i)=>(
            <div key={i} className="h-24 bg-[#0a0a0a] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
        <div className="ui-card rounded-2xl p-8 max-w-lg w-full text-center">
          <AlertCircle className="w-8 h-8 text-[#ffffff] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Failed to load analysis</h2>
          <p className="text-sm text-neutral-400 mt-2 break-words">{error}</p>
          <p className="text-xs text-neutral-500 mt-3">
            Analysis ID is expected to be an IMDB ID (e.g. tt0441831) or a previously saved output filename. You can return to the input page and re-run analysis.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={handleBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back to /app
            </button>
            <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      meta={meta}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onBack={handleBack}
      onExport={handleExport}
    >
      <Suspense fallback={<TabSkeleton />}>
        {activeTab === 'overview' && <OverviewTab meta={meta} />}
        {activeTab === 'scenes' && <SceneNavigator segments={meta.segments || []} />}
        {activeTab === 'characters' && <SpeakerProfileGrid speakers={meta.speakers || []} segments={meta.segments || []} imdbId={meta.imdb_id || meta.imdbId} />}
        {activeTab === 'analytics' && <AnalyticsDeepDive meta={meta} />}
        {activeTab === 'topics' && <TopicEntityExplorer meta={meta} />}
        {activeTab === 'ai' && <AIInsightsPanel meta={meta} />}
        {activeTab === 'json' && <RawJSONViewer meta={meta} />}
      </Suspense>
    </DashboardLayout>
  );
}

function TabSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map((i)=>(
        <div key={i} className="h-32 bg-[#0a0a0a] border border-white/5 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

export default function DashboardPage({ apiConnected }) {
  const { id } = useParams();
  return (
    <AnalysisProvider imdbId={id}>
      <DashboardInner apiConnected={apiConnected} />
    </AnalysisProvider>
  );
}
