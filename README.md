# Where to Watch

A single-page tool that takes your movie watchlist and tells you where each title
is actually streaming — checked against the specific services you have, not a
generic "available on 12 platforms" list that includes ones you don't pay for.

Built around a Letterboxd watchlist export, but works with any list of titles.

## What it does

- **Import your list** — upload a Letterboxd CSV export, or type/paste titles
  directly (one per line, year optional).
- **Pick your services** — tap to toggle which streaming subscriptions you
  actually have. Add anything not in the default list.
- **Check availability** — for each title, looks up whether it's streaming on
  one of *your* services, or what it'd cost to rent/buy otherwise.
- **Streaming gets top billing** — a gold "🏆 Streaming on X" badge when it's
  covered by something you already pay for; a quiet rent/buy note otherwise.
- **Filter to just what's streaming** — hide everything that isn't covered by
  your subscriptions.
- **Export results** to a CSV.
- Everything (your list, service picks, lookup results) is saved in your
  browser only — nothing is stored on a server unless you deploy the optional
  proxy below.

## Setup

You need a free [TMDB](https://www.themoviedb.org/settings/api) API key — it
powers the title matching and tells you stream vs. rent vs. buy. Paste it into
the API Keys panel in the app; there's a built-in walkthrough if you're new to
TMDB. A [Watchmode](https://api.watchmode.com/) key is optional and only adds
real rent/buy prices on top.

Keys are stored in your browser's localStorage only — never sent anywhere but
directly to TMDB/Watchmode, and never committed to this repo.

### Hosting

This is a static site — no build step, no backend required. `index.html` is
the whole app. Push it to a GitHub repo and turn on GitHub Pages (Settings →
Pages → deploy from branch), and it's live.

### Optional: hide your API key entirely (for public/shared use)

If you want other people to be able to use your hosted copy without each of
them needing their own TMDB account, deploy the included `worker.js` as a free
Cloudflare Worker. It holds your API key server-side and proxies requests, so
visitors get working lookups with zero setup. Full deploy steps are in the
comments at the top of `worker.js` (roughly 5 minutes, free tier covers
100,000 requests/day). Once deployed, paste the Worker URL into the "Proxy
URL" field instead of a personal key.

## Files

- `index.html` — the whole app (HTML/CSS/JS, no build step, no dependencies
  beyond PapaParse loaded from a CDN for CSV parsing)
- `worker.js` — optional Cloudflare Worker proxy (see above)

## How matching works

Titles are matched against TMDB by name (and year, if you provide one). A few
things worth knowing:

- An exact title match always wins over a more popular film with a similar
  name (e.g. "Dolemite" correctly finds the 1975 film, not the more famous
  "Dolemite Is My Name").
- If your title's missing a leading "The" (e.g. "Godfather" instead of "The
  Godfather"), the tool tries both and ranks by popularity to compensate.
- Streaming service names are matched with some tolerance for formatting
  ("Apple TV+" / "Apple TV Plus" are recognized as the same thing), but
  genuinely different tiers (e.g. "Paramount+" vs. the separate ad-free
  "Paramount+ Premium") are kept distinct on purpose — they really are
  different products with different catalogs.
- Every result has a small "ⓘ match info" hover showing exactly which TMDB
  title/year it matched and everything TMDB lists as available for it, for
  troubleshooting.

## Known limitations

- TMDB's availability data (sourced via JustWatch) isn't always current —
  new releases especially can lag behind reality by a few days.
- Misspelled titles beyond the missing-"The" case aren't corrected.
- Sequel-numbering variants ("Godfather 3" vs. "Godfather Part 3") aren't yet
  normalized — type the number out.
- US-only for now.

## Credits

Data via [TMDB](https://www.themoviedb.org/) (this product uses the TMDB API
but is not endorsed or certified by TMDB) and optionally
[Watchmode](https://www.watchmode.com/).
