# Newser — Daily Briefing Brawl

A funny daily news quiz app. Five headlines enter, one reader leaves mildly informed and overconfident.

## How it works

1. **`pnpm generate-quiz --fresh`** — fetches news per topic from NewsAPI, generates quiz questions via DeepSeek, saves everything to `resources/collected_data/<timestamp>.json`
2. **`pnpm dev`** (or `pnpm start`) — reads the latest collected data, serves per-topic quizzes. Each topic (general, tech, politics, etc.) has its own independent 5-question quiz. Progress persists per topic while switching between them.
3. **`pnpm generate-promo`** — reads collected data, renders styled PNG quiz-card images for social media using Playwright

## Project structure

```
newser/
├── src/
│   ├── App.tsx                    # Topic tabs, quiz flow
│   ├── styles.css                 # Tabloid-trivia visual design
│   ├── types/news.ts              # Shared types
│   ├── services/
│   │   ├── quizStore.ts           # Zustand: per-topic state
│   │   └── streaks.ts             # localStorage streak + sharing
│   └── components/
│       ├── QuestionCard.tsx        # Single question UI
│       └── ScoreScreen.tsx        # Final score + share
├── lib/
│   └── pipeline.ts                # Types, data persistence, quiz file loading
├── scripts/
│   ├── generate-quiz.ts           # CLI: NewsAPI + DeepSeek → collected_data
│   ├── generate-promo.ts          # CLI: Playwright → PNG promo images
│   └── finalise-promos.sh         # Copy classic promos to flat folder for review
├── server.ts                      # Production Node server
├── vite.config.ts                 # Dev server + /api/quizzes endpoint
├── resources/                     # gitignored
│   ├── collected_data/            # Timestamped quiz snapshots
│   ├── promotion_images/          # Generated promo PNGs (nested)
│   └── promotion_images_finalised/# Flattened classic images for review
└── docs/                          # Agent loop + specs + plans
```

## Commands

```bash
pnpm dev                # Dev server (loads latest collected_data)
pnpm build              # Type-check + bundle
pnpm start              # Production server
pnpm test               # Vitest
pnpm typecheck          # TypeScript check
pnpm lint               # ESLint

pnpm generate-quiz --fresh                         # Fetch + generate + save
pnpm generate-quiz --file <name>                   # Regenerate from existing file

pnpm generate-promo                                # Render promos from latest data
pnpm generate-promo --file <name>                  # Render from specific file

bash scripts/finalise-promos.sh                    # Flatten classic images for review
```

### Quiz generation

`pnpm generate-quiz --fresh` fetches 20 articles per topic from NewsAPI, batches them into groups of 5, generates questions via DeepSeek, and saves to `resources/collected_data/`. Each article and question carries a `topic` field and explicit `articleRef` foreign keys.

`--file` regenerates questions from existing collected data.

### Promo images

`pnpm generate-promo` renders 6 styled PNGs per question (3 styles × 2 variants):

| Style | Vibe |
|-------|------|
| `classic` | Icon + "Newser" + "Daily Briefing Brawl" + card |
| `hero` | Same + "Five headlines enter..." tagline |
| `splash` | Magazine cover — image with overlaid prompt |

Each style produces a `-question` and `-answer` variant. The answer includes the correct answer (highlighted green), summary, and source URLs.

Run `bash scripts/finalise-promos.sh` to copy `classic-question.png` and `classic-answer.png` into a flat `resources/promotion_images_finalised/` folder for quick scanning.

## Environment

Create a `.env` file:

```bash
NEWSAPI_KEY=your_key
DEEPSEEK_API_KEY=your_key
```

Both required for `generate-quiz`. The dev server works without them if collected data already exists.

`QUIZ_SOURCE` env var overrides which collected data file to load (e.g. `QUIZ_SOURCE=2026-07-05.json pnpm dev`).

## Factuality rules

- Summaries must be accurate to the source article
- Decoy answers must not make false claims about real people
- Source links always point to the original article
- Humor is for prompts, decoys, and UI — never the factual summary
