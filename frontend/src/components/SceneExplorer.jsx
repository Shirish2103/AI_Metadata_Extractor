import React, { useState } from 'react';
import { Film, MapPin, Clock, Users, MessageSquare, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SceneExplorer({ segments }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!segments || segments.length === 0) {
    return (
      <div className="ui-card rounded-xl p-10 text-center">
        <Film className="w-6 h-6 text-[#A49B8B] mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-[#6E675B]">No scene segments parsed for this script.</p>
      </div>
    );
  }

  const currentScene = segments[Math.min(selectedIndex, segments.length - 1)] || segments[0];
  const dialogueLines = currentScene.dialogue || [];
  const topics = currentScene.topics || [];
  const sentiment = currentScene.sentiment || {};
  const emotion = currentScene.emotion || {};

  const toneChip =
    sentiment.label === 'positive'
      ? 'chip-pos'
      : sentiment.label === 'negative'
      ? 'chip-neg'
      : 'chip-neutral';

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Scene picker */}
      <div className="ui-card ui-card--top rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Film className="w-4 h-4 text-[#E5484D] shrink-0" aria-hidden="true" />
          <span className="eyebrow">Film Reel · {segments.length} Scenes</span>
        </div>
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          aria-label="Select scene"
          className="field w-full sm:w-96 font-mono cursor-pointer"
        >
          {segments.map((s, idx) => (
            <option key={idx} value={idx}>
              Scene {s.segment_id || idx + 1}: {s.heading || `Scene ${idx + 1}`} ({s.start} – {s.end})
            </option>
          ))}
        </select>
      </div>

      {/* Scene detail */}
      <div className="ui-card rounded-xl p-6 flex flex-col gap-6">
        {/* Heading banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E4DCCB]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#6E675B]">
              <span className="chip chip-crimson">Scene #{currentScene.segment_id || selectedIndex + 1}</span>
              <span className="flex items-center gap-1 font-mono text-[#6E675B]">
                <Clock className="w-3 h-3" aria-hidden="true" /> {currentScene.start} – {currentScene.end}
              </span>
            </div>
            <h3 className="font-display text-2xl tracking-wide text-[#221E1A] mt-2 leading-none break-words">
              {currentScene.heading || 'UNNAMED SCENE'}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentScene.location && (
              <span className="chip chip-amber">
                <MapPin className="w-3 h-3 text-[#B97A0B]" aria-hidden="true" />
                {currentScene.location}
              </span>
            )}
            {currentScene.time_of_day && (
              <span className="chip chip-teal">
                <Clock className="w-3 h-3 text-[#0B7F74]" aria-hidden="true" />
                {currentScene.time_of_day}
              </span>
            )}
          </div>
        </div>

        {/* Scene stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#F1EDE4] rounded-lg p-3.5 border border-[#E4DCCB]">
            <div className="eyebrow flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5" aria-hidden="true" /> Speakers
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentScene.speakers && currentScene.speakers.length > 0 ? (
                currentScene.speakers.map((sp, i) => (
                  <span key={i} className="chip chip-amber">
                    {sp}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#A49B8B] italic">No speakers identified</span>
              )}
            </div>
          </div>

          <div className="bg-[#F1EDE4] rounded-lg p-3.5 border border-[#E4DCCB]">
            <div className="eyebrow flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5" aria-hidden="true" /> Topics
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topics.length > 0 ? (
                topics.slice(0, 5).map((t, i) => (
                  <span key={i} className="chip chip-neutral">
                    {t.keyword}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#A49B8B] italic">No topics extracted</span>
              )}
            </div>
          </div>

          <div className="bg-[#F1EDE4] rounded-lg p-3.5 border border-[#E4DCCB]">
            <div className="flex items-center justify-between eyebrow mb-2">
              <span>Tone &amp; Score</span>
              <span className="font-mono tnum text-[#6E675B]">{(sentiment.compound || 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`chip ${toneChip}`}>{sentiment.label || 'neutral'}</span>
              {emotion.label && (
                <span className="chip chip-purple">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7C5CF0]" aria-hidden="true" />
                  {emotion.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dialogue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[#221E1A] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#E5484D]" aria-hidden="true" />
              Dialogue Breakdown ({dialogueLines.length} lines)
            </h4>
          </div>

          {dialogueLines.length > 0 ? (
            <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {dialogueLines.map((d, i) => {
                const lineTone =
                  d.sentiment?.label === 'positive'
                    ? 'chip-pos'
                    : d.sentiment?.label === 'negative'
                    ? 'chip-neg'
                    : null;
                return (
                  <li
                    key={i}
                    className="bg-[#F7F3EC] rounded-lg p-3 border border-[#E4DCCB] flex items-start gap-3"
                  >
                    <span
                      className="h-7 w-7 rounded bg-[#FEF3E2] border border-[#F6DFB2] flex items-center justify-center text-xs font-bold text-[#B97A0B] shrink-0 font-mono"
                      aria-hidden="true"
                    >
                      {(d.speaker || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#B97A0B] uppercase tracking-wide">
                          {d.speaker || 'UNKNOWN'}
                        </span>
                        {d.parenthetical && (
                          <span className="text-[11px] text-[#6E675B] italic">({d.parenthetical})</span>
                        )}
                        {lineTone && <span className={cn('chip', lineTone)}>{d.sentiment.label}</span>}
                      </div>
                      <p className="text-xs text-[#221E1A] mt-1 leading-relaxed break-words">{d.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="bg-[#F7F3EC] rounded-lg p-4 text-center text-xs text-[#A49B8B] border border-[#E4DCCB]">
              Dialogue lines not cached for this scene — re-analyze with dialogue included to view them.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}