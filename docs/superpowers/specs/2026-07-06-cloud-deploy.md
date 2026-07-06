# Cloud Deployment Architecture

## Goal

Deploy Newser as a zero-cost cloud pipeline: daily quiz generation via cron, static site hosting on Vercel, promo image storage on Cloudflare R2.

## Architecture

```
┌─ GitHub Actions (cron: daily @ 06:00 UTC) ─────────────────┐
│                                                               │
│  1. Check out repo                                            │
│  2. pnpm generate-quiz --fresh                                │
│     → resources/collected_data/<timestamp>.json               │
│  3. pnpm run prebuild   (copies quizzes → public/quizzes.json)│
│  4. pnpm build          (Vite builds static site)             │
│  5. Commit public/quizzes.json + collected_data, push         │
│  6. pnpm generate-promo --file <latest>                        │
│  7. bash scripts/finalise-promos.sh                              │
│     → resources/promotion_images_finalised/                      │
│  8. Upload finalised promos to Cloudflare R2 (aws s3 cp)        │
│     → s3://newser-promos/<date>/question/<id>.png                │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼ push to main
┌─ Vercel ────────────────────────────────────────────────────┐
│  Auto-detects push → rebuilds → deploys static site          │
│  newser.vercel.app serves latest quizzes                     │
└──────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Static Site (Vercel)

- **Source**: `dist/` (Vite build output)
- **Quiz data**: `public/quizzes.json` baked into build, fetched by client at runtime
- **No server needed**: Pure static HTML/JS/CSS + JSON data file
- **Custom domain**: Optional (free SSL included)

### 2. Daily Cron (GitHub Actions)

- **Trigger**: `schedule: cron(0 6 * * *)` — daily at 6 AM UTC
- **Also**: `workflow_dispatch` for manual runs
- **Secrets**: `NEWSAPI_KEY`, `DEEPSEEK_API_KEY`, `CLOUDFLARE_R2_*`
- **Runtime**: ~2-3 minutes (API calls + build)

### 3. Promo Image Storage (Cloudflare R2)

- **Bucket**: `newser-promos`
- **Structure**: `<date>/question/<id>.png`, `<date>/answer/<id>.png`
- **Free tier**: 10 GB storage, 1M writes/month, zero egress — more than enough

## Data Flow

### Build time (cron or manual)

```
collected_data/<ts>.json
  → loadQuizFile()
    → public/quizzes.json
      → Vite build
        → dist/assets/ + dist/quizzes.json
```

### Client runtime

```
fetch("/quizzes.json")
  → zustand store
    → per-topic quiz state
```

## Files Changed

| File                             | Change                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| `scripts/copy-quiz-for-build.ts` | **New**: reads collected_data → writes public/quizzes.json           |
| `public/quizzes.json`            | **New**: tracked in git, compiled quiz data                          |
| `src/App.tsx`                    | **Modify**: fetch `/quizzes.json` instead of `/api/quizzes`          |
| `package.json`                   | **Modify**: add `prebuild` script                                    |
| `.github/workflows/daily.yml`    | **New**: cron workflow                                               |
| `.gitignore`                     | **No change**: `resources/` already ignored, `public/` stays tracked |
| `AGENTS.md`, `README.md`         | **Modify**: document deployment                                      |

## User Setup Steps

### Vercel

1. Sign up at vercel.com (free GitHub login)
2. Import repo: `your-username/newser`
3. Framework: Vite, Build: `pnpm build`, Output: `dist`
4. Done. Site live at `newser.vercel.app`

### GitHub Actions

1. Go to repo Settings → Secrets and variables → Actions
2. Add secrets: `NEWSAPI_KEY`, `DEEPSEEK_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
3. Push workflow file — cron activates automatically

### Cloudflare R2

1. Sign up at cloudflare.com (free)
2. Create R2 bucket `newser-promos`
3. Generate R2 API token (S3-compatible): `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`
4. Add to GitHub Secrets: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

## Success Criteria

1. `pnpm prebuild` copies latest quiz data to `public/quizzes.json`
2. `pnpm build` produces a static site with quiz data inlined
3. `pnpm dev` still works (uses same data or API fallback)
4. GitHub Actions workflow runs `generate-quiz --fresh` successfully
5. Vercel deploys on push with no errors
6. Promo images uploaded to R2 and accessible via URL
