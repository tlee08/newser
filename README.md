# Newser — Daily Briefing Brawl

A funny daily news quiz app. Five headlines enter, one reader leaves mildly informed and overconfident.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (React SPA)                  │
│                                                          │
│  ┌─────────┐   ┌──────────────┐   ┌───────────────────┐  │
│  │ newsApi │──▶│  App.tsx     │──▶│   UI Components   │  │
│  │ llmQuiz │   │  state machine│   │ QuestionCard      │  │
│  │ streaks │   │  useMemo/use-│   │ ScoreScreen       │  │
│  │quizBldr │   │  Callback    │   │ ...               │  │
│  └────┬────┘   └──────┬───────┘   └───────────────────┘  │
│       │               │                                   │
└───────┼───────────────┼───────────────────────────────────┘
        │ fetch()       │
        ▼               ▼
┌──────────────────────────────────────────────────────────┐
│              Server (Vite middleware / server.mjs)         │
│                                                          │
│  GET  /api/news          ───▶  NewsAPI top-headlines     │
│  POST /api/generate-quiz ───▶  DeepSeek chat completions │
│                                                          │
│  Keys live only in process.env — never sent to browser.   │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Retrieve Data (NewsAPI)

The app fetches live headlines from NewsAPI through a **server-side proxy** so the API key never reaches the browser.

```
Browser                    Server (dev/prod)              NewsAPI
───────                    ─────────────────              ───────
fetchDailyNews()
  → GET /api/news
  (optional ?country=us)   → env.NEWSAPI_KEY              GET top-headlines
                              country, language, pageSize
                            ← { articles: [...] }     ←  { articles: [...] }
  ← NewsArticle[]
```

- **Dev**: Handled by a Vite plugin (`vite.config.ts`) that adds Express-style middleware.
- **Prod**: Handled by `server.mjs`, a zero-dependency Node HTTP server. Serves static files from `dist/` and proxies `/api/*`.
- If no key is present, returns an empty list and the app falls back to 5 hardcoded demo articles.

### 2. Generate Questions (Rule-Based)

The rule-based engine in `src/services/quizBuilder.ts` turns headlines into a 5-question quiz **without an LLM**:

```
Articles → buildDailyQuiz(articles, seed?)
           │
           ├─ detectCategory(article)   keyword-matched → politics|tech|sports|science|world|business|general
           ├─ compactAnswer(title)      strip "- Source" / "| Recap" suffixes
           ├─ pickPrompt(cat, seed)     picks from ~100 category-aware prompt templates
           └─ seededShuffle(options)    Fisher-Yates with daily seed → same order all day

   Output: QuizQuestion[] (5 items, 4 options each)
```

Question structure:
- **Prompt**: Humorous, category-matched (e.g., "What political saga is unfolding in this headline?")
- **Options**: Correct answer (compact headline) + 2 real headline decoys + 1 absurd decoy — shuffles deterministically per day
- **Summary**: The article description, kept factual
- **Source link**: Original article URL

### 3. Generate Questions (LLM / DeepSeek)

When a `DEEPSEEK_API_KEY` is available, the app tries to use DeepSeek to generate funnier, more creative questions:

```
Browser                        Server                      DeepSeek
───────                        ──────                      ────────
generateLLMQuiz(articles)
  → POST /api/generate-quiz
    { articles: [...] }        → env.DEEPSEEK_API_KEY       chat/completions
                                 system prompt:
                                 "You are a witty news      deepseek-chat
                                  quiz generator..."        max_tokens=2000
                                 articles as user message   temperature=0.9
                               ← { quiz: [...] }        ←  JSON array
  ← QuizQuestion[]
```

- The server sends a detailed system prompt instructing DeepSeek to generate 5 questions with factual answers and absurd decoys.
- If the LLM call fails or returns malformed JSON, the function returns `[]` and the app silently falls back to the rule-based engine.
- Keys are server-side only — the browser never sees them.

### 4. Store Data

| Data | Storage | Lifetime |
|------|---------|----------|
| News articles | React state (`useState`) | Per session (cleared on refresh/restart) |
| Quiz questions | React state + derived (`useMemo`) | Per session |
| Current streak | `localStorage` (`newser-streak-count`) | Persistent across sessions |
| Last play date | `localStorage` (`newser-last-play-date`) | Persistent |
| API keys | `process.env` (server-side only) | Configured at deploy |
| Category / country prefs | React state | Per session |

**Streak logic** (`src/services/streaks.ts`):
- Play today → +1 if yesterday was played, else reset to 1
- Same-day replay → no change
- Uses UTC dates so streaks work across timezones

### 5. Present Data (UI)

The app is a **finite state machine** with three stages:

```
  loading  ──→  playing  ──→  score
    │              │             │
    │  [fetch +    │  [answer    │  [verdict +
    │   generate]  │   5 q's]    │   share]
```

**Components:**

- `App.tsx` — Orchestrator. Holds all state, computes derived values, manages the stage machine.
- `QuestionCard.tsx` — Single question view. Shows image/prompt, 4 radio-card options, progress bar, summary after answering, source link. Auto-focuses first option for keyboard accessibility.
- `ScoreScreen.tsx` — Final results. Trophy icon, score fraction, contextual verdict, streak badge, share button (Web Share API with clipboard fallback).

**Styling** (`src/styles.css`):
- "Tabloid trivia arcade" aesthetic — yellow background, punchy black borders, offset shadows, Space Grotesk headings.
- Pink accent color for interactive elements.
- Responsive at 640px breakpoint.

---

## Project Structure

```
newser/
├── src/
│   ├── App.tsx                    # State machine, orchestrator
│   ├── main.tsx                   # Entry point, MantineProvider
│   ├── styles.css                 # Tabloid visual design
│   ├── types/
│   │   └── news.ts                # NewsArticle, QuizQuestion types
│   ├── services/
│   │   ├── newsApi.ts             # fetchDailyNews() → GET /api/news
│   │   ├── quizBuilder.ts         # Rule-based quiz generation
│   │   ├── llmQuiz.ts             # DeepSeek quiz generation client
│   │   └── streaks.ts             # localStorage streak tracking + sharing
│   └── components/
│       ├── QuestionCard.tsx        # Single quiz question UI
│       └── ScoreScreen.tsx        # Final score + share UI
├── vite.config.ts                 # Dev server + API middleware
├── server.mjs                     # Production Node server
├── public/
│   └── news-placeholder.svg       # Fallback image
├── docs/
│   ├── agent-loop/                # Agent instructions + backlog
│   └── superpowers/               # Design specs + plans
└── package.json                   # pnpm, React 19, Mantine 9, Vite 7
```

---

## Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start Vite dev server (with API middleware)
pnpm build        # Type-check + bundle for production
pnpm start        # Run production server (node server.mjs)
pnpm test         # Run vitest (37 tests)
pnpm typecheck    # TypeScript check only
```

---

## Environment Variables

Create a `.env` file:

```bash
NEWSAPI_KEY=your_newsapi_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

- Without `NEWSAPI_KEY`: app uses 5 hardcoded demo headlines.
- Without `DEEPSEEK_API_KEY`: app uses the rule-based quiz generator.
- With both: full live news quiz powered by LLM-generated questions.

For production deploys (Railway, Render, Fly.io), set these as environment variables. The build command is `pnpm build` and the start command is `pnpm start`.

---

## Factuality Rules

- Event summaries must be accurate to the source article.
- Decoy answers must not make false factual claims about real people.
- Source links always point to the original article.
- Humor is reserved for prompts, decoys, UI labels, loading states, and score messages — never the factual summary.
