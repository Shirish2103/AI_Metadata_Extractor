import React from 'react';
import { Copy, Download, Check, FileCode2 } from 'lucide-react';

export default function JsonViewer({ meta, onCopy, copied }) {
  if (!meta) return null;

  const json = JSON.stringify(meta, null, 2);
  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.title || 'metadata'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ui-card rounded-xl overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E4DCCB] bg-[#F1EDE4]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#221E1A]">
          <FileCode2 className="w-4 h-4 text-[#E5484D]" aria-hidden="true" />
          metadata.json
          <span className="text-[#A49B8B] font-mono">({(json.length / 1024).toFixed(1)} KB)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="btn-ghost !py-1.5 !px-2.5 text-xs"
            aria-label="Copy metadata JSON"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#178A4C]" aria-hidden="true" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy
              </>
            )}
          </button>
          <button type="button" onClick={download} className="btn-primary !py-1.5 !px-2.5 text-xs">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs leading-relaxed text-[#221E1A] bg-[#F7F3EC] font-mono overflow-auto max-h-[520px]">
        {json}
      </pre>
    </div>
  );
}