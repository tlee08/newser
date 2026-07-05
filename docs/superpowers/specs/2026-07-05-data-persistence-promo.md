# Data Persistence & Social Media Promo Design — Updated

## Goal

Capture the full NewsAPI→DeepSeek pipeline output as timestamped JSON, then generate styled PNG quiz-card images for social media promotion. Output lives in `resources/` (gitignored), accessed via a `pnpm generate-promo` CLI.

**2026-07-05 Revision:** Refactor quiz generation to happen once at server startup. Replace filter logic with per-topic independent quizzes managed via zustand on the client.

---

## Architecture

### Server-Side Quiz Generation (startup, one-shot)

On server startup (both `vite.config.ts` dev middleware init and `server.ts` listen):

1. Fetch articles **per category** using NewsAPI's native `category` parameter — guaranteed 20 articles per fetch:
   - `all`: no category filter
   - `general`: `category=general`
   - `tech`: `category=technology`
   - `business`: `category=business`
   - `sports`: `category=sports`
   - `science`: `category=science`
   - `politics`: `q=politics` (keyword search, no native category)

2. All 7 fetches run in parallel via `Promise.all()`

3. Each category gets its own **LLM quiz** via DeepSeek (parallel calls with 500ms stagger to avoid rate limiting)

4. All articles (deduplicated by URL) + all quiz questions saved to `resources/collected_data/<timestamp>.json`

5. Quizzes cached in memory for the session, exposed via `GET /api/quizzes`

### Client Architecture

```
GET /api/quizzes → { quizzes: Record<string, QuizQuestion[]> }

┌─────────────────────────────────────────────┐
│                   Zustand Store              │
│  topics: {                                   │
│    all:    { answers, current: 2, score: 1 } │
│    tech:   { answers, current: 0, score: 0 } │
│    general:{ answers, current: 4, score: 3 } │
│    ...                                       │
│  }                                           │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│                   App.tsx                     │
│                                              │
│  [All 2/5] [Tech 0/5] [General 3/5] ...     │
│                                              │
│  ┌──────────────────────────────────┐        │
│  │         QuestionCard             │        │
│  │  (uses active topic's state)     │        │
│  └──────────────────────────────────┘        │
│                                              │
│  ┌──────────────────────────────────┐        │
│  │         ScoreScreen              │        │
│  │  (per-topic score + verdict)     │        │
│  └──────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

### Data Flow

1. Server starts → fetches NewsAPI once → generates quizzes → caches → saves data
2. Client loads → `GET /api/quizzes` → receives all topic quizzes
3. User switches topics → zustand restores that topic's `currentIndex` and `score`
4. User answers question → zustand updates that topic's state
5. All 5 questions answered for a topic → score screen for that topic
6. Switching away and back preserves progress

### Removed

- "Refresh headlines" button — quizzes are generated once at server start
- Country filter (`us`/`worldwide`) — irrelevant to this feature
- Category filter logic — replaced by per-topic quiz selection
- `useState` / `useMemo` / `useEffect` state machine — replaced by zustand

---

## Visual Variants (Promo Images)

### Aspect Ratios (2)

| Name | Dimensions | Target Platform |
|------|-----------|-----------------|
| `square` | 1080×1080 | Instagram feed, Facebook |
| `portrait` | 1080×1920 | Instagram Stories, TikTok |

### Visual Styles (3)

| Name | Aesthetic |
|------|-----------|
| `classic` | Tabloid-trivia: yellow field, black borders, pink accents, chunky card with shadow, Newspaper icon |
| `hero` | Larger variant: "Newser" + "Daily Briefing Brawl" subtitle, bigger icon/text, dramatic card |
| `compact` | Tighter layout: smaller card/typography, condensed, same yellow palette |

**Total: 2 ratios × 3 styles = 6 PNGs per question**

### Output Structure

```
resources/promotion_images/<run_id>/<question_index>/<style-ratio>.png
```

---

## CLI Interface

```bash
pnpm generate-promo --fresh [--country us]
pnpm generate-promo --file <name> --index <n>
```

Same as before. No changes to the CLI.

---

## Dependencies to Add

- `zustand` — lightweight client state management

---

## Constraints

- Server quiz generation must NOT block request handling during startup
- If NewsAPI or DeepSeek fail at startup, serve rule-generated quizzes from fallback articles
- zustand store is per-session (no persistence — same as current behavior)
- Topic tabs must show current score (x/5) for each topic
- Switching topics must preserve the previous topic's question index and score

## Success Criteria

1. Server generates quizzes once at startup, caches them
2. `GET /api/quizzes` returns all topic quizzes
3. Client fetches once on load, stores in zustand
4. Topic tabs show per-topic progress: `All 2/5`, `Tech 0/5`, etc.
5. Each topic has its own independent quiz (questions, score, progress)
6. No refresh button, no country filter
7. `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm lint` pass
8. Quiz data saved to `resources/collected_data/` on server startup
