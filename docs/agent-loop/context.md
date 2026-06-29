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

- The scaffold creates quiz questions in the browser from NewsAPI article metadata.
- The Vite dev server owns the NewsAPI key and returns normalized article data.
- If `NEWSAPI_KEY` is missing or NewsAPI returns too few items, fallback demo articles keep the app usable.
- No database, auth, user accounts, or persistent daily streaks are included yet.

## Factuality Rules

- Do not fabricate event summaries.
- Do not make decoy answers look like factual claims about real people unless they come from a source article.
- Source links must point to the article used for the question.
- Funny copy is allowed in prompts, UI labels, answer decoys, loading states, and score messages.
