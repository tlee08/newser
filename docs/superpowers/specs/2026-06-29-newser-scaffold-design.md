# Newser Scaffold Design

## Goal

Create a repo-ready scaffold for a humorous daily news quiz app and the agent loop needed to continue building it.

## Architecture

The project is a Vite React app. Mantine provides UI primitives and theming. A Vite development middleware at `/api/news` calls NewsAPI with `NEWSAPI_KEY`, keeping the key out of browser code during local development.

The quiz layer is split into focused files:

- `src/services/newsApi.ts` fetches normalized articles from `/api/news`.
- `src/services/quizBuilder.ts` turns articles into five multiple-choice questions.
- `src/components/QuestionCard.tsx` renders the active question, answers, summary, and source link.
- `src/components/ScoreScreen.tsx` renders the final score.
- `src/App.tsx` coordinates loading, answer state, scoring, and reset behavior.

## Visual Direction

The aesthetic is a bright, punchy "tabloid trivia arcade": yellow field, black ink borders, pink and mint accents, heavy display type, and chunky answer cards. The design should feel funny and high-energy while keeping controls readable and predictable.

## Data Flow

1. App starts and requests `/api/news`.
2. Vite middleware calls NewsAPI top headlines when `NEWSAPI_KEY` is set.
3. The app normalizes articles and passes them to `buildDailyQuiz`.
4. The user answers five questions.
5. Each answered question shows a factual summary and source link.
6. The score screen shows final score and a playful verdict.

## Error Handling

- Missing `NEWSAPI_KEY`: return an empty article list and use demo articles.
- NewsAPI failure: show a small alert and use demo articles.
- Missing article image: render a branded fallback panel.
- Too few articles: use fallback articles.

## Constraints

- Use `pnpm`.
- Use React.
- Use Mantine.
- Use NewsAPI.
- Keep the app fun.
- Do not invent factual summaries.
