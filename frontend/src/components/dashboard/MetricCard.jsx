import React from 'react';
import { cn } from '../../lib/utils';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';

export function MetricCard({ icon: Icon, label, value, subvalue, trend, accent = 'default', className }) {
  const accentMap = {
    default: 'text-neutral-400',
    crimson: 'text-[#ffffff]',
    amber: 'text-[#a3a3a3]',
    teal: 'text-[#404040]',
    purple: 'text-[#ffffff]',
  };
  return (
    <div
      className={cn(
        'ui-card ui-card-hover rounded-[24px] p-6 flex flex-col justify-between min-h-[140px] group transition-all duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-neutral-300 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-neutral-400" aria-hidden="true" />}
          {label}
        </span>
        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:bg-white/10 group-hover:text-white transition-colors cursor-pointer shadow-sm">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <div className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-none truncate">
            {value}
          </div>
          {subvalue && (
            <span className={cn(
              "text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 leading-none shadow-sm",
              accent === 'teal' || accent === 'purple' 
                ? "bg-[#64f43c]/10 text-[#64f43c] border border-[#64f43c]/20" 
                : accent === 'crimson' || accent === 'amber'
                ? "bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20"
                : "bg-white/10 text-white border border-white/20"
            )}>
              {accent === 'teal' || accent === 'purple' ? (
                <TrendingUp className="w-3 h-3" />
              ) : accent === 'crimson' || accent === 'amber' ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              {subvalue}
            </span>
          )}
        </div>
        {trend && (
          <div className="h-6 w-full opacity-60 group-hover:opacity-100 transition-opacity">
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="ui-card rounded-2xl p-5 min-h-[132px] animate-pulse">
      <div className="h-3 w-20 bg-white/5 rounded" />
      <div className="h-8 w-24 bg-white/5 rounded mt-6" />
      <div className="h-4 w-full bg-white/5 rounded mt-4" />
    </div>
  );
}
