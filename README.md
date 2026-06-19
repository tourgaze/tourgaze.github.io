# TourGaze — Landing Page

Marketing microsite for [TourGaze](https://github.com/tourgaze/tourgaze), a
local-first ride viewer. Plain static HTML/CSS/JS — **no build step, no
dependencies**. Includes a baked-in interactive demo driven by a real,
downsampled ride (no backend needed).

## Run locally

A tiny zero-dependency Node server is included, so there's nothing to install:

```bash
npm run serve          # → http://localhost:5050
PORT=8080 npm run serve
```

Or open `site/index.html` directly in a browser.

## Structure

```
site/                 # the deployable static site (this is what Pages publishes)
├── index.html        # overview: hero 3D-ride eye-catcher + features + local-first
├── stack.html        # tech & developer page: stack, REST API, quick start
├── style.css         # styles (dark theme, brand gradient #4f8cff→#7c5cff)
├── main.js           # nav, scroll-reveal, copy buttons, interactive ride demo
├── tour-demo.js      # baked-in sample ride: window.TOUR_DEMO (real, downsampled)
└── goat.svg          # climbing-goat logo / favicon
server.js             # zero-dep static server for `npm run serve`
package.json          # scripts only — no deps
.github/workflows/deploy.yml   # GitHub Pages deploy (Actions, on push to main)
demo.jpg              # reference screenshot of the real app (not deployed; gitignored)
```

## Set the GitHub URL

Links currently point at the placeholder `github.com/tourgaze/tourgaze`
(9 occurrences across `site/index.html`, `site/stack.html`, `site/404.html`).
Once the real repo slug is known, swap them in one pass, e.g.:

```bash
grep -rl 'tourgaze/tourgaze' site | xargs sed -i 's#tourgaze/tourgaze#<owner>/<repo>#g'
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which uploads `./site`
and publishes it to GitHub Pages. Enable it once under
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Refreshing the demo ride

`site/tour-demo.js` is generated from a real TourGaze activity (track endpoint),
downsampled to ~220 points. To regenerate from a running backend:

```bash
curl -s "http://localhost:8085/api/activities/<id>/track" -o track.tmp.json
# downsample + write site/tour-demo.js (see the generator used in repo history)
```

## License

AGPL-3.0-or-later, matching the main TourGaze project.
