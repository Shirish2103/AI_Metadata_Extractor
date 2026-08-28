const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

/**
 * Normalizes an IMDB ID to the tt0000000 format
 */
function normalizeImdbId(id) {
  if (!id) return '';
  const s = String(id).trim();
  if (/^tt\d+$/i.test(s)) return s.toLowerCase();
  if (/^\d+$/.test(s)) return `tt${s.padStart(7, '0')}`;
  return s;
}

export function isCorpusMovieId(id) {
  if (!id) return false;
  const s = String(id).trim();
  // corpus movies have a numeric IMDb id (e.g. "4154796" or "tt4154796" or "0441831")
  return /^tt\d{7,}$/i.test(s) || /^\d{7,}$/.test(s);
}

/**
 * Get movie images (poster, background).
 * Falls back to Stremio MetaHub if TMDB API key is missing.
 */
export async function getMovieImages(imdbId) {
  if (!isCorpusMovieId(imdbId)) return { poster: null, background: null };
  const normId = normalizeImdbId(imdbId);
  if (!normId) return { poster: null, background: null };

  if (TMDB_API_KEY) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://api.themoviedb.org/3/find/${normId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`TMDB ${res.status}`);
      const data = await res.json();
      const movie = data.movie_results?.[0] || data.tv_results?.[0];
      if (movie) {
        return {
          poster: movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : null,
          background: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
        };
      }
    } catch (e) {
      console.warn("TMDB API Error:", e);
    }
  }
  
  // Free fallback via MetaHub (Stremio) — only for corpus movies
  return {
    poster: `https://images.metahub.space/poster/medium/${normId}/img`,
    background: `https://images.metahub.space/background/medium/${normId}/img`,
  };
}

/**
 * Get character images by fuzzy matching script names to TMDB cast.
 */
export async function getCharacterImages(imdbId, speakerNames) {
  if (!TMDB_API_KEY || !imdbId || !speakerNames?.length) return {};
  if (!isCorpusMovieId(imdbId)) return {};
  
  const normId = normalizeImdbId(imdbId);
  const mapping = {};

  try {
    // 1. Get TMDB internal ID from IMDB ID
    const findRes = await fetch(`https://api.themoviedb.org/3/find/${normId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
    const findData = await findRes.json();
    const movie = findData.movie_results?.[0];
    
    if (movie) {
      // 2. Fetch credits
      const credRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`);
      const credData = await credRes.json();
      
      const cast = credData.cast || [];
      
      // 3. Match speakers to cast characters (or actors if character names match)
      for (const speaker of speakerNames) {
        const normSpeaker = speaker.toLowerCase().trim();
        // find a match in character names (e.g., "Tony Stark" matches "TONY")
        const match = cast.find(c => 
          c.character?.toLowerCase().includes(normSpeaker) || 
          c.name?.toLowerCase().includes(normSpeaker)
        );
        
        if (match && match.profile_path) {
          mapping[speaker] = `https://image.tmdb.org/t/p/w185${match.profile_path}`;
        }
      }
    }
  } catch (e) {
    console.warn("TMDB API Cast Error:", e);
  }
  
  return mapping;
}
