# Newser Agent Loop

This repo contains both the webapp and the agent loop for building it.

## Mission

Build and improve a funny daily news quiz app:

- Pull current news from NewsAPI.
- Generate five daily multiple-choice questions.
- Make the questions humorous without distorting the facts.
- After each answer, show the correct answer, a short event summary, and a source link.
- After five questions, show the user's score.
- Use `pnpm`, React, Mantine, and NewsAPI.

## Required Loop

Follow this loop for every meaningful change:

1. Read `docs/agent-loop/context.md`.
2. Read `docs/agent-loop/skills.md`.
3. Read the current plan in `docs/superpowers/plans/2026-06-29-newser-scaffold.md`.
4. Make the smallest coherent change.
5. Run `pnpm typecheck` and `pnpm build`.
6. Update docs if the app behavior or setup changes.

## Product Voice

The app can be witty, absurd, and energetic. It must not invent false claims about real people or events. Humor belongs in prompts, decoys, UI copy, and score messages. The factual summary should remain accurate to the source article.

## NewsAPI Setup

Create a local `.env` file:

```bash
NEWSAPI_KEY=your_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
```

During Vite development, `/api/news` and `/api/generate-quiz` are served by `vite.config.ts` calling NewsAPI and DeepSeek server-side. If no keys are present, the app uses demo headlines and rule-based quiz generation.

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm test
pnpm start

# Quiz generation (once-off; persists to collected_data)
pnpm generate-quiz --fresh

# Promo image generation
pnpm generate-promo --file <name>  # Render promo images from existing collected data
```

`pnpm dev` starts the Vite dev server. By default it loads the latest quiz data from `resources/collected_data/`, falling back to fresh generation if none exists. Override with `QUIZ_SOURCE`:

```bash
QUIZ_SOURCE=fresh pnpm dev              # Force fresh generation
QUIZ_SOURCE=2026-07-05.json pnpm dev    # Use specific collected data file
```

`pnpm generate-quiz --fresh` fetches news, generates quizzes via DeepSeek, categorizes them, and saves to `resources/collected_data/`. Use this to pre-generate quiz data before running the dev server.
