import React from 'react';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Film,
  Users,
  BarChart3,
  Tag,
  Brain,
  FileJson,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'scenes', label: 'Scenes', icon: Film },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'topics', label: 'Topics & Entities', icon: Tag },
  { id: 'ai', label: 'AI Insights', icon: Brain },
  { id: 'json', label: 'Raw JSON', icon: FileJson },
];

export function SidebarNav({ activeTab, onTabChange, collapsed = false, onToggleCollapse }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full bg-[#050505]/40 backdrop-blur-3xl border-r border-white/5 transition-all duration-200 flex flex-col shadow-2xl shadow-black',
        collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Dashboard navigation"
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
        {!collapsed && (
          <span className="font-display text-xl text-white tracking-wide">ScriptTagger</span>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn(
            'p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors',
            collapsed && 'rotate-180'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" role="navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
              activeTab === id
                ? 'bg-gradient-to-r from-white/10 to-white/5 text-white shadow-sm border border-white/10 shadow-black/20'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
              collapsed && 'justify-center'
            )}
            role="tab"
            aria-selected={activeTab === id}
            aria-label={label}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        {!collapsed && (
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-2">
            Shortcuts
          </div>
        )}
        <div className={cn('flex items-center gap-2 px-3', collapsed && 'justify-center')}>
          <kbd className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-neutral-400">J</kbd>
          {!collapsed && <span className="text-xs text-neutral-500">Previous Scene</span>}
        </div>
        <div className={cn('flex items-center gap-2 px-3 mt-1', collapsed && 'justify-center')}>
          <kbd className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-neutral-400">K</kbd>
          {!collapsed && <span className="text-xs text-neutral-500">Next Scene</span>}
        </div>
      </div>
    </aside>
  );
}