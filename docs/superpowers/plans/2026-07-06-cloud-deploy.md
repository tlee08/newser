# Cloud Deployment — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-07-06-cloud-deploy.md`

---

### Task 1: Static Quiz Data Script

**Files:**

- Create: `scripts/copy-quiz-for-build.ts`

**Logic:**

- Uses `loadQuizFile()` from `lib/pipeline.ts`
- Falls back to a minimal empty quiz structure if no data
- Writes `public/quizzes.json`

**Verification:**

- [ ] `pnpm prebuild` writes `public/quizzes.json`
- [ ] File has valid structure: `{ all: [...], tech: [...], ... }`

---

### Task 2: Update Client to Fetch Static JSON

**Files:**

- Modify: `src/App.tsx`

**Change:** Replace `fetch("/api/quizzes")` with `fetch("/quizzes.json")`

**Verification:**

- [ ] `pnpm build` includes `quizzes.json` in dist
- [ ] `pnpm dev` still works (dev server serves from public/)

---

### Task 3: Add prebuild Script

**Files:**

- Modify: `package.json`

**Change:** `"prebuild": "tsx scripts/copy-quiz-for-build.ts"`

**Verification:**

- [ ] `pnpm build` runs prebuild automatically
- [ ] `dist/quizzes.json` exists after build

---

### Task 4: GitHub Actions Workflow

**Files:**

- Create: `.github/workflows/daily.yml`

**Workflow steps:**

1. Checkout repo
2. Setup pnpm, install deps
3. `pnpm generate-quiz --fresh` (uses secrets)
4. `pnpm run prebuild`
5. `pnpm build`
6. `pnpm generate-promo` (optional: promo images)
7. Commit + push quizzes.json
8. Upload promo images to R2

**Verification:**

- [ ] Workflow file is valid YAML
- [ ] `workflow_dispatch` trigger present for manual runs

---

### Task 5: Documentation

**Files:**

- Modify: `AGENTS.md` — add deployment section
- Modify: `README.md` — add deployment instructions + architecture diagram

**Verification:**

- [ ] README clearly explains how to deploy
- [ ] AGENTS.md references the cloud deployment docs

---

### Task 6: Final Verification

- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm build` — success, quizzes.json in dist
- [ ] `pnpm test` — all pass
- [ ] `pnpm lint` — zero errors, zero warnings
