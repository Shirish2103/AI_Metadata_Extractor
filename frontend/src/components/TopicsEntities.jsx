import React from 'react';
import { Hash, PenTool } from 'lucide-react';

const TOPIC_CHIPS = ['chip-crimson', 'chip-amber', 'chip-teal', 'chip-purple', 'chip-neutral'];

export default function TopicsEntities({ topics, entities }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
      <div className="ui-card rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4 text-[#E5484D]" aria-hidden="true" />
          Key Topics
          <span className="text-xs font-medium text-neutral-500">({(topics || []).length})</span>
        </h3>
        {topics && topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topics.map((t, i) => (
              <span key={i} className={`chip ${TOPIC_CHIPS[i % TOPIC_CHIPS.length]}`}>
                {t.keyword}
                <span className="font-mono tnum opacity-75">{(t.score * 100).toFixed(0)}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 italic">No topics extracted.</p>
        )}
      </div>
      <div className="ui-card rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <PenTool className="w-4 h-4 text-[#7C5CF0]" aria-hidden="true" />
          Named Entities
          <span className="text-xs font-medium text-neutral-500">({(entities || []).length})</span>
        </h3>
        {entities && entities.length > 0 ? (
          <ul className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
            {entities.map((e, i) => {
              const name = e.name || e.text || 'Unnamed';
              const type = e.type || e.label || 'ENTITY';
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 bg-white/5 rounded-lg px-3 py-2 border border-white/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-white break-words">{name}</span>
                    {typeof e.count === 'number' && (
                      <span className="text-[10px] font-mono text-neutral-500 tnum">({e.count})</span>
                    )}
                  </div>
                  <span className="chip chip-neutral shrink-0">{type}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500 italic">No named entities extracted.</p>
        )}
      </div>
    </div>
  );
}