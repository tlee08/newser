# Newser Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repo-ready scaffold for a humorous NewsAPI-powered daily quiz app and the Markdown agent loop that guides future work.

**Architecture:** A Vite React app uses Mantine for UI, a Vite dev middleware for `/api/news`, and small services for article fetching and quiz generation. Agent instructions live beside the app in `AGENTS.md`, `AGENTS.md`, and `docs/agent-loop/*`.

**Tech Stack:** pnpm, Vite, React, TypeScript, Mantine, lucide-react, NewsAPI.

## Global Constraints

- Package manager: `pnpm`
- UI: React and Mantine
- News source: NewsAPI
- Tone: fun, humorous, and factual
- Secrets: never place `NEWSAPI_KEY` in browser source code

---

### Task 1: Project Shell

**Files:**

- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**

- Produces: `pnpm dev`, `pnpm build`, `pnpm typecheck`, and `pnpm lint` scripts.

- [x] Create a Vite React TypeScript project shell.
- [x] Add Mantine, React, Vite, TypeScript, and lucide dependencies.
- [x] Add `.env.example` with `NEWSAPI_KEY=your_newsapi_key_here`.

### Task 2: NewsAPI Dev Middleware

**Files:**

- Create: `vite.config.ts`

**Interfaces:**

- Produces: `GET /api/news -> { articles: NewsApiArticle[] }`
- Consumes: `process.env.NEWSAPI_KEY`

- [x] Add Vite React plugin.
- [x] Add `/api/news` middleware that calls `https://newsapi.org/v2/top-headlines`.
- [x] Return an empty article list when `NEWSAPI_KEY` is missing.
- [x] Return structured errors when NewsAPI fails.

### Task 3: Data and Quiz Services

**Files:**

- Create: `src/types/news.ts`
- Create: `src/services/newsApi.ts`
- Create: `src/services/quizBuilder.ts`

**Interfaces:**

- Produces: `fetchDailyNews(): Promise<NewsArticle[]>`
- Produces: `buildDailyQuiz(articles: NewsArticle[]): QuizQuestion[]`

- [x] Normalize NewsAPI article shape.
- [x] Add fallback demo articles.
- [x] Generate five prompts, four options, a correct answer, summary, source, image, and link.

### Task 4: UI Components

**Files:**

- Create: `src/components/QuestionCard.tsx`
- Create: `src/components/ScoreScreen.tsx`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/styles.css`
- Create: `public/news-placeholder.svg`

**Interfaces:**

- Consumes: `QuizQuestion`
- Produces: playable five-question quiz flow

- [x] Wrap the app in `MantineProvider`.
- [x] Render loading, question, answered summary, and final score states.
- [x] Add source links after every answer.
- [x] Add humorous UI copy and score verdicts.
- [x] Add responsive tabloid-trivia visual styling.

### Task 5: Agent Loop Docs

**Files:**

- Create: `AGENTS.md`
- Create: `docs/agent-loop/context.md`
- Create: `docs/agent-loop/skills.md`
- Create: `docs/agent-loop/tasks.md`
- Create: `docs/superpowers/specs/2026-06-29-newser-scaffold-design.md`
- Create: `docs/superpowers/plans/2026-06-29-newser-scaffold.md`

**Interfaces:**

- Produces: clear onboarding and continuation loop for future agents.

- [x] Document the mission, commands, factuality rules, and skill loop.
- [x] Document current architecture and future backlog.
- [x] Save the design spec and implementation plan.

### Task 6: Verification

**Files:**

- Verify: all scaffold files

**Interfaces:**

- Consumes: installed pnpm dependencies
- Produces: successful typecheck and build

- [x] Run `pnpm install`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [ ] Start `pnpm dev` and inspect the app.
