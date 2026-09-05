# Where to Watch — Project Handoff

For starting a fresh chat on this project. Paste this in, or attach it as a project file.

## What this is

A single-page tool that takes a Letterboxd watchlist and shows which titles are
streaming on the specific services the user actually pays for — vs. a generic
"available on 12 platforms" list that includes ones they don't. Built by
Michael, a Senior Business Analyst with no prior JS/API experience, entirely
through AI-assisted development, as a learning project and portfolio piece.

**Status: essentially done, deployed, and working.** This isn't an in-progress
build — treat new requests as refinement on a finished v1, not scaffolding.

## Live deployment

- **App:** https://farocode.github.io/MovieStreamingList/ (`index.html`, static, no build step)
- **Cloudflare Worker proxy:** https://watchlist-proxy.farocode.workers.dev
  (`worker.js`) — deployed and confirmed working. `ALLOWED_ORIGIN` is set to
  `https://farocode.github.io`.
- **Repo:** github.com/Farocode/MovieStreamingList

## Architecture

- Pure static HTML/CSS/JS, single file, no framework, no build step —
  deliberate choice so it pastes straight into GitHub Pages. Don't suggest a
  module/bundler refactor; it was raised and explicitly declined for this
  reason.
- **Two ways to get TMDB data**, both supported, framed as primary vs. advanced:
  - **Personal TMDB key (primary/default path)** — free, no card, ~2 min
    signup. Stored in browser localStorage only.
  - **Cloudflare Worker proxy (advanced, optional)** — hides the key
    server-side. Michael has this deployed for his own use, but it's
    **not** the default — saving a proxy URL only affects the saver's own
    browser, it doesn't make the app key-free for other visitors. That
    would require hardcoding the Worker URL as a default, which was
    discussed and **deliberately not built** (Michael wants to keep his
    Worker private, not exposed to arbitrary traffic).
  - When both a personal key and a proxy URL are set, **the proxy silently
    wins** — the key just sits unused. No error, no warning. Known,
    accepted behavior, not a bug.
- Data sources: **TMDB** (free, required, does search + watch-provider
  data) and **Watchmode** (optional, adds real rent/buy prices; may not
  support browser CORS reliably, degrades gracefully if not).
- All state — watchlist, service picks, cached results, theme, keys — lives
  in browser localStorage. Nothing server-side except the optional proxy.

## Page layout (top to bottom)

1. Marquee header (theme toggle top-right corner)
2. **The List** — results, with "only show streaming" filter, export button
3. **Import CSV / Add a Film** — side-by-side, compact
4. **Streaming Services** — toggle grid, Sync/Select-all/Clear-all controls
5. **API Keys** — personal TMDB/Watchmode key first (primary path), advanced
   proxy option demoted to the bottom of this panel

This order has been deliberately iterated on twice already (moved results to
top, then moved Import above results, proxy demoted below keys) — there's
real reasoning behind current order, ask before reshuffling again.

## Hard-won lessons (don't relitigate these)

- **JustWatch/TMDB provider names don't match branding intuition.** Confirmed
  the hard way, three times:
  - Apple TV+ subscription is literally named **"Apple TV"** in TMDB data (no
    "+"). "Apple TV Amazon Channel" and "Apple TV Store" are separate,
    correctly-distinct entries.
  - "Max" reverted to **"HBO Max"** in the real world (WBD rebrand reversal,
    summer 2026) — handled via migration.
  - "Paramount+" and "Paramount+ Premium" are genuinely different tiers/
    catalogs — do NOT merge via fuzzy matching, only exact + a tiny explicit
    alias list (Prime Video ↔ Amazon Prime Video). Loose substring matching
    was tried and reverted — it over-matched things it shouldn't have.
  - **Pattern going forward:** if a service "isn't matching," check the
    actual TMDB provider name via a web search before assuming it's a code
    bug. It's been a real naming mismatch every time so far.
- **Exact title match must always beat popularity**, or "Dolemite" resolves to
  "Dolemite Is My Name." Popularity is only a tiebreaker when nothing matches
  exactly. This was broken once by an earlier "always sort by popularity" fix
  for the missing-"The" problem — don't reintroduce that tradeoff.
- **Cache correctness ≠ cache freshness.** Two different staleness bugs were
  found and fixed here, don't conflate them: (1) service-selection changes
  weren't being reflected even after "Refresh" — fixed via
  `recomputeCachedMatches()`, which reclassifies cached raw data against
  current service picks with zero API calls; (2) actual catalog data going
  stale over time — fixed via a 24h TTL (`checkedAt` + `isResultFresh()`).
- **New curated defaults must reach existing sessions, not just fresh
  installs.** The services list migration is now a general additive merge
  (any curated default missing by name gets added, off, never overwriting
  anything) — an earlier narrower migration only touched untouched sessions
  and silently failed to deliver new defaults to already-customized ones.
- Browser file-cache vs. app data-cache are different things — when Michael
  wasn't seeing changes, it was the browser caching `index.html` itself
  (needs hard refresh), not the app's localStorage cache.

## Known limitations (logged, not bugs)

- Misspelled titles beyond the missing-"The" pattern aren't corrected (typo
  tolerance is a bigger, not-yet-built feature — see below). Two real
  examples hit in practice, worth testing against whenever this gets built:
  "Corsican Brothers" → nothing (also possibly a data gap, unresolved —
  "The Corsican Brothers" and "Cheech & Chong's The Corsican Brothers" both
  exist in TMDB); "Dead Poet Society" (missing the 's' on "Poets") → no
  match, "Dead Poets Society" typed correctly worked fine.
- Sequel-numbering variants ("Godfather 3" vs. "Godfather Part 3") don't match.
- US-only.
- Worker's `ALLOWED_ORIGIN` check is browser-enforced only (CORS), not a real
  server-side access gate — low risk at personal scale, logged for later
  hardening if the URL is ever shared more widely.
- Watchmode quota risk on large imports: each priced rent/buy lookup costs 2
  Watchmode calls, so a 100–200+ title import could burn a meaningful chunk
  of the 2,500/month free quota in one refresh. Not an issue at typical
  watchlist sizes (dozens), but worth a call budget if that ever changes.
- No automated tests exist anywhere in this project. All testing has been
  manual/reactive (Michael hits something in real use, reports it, gets
  fixed). This is a known, accepted tradeoff for a personal-scale tool — not
  something to apologize for, but don't overstate test coverage either.

## Queued for later (logged in memory, NOT built — don't build without being asked)

Priorities Michael flagged explicitly: **matching robustness** and **list
management** are top of the list.

- General fuzzy/typo-tolerant matching + "did you mean" fallback for
  low-confidence matches
- Sequel-numbering normalization ("3" / "Part 3" / roman numerals)
- Per-film delete (currently only all-or-nothing "Clear saved list")
- "Mark as watched" toggle
- Merge-on-reimport option instead of always replacing the list
- Sort/group results by streaming service
- Search/filter box for a long list
- Multi-region support (hardcoded US)
- Streaming-count display next to "Done — checked X films" when the
  streaming-only filter is active
- Side-by-side desktop layout tweak for the results grid at wider viewports
  (mostly a CSS breakpoint change, underlying flex/grid already supports it)
- Worker origin-check hardening (explicit server-side rejection, not just a
  CORS header) + optional Cloudflare dashboard rate-limiting rule
- Deferred: a Python script (manual or scheduled GitHub Action) that
  snapshots the personal watchlist to static JSON for zero-live-API personal
  use — floated once, not pursued

## Working style notes for this project specifically

- Michael tests the live deployed app and reports real bugs with screenshots
  — treat his bug reports as ground truth, trace the actual code rather than
  guessing.
- He explicitly wants "log it, don't build" respected — several rounds of
  this conversation involved him listing ideas to log for a future batch
  rather than immediate asks. Don't build proactively from the queued list
  above unless he asks.
- Prefers accurate, hedged claims over impressive-sounding ones — has pushed
  back (correctly) on inflated comparisons to JustWatch/Reelgood and on
  "enterprise-grade" framing for this project. Keep self-assessment of the
  tool's scope honest: it's a solid personal tool with real bugs found and
  fixed through manual testing, not a production-hardened product.
- Every code change in this project has gone through: `node --check` on the
  extracted JS, an ID-reference cross-check between HTML and JS, and a
  present_files call before being considered done. Keep that verification
  habit — a couple of real bugs (a stray duplicate `</div>`, a broken
  `ALLOWED_ORIGIN` trailing slash) were only caught because of it.
