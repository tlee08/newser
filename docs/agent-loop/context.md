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
- Dev API route: Vite middleware at `/api/news`

## Current Boundaries

- The app fetches live news from NewsAPI and generates quizzes via DeepSeek LLM (server-side).
- The Vite dev server owns both API keys and returns quiz data to the browser.
- If keys are missing or APIs fail, rule-based quiz generation with fallback demo articles keeps the app usable.
- Country filtering is limited to US/Worldwide due to NewsAPI free-tier restrictions.
- No database, auth, or user accounts are included yet.
- Streaks are persisted in localStorage.

## Factuality Rules

- Do not fabricate event summaries.
- Do not make decoy answers look like factual claims about real people unless they come from a source article.
- Source links must point to the article used for the question.
- Funny copy is allowed in prompts, UI labels, answer decoys, loading states, and score messages.
