## Recommended: Vercel (static site) + GitHub Actions (daily cron) + Cloudflare R2 (promos)

**$0/month across all three services.**

### Architecture

```
CRON (GitHub Actions, daily @ 6am UTC)
│
├─ 1. pnpm generate-quiz --fresh
│     → saves collected_data to resources/collected_data/
│
├─ 2. Copy latest quizzes → public/quizzes.json
│     → commit + push to repo
│
├─ 3. Vercel detects push → auto-rebuilds + deploys site
│     → newser.vercel.app goes live with today's quiz
│
├─ 4. pnpm generate-promo --file <latest>
│     → 6 PNGs per question
│
└─ 5. Upload PNGs to Cloudflare R2 bucket
      → viewable at r2-bucket/promos/<timestamp>/0/classic-question.png
```

### What changes in the app

| Change                                                           | Why                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Add `public/quizzes.json` to git (not gitignored)                | Baked into static build, fetched at runtime                               |
| `src/App.tsx` fetches `./quizzes.json` instead of `/api/quizzes` | No server needed — pure static                                            |
| New script: copies latest collected_data → `public/quizzes.json` | Bridge between generated data and static build                            |
| New: `.github/workflows/daily.yml`                               | Cron workflow with `NEWSAPI_KEY` and `DEEPSEEK_API_KEY` as GitHub Secrets |
| R2 bucket + `wrangler r2 object put` step                        | Stores promo images for you to review and post                            |

### Free tier limits

| Service        | Limit                            | Our usage                |
| -------------- | -------------------------------- | ------------------------ |
| Vercel         | 100 GB bandwidth, 100 GB storage | ~500 KB site, well under |
| GitHub Actions | Unlimited minutes (public repo)  | ~2 min/day               |
| Cloudflare R2  | 10 GB storage, zero egress       | ~50 MB promos/month      |

### Why not Render?

Render's free Web Services spin down after 15 minutes of inactivity and have 750 hours/month. Vercel's static hosting has no spin-down, is faster, and is purpose-built for React apps.

---

This approach turns the site into a static build with quiz data baked in — no live server needed at runtime. The daily freshness comes from the cron job updating the data file and Vercel redeploying.

Sound good? Any preferences on the R2 bucket structure or cron timing?
