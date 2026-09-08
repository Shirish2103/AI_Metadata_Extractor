import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, Treemap, AreaChart, Area
} from 'recharts';

const COLORS = {
  crimson: '#f43f5e',
  amber: '#f59e0b',
  teal: '#14b8a6',
  emerald: '#10b981',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  sky: '#0ea5e9',
  grid: 'rgba(255,255,255,0.05)',
  tick: '#525252',
  pie: ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#10b981', '#0ea5e9'],
};

const TIP = { 
  background: 'rgba(5, 5, 5, 0.95)', 
  border: '1px solid rgba(255,255,255,0.1)', 
  borderRadius: 12, 
  fontSize: 12, 
  color: '#fff',
  backdropFilter: 'blur(24px)',
  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
};

const TreemapColors = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#10b981', '#0ea5e9'];

const CustomizedContent = (props) => {
  const { x, y, width, height, index, name } = props;
  const color = TreemapColors[index % TreemapColors.length];
  
  // Only render if there's enough space
  if (width < 20 || height < 20) return null;

  return (
    <g>
      <rect
        x={x + 3}
        y={y + 3}
        width={Math.max(0, width - 6)}
        height={Math.max(0, height - 6)}
        style={{
          fill: color,
          strokeOpacity: 0,
        }}
        rx={12}
        ry={12}
      />
      {width > 60 && height > 40 && (
        <text 
          x={x + width / 2} 
          y={y + height / 2 + 4} 
          textAnchor="middle" 
          fill="#fff" 
          fontSize={11} 
          className="font-display font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase"
        >
          {name}
        </text>
      )}
    </g>
  );
};

export default function AnalyticsDeepDive({ meta }) {
  if (!meta) return null;
  const overall = meta.overall || {};
  const segments = meta.segments || [];

  const topicTreemapData = (overall.topics || []).slice(0, 12).map((t) => ({ name: t.keyword, size: Math.round((t.score || 0) * 100) }));
  const emotionDist = overall.emotion?.distribution || {};
  const emotionData = Object.entries(emotionDist).map(([label, val]) => ({ label, value: Number((val * 100).toFixed(1)) }));
  // fallback overall.emotions array shape
  const emotionAlt = (overall.emotions || []).map((e) => ({ label: e.label, value: Number((e.probability * 100).toFixed(1)) }));
  const emotionChartData = emotionData.length ? emotionData : emotionAlt;

  const sentimentHeatmap = segments.map((s, i) => ({
    scene: `S${s.segment_id || i + 1}`,
    compound: Number((s.sentiment?.compound || 0).toFixed(2)),
    label: s.sentiment?.label || 'neutral',
  }));

  const speakerCounts = {};
  segments.forEach((seg) => (seg.speakers || []).forEach((sp) => { speakerCounts[sp] = (speakerCounts[sp] || 0) + 1; }));
  const speakerNetworkData = Object.entries(speakerCounts).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count).slice(0, 8);

  const emotionTimelineData = segments.map((s, i) => {
    const dist = s.emotion?.distribution || {};
    const total = s.emotion?.n || 1; // avoid division by zero
    // Only include scenes with at least some dialogue/emotion data
    if (total === 0 && !s.emotion?.label) return null;
    return {
      scene: `S${s.segment_id || i + 1}`,
      joy: Number((((dist.joy || 0) / total) * 100).toFixed(1)),
      sadness: Number((((dist.sadness || 0) / total) * 100).toFixed(1)),
      anger: Number((((dist.anger || 0) / total) * 100).toFixed(1)),
      fear: Number((((dist.fear || 0) / total) * 100).toFixed(1)),
      surprise: Number((((dist.surprise || 0) / total) * 100).toFixed(1)),
      disgust: Number((((dist.disgust || 0) / total) * 100).toFixed(1)),
      neutral: Number((((dist.neutral || 0) / total) * 100).toFixed(1)),
    };
  }).filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {/* Sentiment Heatmap */}
      <div className="ui-card rounded-[24px] p-8">
        <div className="mb-8">
          <h3 className="font-display text-2xl font-bold text-white mb-2 tracking-tight">Sentiment Heatmap</h3>
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">Scene Progression × Emotional Compound</p>
        </div>
        
        <div className="grid grid-cols-12 sm:grid-cols-16 md:grid-cols-24 gap-1.5">
          {sentimentHeatmap.map((cell, i) => {
            const v = cell.compound; // -1 to 1
            
            // Colorful Cinematic Gradient Map
            let bgClasses = 'bg-white/5'; // default neutral
            let shadowClass = '';
            
            if (v > 0.5) {
              bgClasses = 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-500/30 text-white';
              shadowClass = 'shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]';
            } else if (v > 0.1) {
              bgClasses = 'bg-gradient-to-br from-indigo-500 to-purple-500 border-indigo-400/30 text-white';
              shadowClass = 'shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]';
            } else if (v > -0.1) {
              bgClasses = 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10';
            } else if (v > -0.5) {
              bgClasses = 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-400/30 text-white';
              shadowClass = 'shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.6)]';
            } else {
              bgClasses = 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/30 text-white';
              shadowClass = 'shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.6)]';
            }

            const opacity = Math.max(0.4, 0.4 + Math.abs(v) * 0.6);
            
            return (
              <div
                key={i}
                title={`${cell.scene}: ${cell.compound} (${cell.label})`}
                className={`h-12 sm:h-14 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 hover:z-10 cursor-crosshair ${bgClasses} ${shadowClass}`}
                style={{ opacity: v > -0.1 && v < 0.1 ? 0.7 : opacity }}
              >
                <span className="text-[10px] font-bold font-display">{cell.scene}</span>
                <span className="text-[9px] font-mono opacity-80">{v.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-[9px] uppercase tracking-widest font-mono text-neutral-400">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> Negative</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Tense</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-white/10 border border-white/20" /> Neutral</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Positive</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Highly Positive</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Treemap */}
        <div className="ui-card rounded-[24px] p-8">
          <div className="mb-6">
            <h3 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Thematic Clusters</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Topic Treemap</p>
          </div>
          {topicTreemapData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap 
                  data={topicTreemapData} 
                  dataKey="size" 
                  aspectRatio={4/3} 
                  content={<CustomizedContent />} 
                />
              </ResponsiveContainer>
            </div>
          ) : <p className="text-[11px] text-neutral-500 italic mt-10 text-center">No thematic topics available.</p>}
          <div className="flex flex-wrap gap-2 mt-6">
            {topicTreemapData.slice(0,5).map((t,i)=>(
              <span key={i} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider text-white/70">
                {t.name} <span className="opacity-50 ml-1">· {t.size}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Emotion Radar */}
        <div className="ui-card rounded-[24px] p-8 flex flex-col">
          <div className="mb-2">
            <h3 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Emotional Signature</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Polar Distribution</p>
          </div>
          {emotionChartData.length ? (
            <div className="flex-1 min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={emotionChartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke={COLORS.grid} />
                  <PolarAngleAxis dataKey="label" tick={{ fill: '#A3A3A3', fontSize: 10, textTransform: 'uppercase', fontFamily: 'monospace' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: COLORS.tick, fontSize: 9 }} axisLine={false} />
                  <Radar dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#radarGradient)" fillOpacity={0.6} />
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={TIP} formatter={(v)=>`${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-[11px] text-neutral-500 italic mt-10 text-center flex-1">No emotion data available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speaker Network */}
        <div className="ui-card rounded-[24px] p-8">
          <div className="mb-6">
            <h3 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Vocal Dominance</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Speaker Frequency Analysis</p>
          </div>
          {speakerNetworkData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speakerNetworkData} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: COLORS.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#E5E5E5', fontSize: 11, fontWeight: 600 }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TIP} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" radius={[0,12,12,0]} barSize={16}>
                    {speakerNetworkData.map((_, i) => <Cell key={i} fill={COLORS.pie[i % COLORS.pie.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-[11px] text-neutral-500 italic mt-10 text-center">No speaker data available.</p>}
        </div>

        {/* Sentiment Timeline Line */}
        <div className="ui-card rounded-[24px] p-8">
          <div className="mb-6">
            <h3 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Narrative Arc</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Detailed Sentiment Timeline</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentHeatmap} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompound" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="scene" tick={{ fill: COLORS.tick, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} interval={Math.ceil(sentimentHeatmap.length/10)} />
                <YAxis domain={[-1,1]} tick={{ fill: COLORS.tick, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Line 
                  type="monotone" 
                  dataKey="compound" 
                  stroke="url(#colorCompound)" 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }}
                  filter="url(#glow)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Emotional Variance Area Chart */}
      <div className="ui-card rounded-[24px] p-8 w-full">
        <div className="mb-6">
          <h3 className="font-display text-xl font-bold text-white mb-1 tracking-tight">Emotional Variance</h3>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">Scene-by-Scene Emotion Distribution (100% Stacked)</p>
        </div>
        
        {emotionTimelineData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emotionTimelineData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }} stackOffset="expand">
                <defs>
                  <linearGradient id="colorJoy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorSadness" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorAnger" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorFear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorSurprise" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorDisgust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#737373" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#737373" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="scene" tick={{ fill: COLORS.tick, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} interval={Math.ceil(emotionTimelineData.length/15)} />
                <YAxis tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} tick={{ fill: COLORS.tick, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} formatter={(value, name) => [`${value}%`, name.charAt(0).toUpperCase() + name.slice(1)]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="anger" stackId="1" stroke="#f43f5e" fill="url(#colorAnger)" />
                <Area type="monotone" dataKey="fear" stackId="1" stroke="#8b5cf6" fill="url(#colorFear)" />
                <Area type="monotone" dataKey="sadness" stackId="1" stroke="#0ea5e9" fill="url(#colorSadness)" />
                <Area type="monotone" dataKey="disgust" stackId="1" stroke="#10b981" fill="url(#colorDisgust)" />
                <Area type="monotone" dataKey="surprise" stackId="1" stroke="#d946ef" fill="url(#colorSurprise)" />
                <Area type="monotone" dataKey="joy" stackId="1" stroke="#f59e0b" fill="url(#colorJoy)" />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#737373" fill="url(#colorNeutral)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500 italic mt-10 text-center">No scene-by-scene emotion data available.</p>
        )}
      </div>
    </div>
  );
}

