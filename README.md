# 사주 · Saju — Korean Four Pillars with True Solar Time

An accurate Saju (Four Pillars / 사주) calculator built for a **non-Korean, English-speaking
audience**. Accuracy via **true solar time** is the headline feature: most calculators get the
year/month pillars wrong by using the Lunar New Year or the calendar month instead of the solar
terms. This one doesn't.

- **Year boundary** at 입춘 (Ipchun / Start of Spring), *not* Jan 1 or Lunar New Year.
- **Month boundaries** at the 12 major solar terms (the Sun's actual position), not calendar months.
- **True solar time** = longitude correction (4 min/°) + Equation of Time, with timezone and
  historical DST resolved from the IANA database.
- **Solar positions** from a truncated VSOP87 series → solar-term instants accurate to ~18 seconds.
- Validated against Python `lunar-python` (295 tests).

## What's inside

- **`src/`** — the calculation engine (TypeScript):
  - `astro/` — Julian dates, ΔT, VSOP87 sun position, solar terms
  - `time/trueSolarTime.ts` — civil clock → true solar time (Luxon)
  - `pillars.ts` — the four pillars; `analysis.ts` — Ten Gods & five-element balance
  - `daeun.ts` — dae-un (luck pillars); `glossary.ts` — teaching text; `index.ts` — `computeSaju()`
- **`web/`** — the teaching-forward web UI (Vite, vanilla TS/CSS)
- **`tests/`** — Vitest suite + reference data
- **`.github/workflows/deploy.yml`** — auto-deploys the web app to GitHub Pages on every push to `main`

## Prerequisites

- **Node.js** (LTS). Easiest via [nvm](https://github.com/nvm-sh/nvm):
  ```
  export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"   # if nvm isn't auto-loaded
  nvm install --lts
  ```
- **Git**.

## Setup

```
git clone https://github.com/World-of-Simone/saju.git
cd saju
npm install
```

Set your git identity once per machine:

```
git config --global user.name "Simone"
git config --global user.email "simonegrace@users.noreply.github.com"
```

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the full test suite (Vitest) |
| `npm run build` | Compile the engine (TypeScript → `dist/`) |
| `npm run dev:web` | Build the engine, then serve the web app at http://localhost:5173 |
| `npm run build:web` | Production build of the web app → `web-dist/` |
| `npm run typecheck` | Type-check without emitting |

> The web app imports the **compiled** engine from `dist/`, so `npm run build` must run before the
> web app can pick up engine changes. `dev:web` and `build:web` do that for you.

## Deployment

Pushing to `main` triggers the **GitHub Pages** workflow, which builds `web/` and publishes it.

- **Live site:** https://world-of-simone.github.io/saju/
- Vite's `base` is set to `/saju/` for the production build so assets resolve on the project page.
- Editing anything under `.github/workflows/` requires a token with the **`workflow`** scope
  (a fine-grained token with *Workflows: Read and write*).

## Working across multiple computers

The code lives on GitHub, so any of your machines can work on it. To avoid the two copies
drifting apart:

1. **Before you start:** `git pull` — get whatever the other machine pushed.
2. **When you finish:** commit and `git push`.

First push from a new machine will prompt for credentials: username `simonegrace`, password = a
GitHub token (fine-grained, this repo, *Contents* + *Workflows: Read and write*). It's saved to
that machine's keychain afterward.

## Design decisions (locked)

- Call it **"Saju," not "BaZi."** Labels in **Korean (hangul + hanja) + English**, not pinyin.
- **Teach heavily** — the audience starts from zero; many traditional term translations are
  misleading, so the UI explains inline.
- **대운 (dae-un)** is always computed. The user selects binary gender (what the classical system
  requires) with framing that keeps it an interpretive, non-deterministic choice.
- **Zi-hour (자시)** uses split 야자시/조자시 logic internally; not exposed as a user toggle.
