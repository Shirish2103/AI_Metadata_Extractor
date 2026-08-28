import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ExportDropdown({ meta }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const downloadJson = () => {
    if (!meta) return;
    const json = JSON.stringify(meta, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = (meta.title || 'metadata').replace(/[^\w\-]+/g, '_').slice(0, 40);
    a.download = `${safe}_${meta.imdb_id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const copyJson = async () => {
    if (!meta) return;
    await navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost !py-2 !px-3 gap-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export options"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-xl bg-[#141414] border border-white/10 shadow-xl p-1.5 z-50 animate-fade-in origin-top-right"
          role="menu"
        >
          <button
            onClick={downloadJson}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/5 flex items-center gap-2"
            role="menuitem"
          >
            <Download className="w-4 h-4 text-neutral-400" />
            Download JSON
          </button>
          <button
            onClick={copyJson}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/5 flex items-center gap-2"
            role="menuitem"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-neutral-400" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <div className="text-[10px] text-neutral-500 px-3 pt-2">JSON only (v1)</div>
        </div>
      )}
    </div>
  );
}
