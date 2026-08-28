import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, Search, FileCode2, WrapText } from 'lucide-react';

function syntaxHighlight(json) {
  // naive syntax highlight via spans – sufficient for v1 without Monaco
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?=\s*:)|"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-[#A3A3A3]';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-[#ffffff]'; // key
        else cls = 'text-[#404040]'; // string value
      } else if (/true|false/.test(match)) cls = 'text-[#a3a3a3]';
      else if (/null/.test(match)) cls = 'text-[#ffffff]';
      else if (/^-?\d/.test(match)) cls = 'text-[#ffffff]';
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export default function RawJSONViewer({ meta }) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [query, setQuery] = useState('');

  const json = useMemo(() => JSON.stringify(meta, null, 2), [meta]);

  const filteredJson = useMemo(() => {
    if (!query.trim()) return json;
    // simple line filter - keep lines matching query plus surrounding context?
    const lines = json.split('\n');
    const q = query.toLowerCase();
    const matched = lines.filter((l) => l.toLowerCase().includes(q));
    return matched.length ? matched.join('\n') : `// No matches for "${query}"`;
  }, [json, query]);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(meta?.title || 'metadata').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ui-card rounded-2xl overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <FileCode2 className="w-4 h-4 text-[#ffffff]" />
          metadata.json
          <span className="text-xs font-mono font-normal text-neutral-500">({(json.length / 1024).toFixed(1)} KB · {json.split('\n').length} lines)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="Search JSON…"
              className="field !py-1.5 !pl-8 !text-xs h-8 w-full sm:w-40"
            />
          </div>
          <button
            onClick={()=>setWrap(v=>!v)}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 ${wrap ? 'bg-white text-black border-white' : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'}`}
            title="Toggle wrap"
          >
            <WrapText className="w-3.5 h-3.5" /> {wrap ? 'Wrap: ON' : 'Wrap: OFF'}
          </button>
          <button onClick={copy} className="btn-ghost !py-1.5 !px-3 text-xs">
            {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
          <button onClick={download} className="btn-primary !py-1.5 !px-3 text-xs">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>

      <pre
        className={`p-4 text-xs leading-relaxed font-mono overflow-auto max-h-[640px] bg-[#0a0a0a] text-neutral-300 ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
        style={{ tabSize: 2 }}
      >
        {filteredJson}
      </pre>
    </div>
  );
}
