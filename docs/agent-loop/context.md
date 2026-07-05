# Newser Context

## Product

Newser is a daily news gamification app. It turns live headlines into a five-question quiz with funny multiple-choice answers, then gives the player a score.

## Audience

Curious readers who want a quick, playful briefing. The app should feel like a loud morning show met a trivia night, but the source summaries and links must remain trustworthy.

## Technical Shape

- Package manager: `pnpm`
- App framework: React with Vite
- UI library: Mantine
- Icons: `lucide-react`
- News source: NewsAPI
- LLM: DeepSeek (quiz generation)
- Dev API routes: `/api/quizzes` (pre-generated), `/api/news`, `/api/generate-quiz`, `/api/save-collected-data`
- Shared pipeline: `lib/pipeline.ts` (NewsAPI fetch, DeepSeek quiz gen, data persistence)
- Data persistence: `resources/collected_data/` (timestamped JSON, gitignored)
- Promo image CLI: `pnpm generate-promo` (Playwright headless, 3 ratios × 3 styles)
- Promo output: `resources/promotion_images/` (gitignored)

## Current Boundaries

- The server pre-generates quizzes at startup (NewsAPI → DeepSeek for "All" topic, rule-based for category topics). Quizzes are cached in memory for the session.
- The client fetches all quizzes via `GET /api/quizzes` once on load.
- Per-topic quiz state (current question, score, progress) is managed by zustand.
- Topics: All, General, Tech, Politics, Business, Sports, Science — each independent 5-question quiz.
- If keys are missing or APIs fail, fallback articles and rule-based quiz generation keep the app usable.
- No database, auth, or user accounts are included yet.
- Streaks are persisted in localStorage.

## Factuality Rules

- Do not fabricate event summaries.
- Do not make decoy answers look like factual claims about real people unless they come from a source article.
- Source links must point to the article used for the question.
- Funny copy is allowed in prompts, UI labels, answer decoys, loading states, and score messages.
