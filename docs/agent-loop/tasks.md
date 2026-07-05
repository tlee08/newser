# Agent Loop Backlog

## Done

- [x] Add unit tests for `buildDailyQuiz`.
- [x] Add a production API deployment option so NewsAPI keys are never exposed outside Vite dev.
- [x] Improve question generation with category-aware prompt templates.
- [x] Add daily seeding so the same five articles produce stable option order for a day.
- [x] Add accessible keyboard focus polish for answer cards.
- [x] Add streaks and share cards.
- [x] Add category selection.
- [x] Add regional editions.
- [x] Add image-based question templates when NewsAPI articles include usable images.
- [x] Add OpenAI-generated question writing only if the app gains a server-side generation layer.
- [x] **Data persistence & promo images** — Full pipeline snapshot to `resources/collected_data/`, CLIg `pnpm generate-promo`, 6 PNG variants/question.
- [x] **Per-topic quizzes** — Server pre-generates quizzes at startup, zustand state per topic, independent 5-question quizzes, score tracking per topic.
