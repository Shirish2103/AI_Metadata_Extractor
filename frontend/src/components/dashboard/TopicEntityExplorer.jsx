import React, { useMemo, useState } from 'react';
import { Search, Hash, Tag, Users, MapPin, Building, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function TopicEntityExplorer({ meta }) {
  const topics = meta?.overall?.topics || [];
  const entities = meta?.overall?.entities || [];
  const segments = meta?.segments || [];

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredTopics = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return topics.filter((t) => {
      if (needle && !t.keyword.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [topics, q]);

  const filteredEntities = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entities.filter((e) => {
      const name = (e.name || e.text || '').toLowerCase();
      if (typeFilter !== 'ALL' && (e.type || e.label) !== typeFilter) return false;
      if (needle && !name.includes(needle)) return false;
      return true;
    });
  }, [entities, q, typeFilter]);

  const entityTypes = useMemo(() => {
    const s = new Set(entities.map((e) => e.type || e.label).filter(Boolean));
    return ['ALL', ...[...s].sort()];
  }, [entities]);

  // co-occurrence: topics that appear together in scenes
  const coOccurrence = useMemo(() => {
    const pairCounts = {};
    segments.forEach((seg) => {
      const kws = (seg.topics || []).map((t) => t.keyword);
      for (let i = 0; i < kws.length; i++) {
        for (let j = i + 1; j < kws.length; j++) {
          const a = kws[i], b = kws[j];
          const key = [a, b].sort().join(' × ');
          pairCounts[key] = (pairCounts[key] || 0) + 1;
        }
      }
    });
    return Object.entries(pairCounts).sort((a,b)=>b[1]-a[1]).slice(0,12);
  }, [segments]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="ui-card rounded-[24px] p-6 flex flex-col lg:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full max-w-2xl">
          <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search topics, keywords, & entities…"
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
            aria-label="Search topics and entities"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 flex items-center gap-1 mr-2"><Filter className="w-3.5 h-3.5" /> Type</span>
          {entityTypes.map((t)=>(
            <button
              key={t}
              onClick={()=>setTypeFilter(t)}
              className={cn('px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-300', 
                typeFilter === t 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                  : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topics table */}
        <div className="ui-card rounded-[24px] overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <Hash className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white tracking-tight leading-none">Topics & Keywords</h3>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Thematic Extraction</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-neutral-400">{filteredTopics.length} Total</span>
          </div>
          <div className="overflow-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#050505]/95 backdrop-blur-md border-b border-white/5 z-10">
                <tr className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">
                  <th className="text-left px-8 py-4">Keyword</th>
                  <th className="text-right px-4 py-4">Score</th>
                  <th className="text-right px-8 py-4">Scenes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredTopics.length ? filteredTopics.map((t,i)=>{
                  const scenesPresent = segments.filter((s)=> (s.topics||[]).some(k=>k.keyword===t.keyword)).length;
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-4 text-white font-medium group-hover:text-indigo-400 transition-colors">{t.keyword}</td>
                      <td className="px-4 py-4 text-right font-mono text-neutral-400">{(t.score).toFixed(2)}</td>
                      <td className="px-8 py-4 text-right font-mono text-neutral-500">
                        <span className="px-2 py-1 rounded-md bg-white/5 text-xs">{scenesPresent}</span>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={3} className="px-8 py-16 text-center text-neutral-500 italic">No topics match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Entities table */}
        <div className="ui-card rounded-[24px] overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <Tag className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white tracking-tight leading-none">Named Entities</h3>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">People, Places, Orgs</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-neutral-400">{filteredEntities.length} Total</span>
          </div>
          <div className="overflow-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#050505]/95 backdrop-blur-md border-b border-white/5 z-10">
                <tr className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">
                  <th className="text-left px-8 py-4">Entity Name</th>
                  <th className="text-left px-4 py-4">Classification</th>
                  <th className="text-right px-8 py-4">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredEntities.length ? filteredEntities.map((e,i)=>{
                  const name = e.name || e.text || 'Unnamed';
                  const type = e.type || e.label || 'ENTITY';
                  const Icon = type==='PERSON' ? Users : type==='LOCATION' ? MapPin : type==='ORGANIZATION' ? Building : Tag;
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-4 text-white font-medium flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/5 text-neutral-400 group-hover:text-rose-400 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="group-hover:text-white transition-colors">{name}</span>
                        {e.is_speaker && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] uppercase tracking-wider font-bold">
                            Speaker
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold',
                          type==='PERSON' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                          type==='LOCATION' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          type==='ORGANIZATION' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                          'bg-white/5 text-neutral-400 border border-white/10'
                        )}>{type}</span>
                      </td>
                      <td className="px-8 py-4 text-right font-mono text-neutral-500">
                        <span className="px-2 py-1 rounded-md bg-white/5 text-xs">{e.count ?? '—'}</span>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={3} className="px-8 py-16 text-center text-neutral-500 italic">No entities match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Co-occurrence matrix */}
      <div className="ui-card rounded-[24px] p-8">
        <div className="mb-6">
          <h3 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Co-occurrence Network</h3>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">Keyword pairings that frequently share the same scene</p>
        </div>
        {coOccurrence.length ? (
          <div className="flex flex-wrap gap-3">
            {coOccurrence.map(([pair, count], i)=>(
              <div key={i} className="flex items-center group cursor-default">
                <div className="px-3 py-2 rounded-l-xl bg-white/5 border border-white/10 border-r-0 text-xs text-white/80 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">
                  {pair}
                </div>
                <div className="px-3 py-2 rounded-r-xl bg-white/10 border border-white/10 text-xs font-mono text-white group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-colors">
                  ×{count}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-neutral-500 italic mt-6">No co-occurrence data — topics are sparse across scenes.</p>}
      </div>
    </div>
  );
}
