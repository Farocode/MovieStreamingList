/**
 * Cloudflare Worker proxy for the watchlist streaming picker.
 *
 * What this does:
 *   - Holds your TMDB and (optional) Watchmode API keys as server-side
 *     secrets — they never reach the visitor's browser.
 *   - Forwards a small set of allowed requests to TMDB/Watchmode and
 *     returns the JSON, with CORS headers so your GitHub Pages site
 *     (or wherever you host the tool) can call it directly.
 *   - Anyone visiting your site gets working lookups with zero setup —
 *     no personal API key required from them.
 *
 * Deploy (takes about 5 minutes):
 *   1. Create a free Cloudflare account: https://dash.cloudflare.com/sign-up
 *   2. Install Wrangler (Cloudflare's CLI):  
 *   3. In a new folder, run:  wrangler init watchlist-proxy
 *      (choose "Hello World" worker, no, don't deploy yet)
 *   4. Replace the generated worker's code with this file's contents.
 *   5. Set your secrets (never goes in the code or the repo):
 *        wrangler secret put TMDB_API_KEY
 *        wrangler secret put WATCHMODE_API_KEY   (optional)
 *   6. Edit ALLOWED_ORIGIN below to your actual GitHub Pages URL.
 *   7. Deploy:  wrangler deploy
 *   8. Wrangler prints your Worker URL, e.g.
 *      https://watchlist-proxy.yourname.workers.dev
 *      Paste that into the tool's "Proxy URL" field instead of pasting keys.
 *
 * Free tier: 100,000 requests/day, which is enormous headroom for a
 * personal watchlist tool — even fairly heavy public use would take a
 * long time to get near it. If it ever does, that's a good problem to have.
 */

const ALLOWED_ORIGIN = 'https://farocode.github.io/'; // <-- change this to your actual Pages URL

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=21600' // 6 hours — cuts repeat calls for the same title
  };
}

function jsonResponse(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

export default {
  async fetch(request, env){
    if (request.method === 'OPTIONS'){
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (!env.TMDB_API_KEY){
      return jsonResponse({ error: 'Worker is missing TMDB_API_KEY secret.' }, 500);
    }

    try {
      // GET /search?title=X&year=Y
      if (path === '/search'){
        const title = url.searchParams.get('title') || '';
        const year = url.searchParams.get('year') || '';
        const tmdbUrl = 'https://api.themoviedb.org/3/search/movie?api_key=' +
          encodeURIComponent(env.TMDB_API_KEY) + '&query=' + encodeURIComponent(title) +
          (year ? '&year=' + encodeURIComponent(year) : '');
        const resp = await fetch(tmdbUrl);
        const data = await resp.json();
        return jsonResponse(data, resp.status);
      }

      // GET /providers?id=123
      if (path === '/providers'){
        const id = url.searchParams.get('id') || '';
        const tmdbUrl = 'https://api.themoviedb.org/3/movie/' + encodeURIComponent(id) +
          '/watch/providers?api_key=' + encodeURIComponent(env.TMDB_API_KEY);
        const resp = await fetch(tmdbUrl);
        const data = await resp.json();
        return jsonResponse(data, resp.status);
      }

      // GET /provider-list  (used by "Sync real service names from TMDB")
      if (path === '/provider-list'){
        const tmdbUrl = 'https://api.themoviedb.org/3/watch/providers/movie?api_key=' +
          encodeURIComponent(env.TMDB_API_KEY) + '&watch_region=US';
        const resp = await fetch(tmdbUrl);
        const data = await resp.json();
        return jsonResponse(data, resp.status);
      }

      // GET /price?title=X&tmdbId=123  (optional — only works if WATCHMODE_API_KEY is set)
      if (path === '/price'){
        if (!env.WATCHMODE_API_KEY){
          return jsonResponse({ rentPrice: null, buyPrice: null, rentLink: null, buyLink: null });
        }
        const title = url.searchParams.get('title') || '';
        const tmdbId = parseInt(url.searchParams.get('tmdbId') || '0', 10);

        const searchUrl = 'https://api.watchmode.com/v1/autocomplete-search/?apiKey=' +
          encodeURIComponent(env.WATCHMODE_API_KEY) + '&search_value=' + encodeURIComponent(title) + '&search_type=2';
        const searchResp = await fetch(searchUrl);
        if (!searchResp.ok) return jsonResponse({ rentPrice: null, buyPrice: null, rentLink: null, buyLink: null });
        const searchData = await searchResp.json();
        const candidates = searchData.results || [];
        const match = candidates.find(c => c.tmdb_id === tmdbId) || candidates[0];
        if (!match) return jsonResponse({ rentPrice: null, buyPrice: null, rentLink: null, buyLink: null });

        const sourcesUrl = 'https://api.watchmode.com/v1/title/' + match.id + '/sources/?apiKey=' +
          encodeURIComponent(env.WATCHMODE_API_KEY) + '&regions=US';
        const sourcesResp = await fetch(sourcesUrl);
        if (!sourcesResp.ok) return jsonResponse({ rentPrice: null, buyPrice: null, rentLink: null, buyLink: null });
        const sources = await sourcesResp.json();

        let rentPrice = null, buyPrice = null, rentLink = null, buyLink = null;
        if (Array.isArray(sources)){
          sources.forEach(s => {
            if (s.region !== 'US' || typeof s.price !== 'number') return;
            if (s.type === 'rent' && (rentPrice === null || s.price < rentPrice)){ rentPrice = s.price; rentLink = s.web_url || null; }
            if (s.type === 'buy' && (buyPrice === null || s.price < buyPrice)){ buyPrice = s.price; buyLink = s.web_url || null; }
          });
        }
        return jsonResponse({ rentPrice, buyPrice, rentLink, buyLink });
      }

      return jsonResponse({ error: 'Unknown endpoint. Use /search, /providers, /provider-list, or /price.' }, 404);
    } catch (err){
      return jsonResponse({ error: 'Proxy error', message: String(err) }, 500);
    }
  }
};
