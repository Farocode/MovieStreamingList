# Where to Watch

A single-page tool that takes your movie watchlist and tells you where each title
is actually streaming — checked against the specific services you have, not a
generic "available on 12 platforms" list that includes ones you don't pay for.

Built around a Letterboxd watchlist export, but works with any list of titles.

## What it does

- **Import your list** — upload a Letterboxd CSV export, or type/paste titles
  directly (one per line, year optional). Importing or adding auto-triggers a
  check, so there's no separate "now go press refresh" step.
- **Pick your services** — tap to toggle which streaming subscriptions you
  actually have. Add anything not in the default list, or use "Sync real
  service names from TMDB" to pull in your region's actual providers.
  "Select all" / "Clear all" handle bulk changes.
- **Check availability** — for each title, looks up whether it's streaming on
  one of *your* services, or what it'd cost to rent/buy otherwise. If it's not
  on anything you've checked but is streaming somewhere else, that shows too,
  quietly, so you're not stuck toggling services just to see general availability.
- **Streaming gets top billing** — a gold "🏆 Streaming on X" pill, laid out
  in a fixed left column so it always lines up the same way; rent/buy sits in
  its own column on the right, so the two never crowd each other.
- **Filter to just what's streaming** — hide everything that isn't covered by
  your subscriptions.
- **Light/dark theme** — toggle in the marquee's top corner; choice is remembered.
- **Export results** to a CSV.
- **Toggling a service updates results instantly** — already-checked titles
  get reclassified against your current picks with zero API calls, since it's
  just re-sorting data already in the cache. A full refresh only re-fetches
  what's actually missing or stale.
- **Results stay fresh** — cached for 24 hours, then automatically re-checked
  on your next refresh.
- Everything (your list, service picks, lookup results) is saved in your
  browser only — nothing is stored on a server unless you go out of your way
  to deploy the advanced proxy option.

## Setup

You need a free [TMDB](https://www.themoviedb.org/settings/api) API key — it
powers the title matching and tells you stream vs. rent vs. buy. This is the
easiest path: free, no credit card, a couple minutes. Paste it into the API
Keys panel at the bottom of the app (there's a jump-link near the top if you
need it) — there's a built-in walkthrough if you're new to TMDB. A
[Watchmode](https://api.watchmode.com/) key is optional and only adds real
rent/buy prices on top.

Keys are stored in your browser's localStorage only — never sent anywhere but
directly to TMDB/Watchmode, and never committed to this repo.

**A note on that:** localStorage is convenient but not a vault — any script
running on the page (in principle, a malicious browser extension, or anyone
with access to that browser) could read what's stored there. Fine for a
personal machine; if you're on a shared or public computer, don't save the
key after you're done, or look at the proxy option below.

### Hosting

This is a static site — no build step, no backend required. `index.html` is
the whole app. Push it to a GitHub repo and turn on GitHub Pages (Settings →
Pages → deploy from branch), and it's live.

### Advanced: hiding the API key entirely (self-hosted only)

The default setup (a personal TMDB key, above) is the right choice for almost
everyone. If you specifically want your *own* key off the client entirely —
for your own peace of mind, not for sharing with others — deploy the included
`worker.js` as a free Cloudflare Worker. It holds your key server-side and
proxies requests instead. Full deploy steps are in the comments at the top of
`worker.js` (roughly 5–15 minutes depending on your familiarity with the
command line; free tier covers 100,000 requests/day). Once deployed, paste
the Worker URL into the "Advanced" proxy field at the bottom of the API Keys
panel.

**Worth knowing:** saving the proxy URL only affects *your own browser* — it
doesn't make the app work key-free for other visitors to your GitHub Pages
site. Each visitor's browser has its own separate, empty localStorage; they'd
still need their own TMDB key (or your Worker URL, if you choose to share it)
unless the app is changed to default to it automatically, which it currently
doesn't. The `ALLOWED_ORIGIN` check in the Worker also only controls what a
*browser* can read back — it's not a real access-control gate against a
script hitting the URL directly, since CORS is enforced client-side. Low risk
for a personal-scale deployment, but worth knowing if you ever do share the
URL.

## Files

- `index.html` — the whole app (HTML/CSS/JS, no build step, no dependencies
  beyond PapaParse loaded from a CDN for CSV parsing). Panel order top to
  bottom: import/add your list, results, streaming services, then API keys
  (personal key first, advanced proxy option at the bottom).
- `worker.js` — optional Cloudflare Worker proxy (see Advanced section above)

## How matching works

Titles are matched against TMDB by name (and year, if you provide one). A few
things worth knowing:

- An exact title match always wins over a more popular film with a similar
  name (e.g. "Dolemite" correctly finds the 1975 film, not the more famous
  "Dolemite Is My Name").
- If your title's missing a leading "The" (e.g. "Godfather" instead of "The
  Godfather"), the tool tries both and ranks by popularity to compensate.
- Streaming service names are matched with some tolerance for formatting
  ("Disney+" / "Disney Plus" are recognized as the same thing), but
  genuinely different products are kept distinct on purpose — e.g.
  "Paramount+" vs. the separate ad-free "Paramount+ Premium" tier, or a
  standalone app vs. its "X Amazon Channel" add-on variant. Those really are
  different things with different catalogs, even when they sound similar.
- **TMDB/JustWatch's real provider names don't always match what you'd
  guess** — the Apple TV+ subscription is actually named plain "Apple TV" in
  their data (no "+"), not "Apple TV Plus". When a mismatch like this turns
  up, the default name gets corrected and a one-time migration fixes any
  existing saved list automatically, preserving your on/off choice.
- New entries added to the curated default service list reach *every*
  session on next load, not just fresh installs — added as off, never
  overwriting anything you've already set, and never duplicating something
  you already have under a different name.
- Every result has a small "ⓘ match info" hover showing exactly which TMDB
  title/year it matched, a rough confidence label (exact title+year vs. a
  popularity fallback with nothing exact), when it was last checked, and
  everything TMDB lists as available for it — for troubleshooting.
- If a lookup fails, the message is specific where it can be (e.g. "rate
  limited — try again later" for a 429, "API key rejected" for a 401)
  rather than a generic failure.

## Default services

The starting toggle list is a curated set of the most mainstream,
movie-relevant services (rather than every regional platform TMDB knows
about, which would be dozens of entries): Netflix, HBO Max, Hulu, Amazon
Prime Video, Disney Plus, Apple TV, Paramount Plus, Peacock, Starz, AMC+,
Tubi, and Pluto TV. Anything else — MGM Plus, Criterion Channel, Shudder,
MUBI, live-TV bundles like YouTube TV or Philo, channel add-ons, etc. — is
one click away via "Sync" or the manual add box.

## Known limitations

- TMDB's availability data (sourced via JustWatch) isn't always current —
  new releases especially can lag behind reality by a few days.
- Misspelled titles beyond the missing-"The" case aren't corrected.
- Sequel-numbering variants ("Godfather 3" vs. "Godfather Part 3") aren't yet
  normalized — type the number out.
- US-only for now.
- The Worker proxy's origin check is browser-enforced only (see Advanced
  section above) — fine for personal use, worth hardening before sharing the
  URL widely.

## Credits

Data via [TMDB](https://www.themoviedb.org/) (this product uses the TMDB API
but is not endorsed or certified by TMDB) and optionally
[Watchmode](https://www.watchmode.com/).
