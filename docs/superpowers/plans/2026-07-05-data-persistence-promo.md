# Data Persistence & Social Media Promo — Implementation Plan

> **For agentic workers:** Read the spec at `docs/superpowers/specs/2026-07-05-data-persistence-promo.md` first. Then implement this plan task-by-task using the agent loop. Steps use checkbox (`- [x]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-05-data-persistence-promo.md`

**Architecture:** Extract shared pipeline module → wire data persistence into the web app → build CLI image generator using Playwright headless browser → generate 6 variant PNGs per question (2 ratios × 3 styles) → refactor to per-topic independent quizzes with zustand.

**Tech additions:** playwright (dev dep), tsx (for .ts imports from .mjs CLI), zustand (state management)

## Global Constraints

- Do not change existing API route behavior or web app UX
- Use `pnpm` only
- `resources/*` is gitignored (already in `.gitignore`)
- CLI uses manual `process.argv` parsing, no framework
- Shared modules use TypeScript, CLI entry is `.ts` run via `tsx`

---

### Task 1: Extract Shared Pipeline Module

- [x] Create: `lib/pipeline.ts` — shared NewsAPI fetch, DeepSeek quiz gen, data persistence, env loading
- [x] Refactor: `vite.config.ts` to import from pipeline
- [x] Refactor: `server.mjs` → `server.ts` to import from pipeline
- [x] Verification: typecheck, build, test pass

### Task 2: Wire Data Persistence

- [x] Add `POST /api/save-collected-data` to vite.config.ts and server.ts
- [x] Update `src/App.tsx` to save collected data after LLM quiz generation
- [x] Add explicit article IDs (`a-0`, `a-1`, …) and `articleRef` foreign keys on quiz questions
- [x] Include `imageUrl` in quiz question output
- [x] Verification: typecheck, build, test pass

### Task 3: Add Playwright & CLI

- [x] Install playwright, Chromium
- [x] Create `scripts/generate-promo.ts` CLI entry with `--fresh` and `--file --index` modes
- [x] Add `pnpm generate-promo` script

### Task 4: Promo Image Renderer

- [x] Create `scripts/render-promo-images.ts` — Playwright headless → PNG
- [x] 3 visual styles (classic, hero, compact) × 2 ratios (square, portrait) = 6 PNGs/question
- [x] Newspaper icon, answer options on card, no CTA
- [x] Output tree: `resources/promotion_images/<run_id>/<index>/<style-ratio>.png`

### Task 5: Per-Topic Quiz Refactor

- [x] Install zustand
- [x] Create `src/services/quizStore.ts` — per-topic state (questions, score, currentIndex)
- [x] Create `lib/quizPreloader.ts` — server-side: pre-generate quizzes at startup, cache in memory
- [x] Add `GET /api/quizzes` endpoint (returns all topic quizzes)
- [x] Rewrite `src/App.tsx` — topic tabs, per-topic score display, remove refresh/country filter
- [x] Verification: typecheck, build, test, lint all pass

### Task 6: Documentation

- [x] Update `docs/agent-loop/context.md` with new architecture
- [x] Update `AGENTS.md` with `pnpm generate-promo` command
- [x] Update `README.md` with promo command and architecture
- [x] Update spec doc with per-topic design and image variants

### Task 7: Final Verification

- [x] `pnpm typecheck` — zero errors
- [x] `pnpm build` — success
- [x] `pnpm test` — 37/37 pass
- [x] `pnpm lint` — zero errors, zero warnings
