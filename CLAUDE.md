# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**梦阈 · DreamGate** — a local-first "personal subconscious archive" web app (TRAE AI 创造力大赛 entry). Users record dreams → AI generates a stylistically-consistent image + emotion/symbol analysis → browse them in a 3D corridor gallery → export share cards → track emotion streaks. All data lives in the browser (IndexedDB); there is no backend database. Comments and UI copy are in Chinese.

## Commands

```bash
npm run dev        # Vite dev server (HMR)
npm run build      # tsc -b (typecheck, emits nothing) && vite build → dist/
npm run check      # tsc -b --noEmit — typecheck only, run this to validate changes
npm run lint       # eslint .
npm run preview    # preview the production build
node scripts/gen-seeds.mjs   # regenerate the 20 SVG seed placeholders in public/seeds/
```

There is **no test runner** configured (no `test` script, no test files). Validate changes with `npm run check` + `npm run lint` + manual verification in `npm run dev`. `npm install` uses the npmmirror registry (`.npmrc`); the build will not pass until `npm run check` is clean because `build` runs `tsc -b` first.

Stack: Vite 6 · React 18 · TypeScript 5.8 (`strict: false`) · three.js / @react-three/fiber + drei · GSAP + Framer Motion + Lenis · Tailwind 3 · Zustand 5 · idb. Import alias `@/*` → `src/*` (via `vite-tsconfig-paths`).

## Architecture

### Layering — keep `src/lib/*` React-free
`src/lib/*` is the pure-logic layer (types, emotion/symbol/aesthetic libraries, AI client, db, rule parser, degradation) and must not import React or components. The data model in `src/lib/types.ts` is the single source of truth and is shared **across the edge-function boundary** — the `DreamAnalysis` shape returned by `/api/llm` must match what `lib/ai.ts` validates.

### State flows through the Zustand store, never the DB directly
Components read state and call actions on `useDreamStore` (`src/store/useDreamStore.ts`). Each mutating action writes IndexedDB **and** updates store state (e.g. `addDream` → `db.addDream` then `set`). Components must never call `src/lib/db.ts` directly — go through the store so the in-memory copy stays consistent. The DB is `dreamgate-db` v1 with stores `dreams` / `meta` (single record, key `'meta'`) / `inspirations`.

### Three-tier AI fallback (the core resilience design)
Generation never hard-fails. Spanning `lib/ai.ts`, `lib/seedLibrary.ts`, `lib/ruleParser.ts`, and `components/Generation/GenerationOrchestrator.tsx`:
- **Image**: Pollinations.ai flux URL (built synchronously, no Key, not pre-validated) → on `<img>` `onError`, fall back to a `public/seeds/*.svg` placeholder (4 presets × 5 emotion keys = 20 files). The orchestrator tracks `imageErroredRef` to swap to a seed image before re-rendering.
- **Analysis**: `POST /api/llm` (LLM) → on any failure, fall back to keyword rule parsing (`ruleParser`).
- **Offline** (`navigator.onLine`) or **AI declined** (consent dialog): skip the network entirely, build a fully local artifact.
Every artifact carries source flags (`imageSource`, `analysisSource`, `imageFallback`, `analysisFallback`, `offline`) so the UI can show what happened.

### Dual edge function — EdgeOne primary, Vercel backup, kept in sync by hand
Two implementations of the same `/api/llm` contract:
- `edge-functions/api/llm.ts` — **primary**, EdgeOne Pages. Calls the injected global `AI` binding (Edge AI / DeepSeek-V3), zero API Key, ~50 calls/day. Exports `onRequest(context)` and reads `context.request`.
- `api/llm.ts` — **backup**, Vercel. Calls SiliconFlow (Qwen2.5-7B) via `fetch`, needs `SILICONFLOW_API_KEY` env var. Exports `default handler(req)` + `onRequest` alias.

The shared helpers (`SYSTEM_PROMPT`, `extractJSON`, `normalizeAnalysis`, `json`, and the `LLMMessage` / `AnalyzeRequest` types) are duplicated **verbatim** between the two files. **If you change one, change the other** or the two deploy targets drift. `edge-functions/api/ping.ts` probes the AI binding shape for post-deploy debugging.

### Routing — HashRouter on purpose
`src/App.tsx` uses `HashRouter`, not `BrowserRouter`, because EdgeOne Pages has no SPA-fallback rewrites. All URLs are `/#/path`; share links must include the `/#/` prefix (see `components/Share/shareUtils.ts`, which also encodes the dream as a `?d=` base64 param for read-only viewing). Route components are **not** lazy-loaded by design. Seven pages in `src/pages/` map 1:1 to routes (gate `/`, gallery, record, `dream/:id`, `share/:id`, report, pool).

### Two-layer degradation system
`src/lib/degradation.ts` exposes four flags (`mobile2_5D`, `shareCard3D`, `fogShader`, `desktop3D`):
- **Compile-time**: `VITE_DEGRADE_*` env vars (read once at build) — set these to force a degraded build.
- **Runtime**: `triggerDegradation(key)` flips a flag live and is **irreversible** (delivery-safety bias); components subscribe via the `useDegradation()` hook (`useSyncExternalStore`).
Additionally, `GalleryPage` auto-picks 3D vs 2.5D at runtime from WebGL availability, `innerWidth < 768`, and `navigator.hardwareConcurrency < 4` — independent of these flags. User mode choice is persisted in `localStorage` (`dg-gallery-mode`).

### Seed demo data
`src/data/seedDreams.ts` holds 5 curated example dreams (including a cross-dream pattern: water ×3 + flying/falling contrast for the report page). `GalleryPage` auto-loads them **once** into an empty gallery, guarded by `localStorage` key `dreamgate-seeds-auto-loaded`, so a user who clears all dreams is not re-seeded.

## Conventions

- **Theming**: use the `dreamgate-*` Tailwind color tokens and `font-display` / `font-body` / `font-mono` families defined in `tailwind.config.js` rather than raw hex/fonts. The 4 aesthetic presets each map to a representative color (ethereal/darkfantasy/mystical/psychedelic).
- **Component folders** under `src/components/<Feature>/` each have an `index.ts` barrel; import features via the barrel (`@/components/Gallery`).
- **Reproducible seeds**: image seeds are derived deterministically from `dream.id` (`hashSeed` in the orchestrator) so regenerating a dream yields the same image.
- The `.trae/` directory holds the original spec/tasks/checklist; `docs/开发记录.md` is the running dev log and `docs/部署指南.md` the EdgeOne deploy guide.
