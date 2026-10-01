# NYMM — Mixnet Timing Dossier

**NYMM** (Nym Mixnet Metadata) is a small lab that times the same tip- and wallet-shaped HTTP requests on **clearnet** and through the **Nym mixnet**, then plots the difference.

It uses real [`@nymproject/mix-fetch`](https://nym.com/docs/developers/mix-fetch/get-started) — not a mocked delay.

> Independent community prototype. Not affiliated with Nym Technologies SA.

---

## Why it exists

Tip APIs and wallet RPC over clearnet bind **who** (client IP) to **what** (endpoint) and **when** (timing). Hiding an amount on a social feed does not hide that adjacency.

NYMM asks a concrete question:

> If I send the same JSON body through browser `fetch` and through `mix-fetch`, what does the Sphinx path cost in milliseconds — and what does that buy in metadata terms?

---

## Features

| Area | What you get |
|------|----------------|
| **Lab** | Arm mixnet tunnel, run GET / Tip / Wallet probes, or **Full battery** |
| **Stats** | Session KPIs (avg, P50/P90, Δ, ratio), by-label table, dual-trace / overhead / cumulative / composition / scatter charts, run log |
| **Method** | Threat model, transport matrix, metrics glossary, build limits |
| **About** | Problem, approach, scope, and how to use |
| **Export** | Download session JSON for your own notes |

Probes hit a neutral echo host ([httpbin.org](https://httpbin.org/)) so the lab stays self-contained. Swap endpoints later for a real tip or RPC host.

---

## Quick start

```bash
git clone https://github.com/panagot/nymm.git
cd nymm
npm install
npm run dev
```

Open **http://localhost:5177/**

1. **Arm mixnet** (first run loads WASM — wait for Live).
2. Run **Full battery** (or individual probes).
3. Open **Stats** → review charts → **Export JSON** if needed.

```bash
npm run build    # production build → dist/
npm run preview  # serve the build locally
```

---

## How it works

```text
Same URL + same body
        │
        ├─► clearnet:  browser fetch()     → clearMs
        │
        └─► mixnet:    @nymproject/mix-fetch
                       (Sphinx: client → gateway → mix → exit → host)
                                               → mixMs

Δ = mixMs − clearMs
ratio = mixMs / clearMs
```

- Tunnel via `createMixFetch` (mix-fetch v2 / smolmix WASM).
- Clock: `performance.now()` from request start until the response body is read.
- Demo defaults: **cover traffic off**, **Poisson traffic off** (snappier interactive labs). Re-enable for production-shaped latency.

Details live on the in-app **Method** page.

---

## Stack

- React 19 · Vite 8
- [`@nymproject/mix-fetch`](https://www.npmjs.com/package/@nymproject/mix-fetch) ^2.1
- No chart library — SVG instrument plates only

---

## Live demo

**https://nymm.vercel.app**

## Deploy (Vercel)

This repo includes `vercel.json` for a Vite static build. GitHub is connected for continuous production deploys on `main`.

```bash
npx vercel --prod
```

Hash routes (`#/lab`, `#/stats`, …) work without server path rewrites beyond the included SPA fallback.

---

## Project layout

```text
NYMM/
├── public/           # favicon / mark SVGs
├── src/
│   ├── components/   # charts, layout, logo
│   ├── hooks/        # hash routing
│   ├── lib/mix.js    # clearnet + mix-fetch helpers
│   └── pages/        # Lab, Stats, Method, About
├── index.html
├── vite.config.js
├── vercel.json
└── LICENSE
```

---

## Limits (honest scope)

- Echo target is **httpbin**, not a production tip host.
- Mix-fetch tunnel is **one-shot per page load** (v2).
- Cover / Poisson disabled in the default lab profile.
- No custody, no real wallet spends — timing and transport comparison only.

---

## License

[MIT](./LICENSE) © panagot
