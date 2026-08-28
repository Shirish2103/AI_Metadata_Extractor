const API_BASE = '/api';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {}
    const error = new Error(detail || `Request failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function normalizeId(id) {
  if (!id) return '';
  const s = String(id).trim();
  if (/^tt\d+$/i.test(s)) return s.replace(/^tt/i, '').padStart(7, '0');
  if (/^\d+$/.test(s)) return s.padStart(7, '0');
  return s;
}

function cleanTitle(filename) {
  if (!filename) return '';
  // mirrors src.pipeline._clean_filename
  return String(filename).replace(/[^\w\-_ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 50);
}

export const api = {
  // Analysis endpoints — tries /metadata/:id then falls back to /outputs/:filename for custom uploads
  getAnalysis: async (rawId) => {
    const decoded = (() => { try { return decodeURIComponent(String(rawId)); } catch { return String(rawId); } })();
    const id = normalizeId(decoded);
    // try metadata first (IMDB flow)
    try {
      return await fetchJson(`${API_BASE}/metadata/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e.status === 404) {
        const cleaned = cleanTitle(decoded);
        const candidates = [id, decoded, cleaned, rawId, cleanTitle(String(rawId))].filter(Boolean);
        // deduplicate
        const seen = new Set();
        const uniq = candidates.filter((c) => { if (seen.has(c)) return false; seen.add(c); return true; });
        for (const cand of uniq) {
          try {
            return await fetchJson(`${API_BASE}/outputs/${encodeURIComponent(cand)}`);
          } catch (_) {}
        }
        // final fallback: try outputs list scan client-side to resolve title-based id (handles My Script vs My_Script differences)
        try {
          const list = await fetchJson(`${API_BASE}/outputs`);
          const results = list.results || [];
          const needle = decoded.toLowerCase().replace(/[_ ]/g, '');
          const found = results.find((r) => {
            const hay = [r.id, r.title, r.filename].join(' ').toLowerCase().replace(/[_ ]/g, '');
            return hay.includes(needle) || needle.includes(hay.slice(0, 20));
          });
          if (found?.filename) {
            return await fetchJson(`${API_BASE}/outputs/${encodeURIComponent(found.filename)}`);
          }
          if (found?.id) {
            return await fetchJson(`${API_BASE}/outputs/${encodeURIComponent(found.id)}`);
          }
        } catch {}
      }
      throw e;
    }
  },
  getOutputs: () => fetchJson(`${API_BASE}/outputs`),
  getOutput: (filename) => fetchJson(`${API_BASE}/outputs/${encodeURIComponent(filename)}`),
  fetchAnalysis: (id) => fetchJson(`${API_BASE}/metadata/${encodeURIComponent(normalizeId(id))}`),

  // Script endpoints
  getScripts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`${API_BASE}/scripts?${qs}`);
  },
  getScript: (imdbId) => fetchJson(`${API_BASE}/scripts/${imdbId}`),

  // Tagging endpoints
  tagScript: (data) => fetchJson(`${API_BASE}/tag`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  tagUpload: (formData) => fetch(`${API_BASE}/tag/upload`, {
    method: 'POST',
    body: formData,
  }).then((r) => r.json()),

  // Health
  health: () => fetchJson(`${API_BASE}/health`),

  // Export helpers (JSON only for v1)
  exportJson: (meta, filename) => {
    const json = JSON.stringify(meta, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${(meta?.title || 'metadata').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export function getPosterUrl(imdbId, title) {
  if (!imdbId) return null;
  const clean = String(imdbId).replace(/^tt/i, '').replace(/^0+/, '');
  if (title) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `/posters/${clean}-${slug}.webp`;
  }
  return `/posters/${clean}.webp`;
}

export function getImdbIdForRoute(meta) {
  if (!meta) return null;
  const id = meta.imdb_id || meta.imdbId || '';
  if (id && /^\d+$/.test(String(id).replace(/^tt/, ''))) return String(id).padStart(7, '0').replace(/^0+/, (m) => m) ? String(id).replace(/^tt/i,'') : id;
  // fallback to title slug for custom scripts
  if (meta.title) return encodeURIComponent(meta.title.replace(/\s+/g, '_'));
  return null;
}

export function formatRuntime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}