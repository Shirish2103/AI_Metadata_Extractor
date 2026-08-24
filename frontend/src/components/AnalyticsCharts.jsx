import React from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = {
  bar: '#E5484D',
  area: '#0E9488',
  grid: '#E4DCCB',
  tick: '#6E675B',
  pie: ['#E5484D', '#F59E0B', '#0E9488', '#7C5CF0', '#1FA45C'],
};

const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E4DCCB',
  borderRadius: 8,
  fontSize: 12,
  color: '#221E1A',
};

export default function AnalyticsCharts({ overall }) {
  if (!overall) return null;

  const topicChartData = (overall.topics || []).slice(0, 8).map((t) => ({
    name: t.keyword,
    score: Number((t.score * 100).toFixed(1)),
  }));

  const emotionChartData = (overall.emotions || []).map((e) => ({
    name: e.label,
    value: Number((e.probability * 100).toFixed(1)),
  }));

  const sentimentTimeline = (overall.sentiment_timeline || []).map((s, i) => ({
    scene: `S${i + 1}`,
    score: Number(s.compound.toFixed(2)),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
      {overall.topics?.length > 0 && (
        <div className="ui-card rounded-xl p-6">
          <h4 className="text-sm font-bold text-[#221E1A] mb-4">Top Topics (RAKE + KeyBERT)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicChartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: COLORS.tick, fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: COLORS.tick, fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="score" fill={COLORS.bar} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {emotionChartData.length > 0 && (
        <div className="ui-card rounded-xl p-6">
          <h4 className="text-sm font-bold text-[#221E1A] mb-4">Emotion Distribution</h4>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emotionChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="#FFFFFF"
                >
                  {emotionChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS.pie[i % COLORS.pie.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#6E675B' }}
                  iconSize={8}
                  formatter={(name) => <span className="text-[#6E675B]">{name}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {sentimentTimeline.length > 0 && (
        <div className="ui-card rounded-xl p-6 lg:col-span-2">
          <h4 className="text-sm font-bold text-[#221E1A] mb-4">Sentiment Timeline by Scene</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sentimentTimeline} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <defs>
                  <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.area} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.area} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="scene" tick={{ fill: COLORS.tick, fontSize: 11 }} interval={Math.ceil(sentimentTimeline.length / 12) - 1} />
                <YAxis domain={[-1, 1]} tick={{ fill: COLORS.tick, fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="score" stroke={COLORS.area} strokeWidth={2} fill="url(#sentimentGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!overall.topics?.length && !emotionChartData.length && !overall.sentiment_timeline?.length && (
        <div className="ui-card rounded-xl p-10 text-center lg:col-span-2">
          <p className="text-sm text-[#A49B8B]">No chart data available — analyze a script first.</p>
        </div>
      )}
    </div>
  );
}