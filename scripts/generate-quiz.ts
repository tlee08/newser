import { deepseek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  type CollectedDataFile,
  type QuizQuestionOutput,
  type RawArticle,
} from "../lib/types";

const DATA_DIR = join(import.meta.dirname, "..", "resources", "collected_data");

async function saveCollectedData(
  rawArticles: RawArticle[],
  quizQuestions: QuizQuestionOutput[],
): Promise<string> {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  await mkdir(DATA_DIR, { recursive: true });

  const data: CollectedDataFile = {
    timestamp: now.toISOString(),
    source: { country: null, articleCount: rawArticles.length },
    rawArticles: rawArticles.map((a) => ({
      id: a.id,
      topic: a.topic,
      title: a.title,
      description: a.description ?? "",
      url: a.url,
      source:
        typeof a.source === "object" && a.source !== null
          ? (a.source.name ?? "Unknown")
          : String(a.source ?? "Unknown"),
      imageUrl: a.urlToImage ?? (a as any).imageUrl,
      publishedAt: a.publishedAt,
      content: a.content,
    })),
    quizQuestions: quizQuestions.map((q) => ({
      ...q,
      articleRef: q.articleRef ?? "",
    })) as CollectedDataFile["quizQuestions"],
  };

  const filePath = join(DATA_DIR, `${stamp}.json`);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

const QUIZ_JSON = join(import.meta.dirname, "..", "public", "quizzes.json");

async function writeQuizJson(allQuestions: QuizQuestionOutput[]) {
  const grouped: Record<string, QuizQuestionOutput[]> = {};

  for (const q of allQuestions) {
    const topic = q.topic;
    if (topic) {
      if (!grouped[topic]) grouped[topic] = [];
      if (grouped[topic].length < 5) grouped[topic].push(q);
    }
  }

  await writeFile(QUIZ_JSON, JSON.stringify({ quizzes: grouped }), "utf-8");
  console.log(
    `Wrote quizzes.json (${Object.values(grouped).reduce((s, qs) => s + qs.length, 0)} questions)`,
  );
}

const USAGE = `Usage:
  pnpm generate-quiz --fresh
  pnpm generate-quiz --file <name>

Options:
  --fresh        Fetch news from NewsAPI, generate quizzes via DeepSeek,
                 save to resources/collected_data/.
  --file <name>  Re-read articles from an existing collected_data JSON file,
                 regenerate quiz questions via DeepSeek (different each time),
                 save as a new collected_data file.`;

const TOPICS = [
  { topic: "general", category: "general" },
  { topic: "tech", category: "technology" },
  { topic: "politics", q: "politics" },
  { topic: "business", category: "business" },
  { topic: "sports", category: "sports" },
  { topic: "science", category: "science" },
];

// ── NewsAPI ──

const COUNTRIES = ["us", "gb", "au"];

async function fetchNews(
  apiKey: string,
  topic: string,
  category?: string,
  q?: string,
): Promise<RawArticle[]> {
  const seen = new Set<string>();
  const results: RawArticle[] = [];

  for (const country of COUNTRIES) {
    const url = new URL("https://newsapi.org/v2/top-headlines");
    url.searchParams.set("language", "en");
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("country", country);
    if (category) url.searchParams.set("category", category);
    if (q) url.searchParams.set("q", q);

    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const payload = (await response.json()) as { articles?: RawArticle[] };
      for (const a of payload.articles ?? []) {
        if (a.url && !seen.has(a.url)) {
          seen.add(a.url);
          results.push(a);
        }
      }
    } catch {
      // continue to next country
    }
  }

  return results.map((a, i) => ({
    ...a,
    id: `${topic}-a${i}`,
    topic,
  }));
}

type ArticleInput = {
  title: string;
  description: string;
  url: string;
  source: string;
  imageUrl?: string;
  content?: string;
};

function toInput(
  a: RawArticle | CollectedDataFile["rawArticles"][number],
): ArticleInput {
  return {
    title: a.title,
    description: a.description ?? "",
    url: a.url,
    source:
      typeof a.source === "object"
        ? (a.source?.name ?? "Unknown")
        : (a.source ?? "Unknown"),
    imageUrl: (a as any).urlToImage ?? (a as any).imageUrl,
    content: (a as any).content,
  };
}

// ── DeepSeek ──

const QuizAnswerSchema = z.object({
  text: z.string(),
  type: z.enum([
    "correct",
    "plausible_whimsical",
    "absurd",
    "adapted_headline",
  ]),
});

const QuizQuestionSchema = z
  .object({
    articleIndex: z.number().int().min(0).max(4),
    prompt: z.string().min(1),
    summary: z.string().min(1),
    answers: z.array(QuizAnswerSchema).length(4),
  })
  .superRefine((question, ctx) => {
    const correctAnswers = question.answers.filter(
      (answer) => answer.type === "correct",
    );

    if (correctAnswers.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one answer must have type=correct",
        path: ["answers"],
      });
    }

    const types = question.answers.map((answer) => answer.type);
    const expectedTypes = [
      "correct",
      "plausible_whimsical",
      "absurd",
      "adapted_headline",
    ];

    for (const type of expectedTypes) {
      if (types.filter((value) => value === type).length !== 1) {
        ctx.addIssue({
          code: "custom",
          message: `Exactly one answer must have type=${type}`,
          path: ["answers"],
        });
      }
    }
  });

const NewsQuizSchema = z.object({
  questions: z.array(QuizQuestionSchema).length(5),
});

const SYSTEM_PROMPT = `You are the witty news quiz generator for "Newser", a playful daily news briefing app.

Your task is to turn exactly 5 supplied news articles into a funny, entertaining multiple-choice quiz.

## Core requirements

Generate exactly 5 questions.

Each question must correspond to exactly one article:
- Question 1 must be based on article 0.
- Question 2 must be based on article 1.
- Question 3 must be based on article 2.
- Question 4 must be based on article 3.
- Question 5 must be based on article 4.

Set "articleIndex" to the zero-based index of the article used for that question.

Each question must contain:
- A funny, energetic question prompt.
- A one-sentence factual summary.
- Exactly 4 answer options.
- Exactly 1 correct answer (type "correct").
- Exactly 3 incorrect answers.

## Writing style

Write like a loud, witty morning-show host:
- Funny, energetic, playful, and attention-grabbing.
- Use humor in the framing of the question and answers.
- Keep the underlying news facts accurate.
- Make the question clear enough that there is only one defensible correct answer.
- Vary the comedic style and question structure across the 5 questions.

Do not make every question start with "What happened?" or use the same joke format repeatedly.

Across all 5 questions, vary the comedic approach — use different joke structures (wordplay, deadpan, hyperbole, understatement, absurdist contrast), different framing devices, and different types of absurdity.

## Factual grounding

The correct answer must be directly supported by the corresponding article.

The summary must contain only facts supported by the corresponding article and must be exactly one sentence.

Do not invent:
- People
- Events
- Quotes
- Locations
- Numbers
- Dates
- Causes
- Outcomes
- Details

Do not use general world knowledge to fill gaps in an article.

If an article contains multiple facts, choose one clearly supported and quiz-worthy fact.

Never make an unsupported or fabricated statement the correct answer.

## Answer options

Each question must have exactly these four answer types:

### 1. correct
The only factually correct answer, directly supported by the corresponding article.

### 2. plausible_whimsical
An incorrect answer that sounds reasonably possible but includes a playful or unexpected twist.

It must not accidentally be supported by the article.

### 3. absurd
A clearly ridiculous, far-fetched, surreal, or exaggerated answer.

Make it funny and memorable.

### 4. adapted_headline
An incorrect answer loosely inspired by the headline, subject, person, object, or event from a DIFFERENT supplied article.

Recontextualize that idea so it sounds oddly relevant to the current question.

Do not copy another article's headline verbatim.

The adapted-headline answer must still be incorrect for the current article.

## Gamification

The plausible_whimsical answer should sound almost right — a player who half-remembers the news should second-guess themselves. The absurd answer should be audibly funny when read aloud. The question should make the player think through the options, not just eliminate obvious fakes at a glance.

Good quiz questions test understanding, not trivia recall. The correct answer should reward someone who actually followed the story, not someone who can spot the one answer with an obvious joke.

## Important consistency rules

For every question:
- Exactly one answer must have type: "correct".
- Exactly three answers must have any of the other types.
- All four answer texts must be distinct.
- The answer types must contain exactly one of each:
  - correct
  - plausible_whimsical
  - absurd
  - adapted_headline

## Output constraints

Return only the structured quiz object matching the provided schema.

Do not include:
- Explanations
- Commentary
- Markdown
- Additional fields`;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function generateQuiz(
  articles: ArticleInput[],
): Promise<QuizQuestionOutput[]> {
  const { output } = await generateText({
    model: deepseek("deepseek-chat"),
    output: Output.object({ schema: NewsQuizSchema }),
    instructions: SYSTEM_PROMPT,
    prompt: `Here are the 5 news articles.

${articles
  .map(
    (article, index) => `
ARTICLE ${index}

Title:
${article.title}

Description:
${article.description}
${article.content ? `\nContent:\n${article.content}` : ""}
`,
  )
  .join("\n")}
`,
    temperature: 0.9,
    maxOutputTokens: 2000,
  });

  return output.questions.map((q, i) => ({
    id: "",
    topic: "",
    prompt: q.prompt,
    answers: shuffle(q.answers),
    summary: q.summary,
    source: articles[i]?.source,
    imageUrl: articles[i]?.imageUrl,
    articleUrl: articles[i]?.url,
  }));
}

// ── fresh ──

async function runFresh() {
  const newsKey = process.env.NEWSAPI_KEY;
  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (!newsKey || !dsKey) {
    console.error("Error: NEWSAPI_KEY and DEEPSEEK_API_KEY must be set");
    process.exit(1);
  }

  const allArticles: RawArticle[] = [];
  const allQuestions: QuizQuestionOutput[] = [];
  const start = Date.now();

  console.log(`Fetching news for ${TOPICS.length} topics...\n`);

  const fetches = TOPICS.map(async ({ topic, category, q }) => {
    try {
      const articles = await fetchNews(newsKey, topic, category, q);
      console.log(`  ${topic}: ${articles.length} articles`);
      return articles;
    } catch {
      console.error(`  ${topic}: fetch failed`);
      return [] as RawArticle[];
    }
  });

  let qTotal = 0;

  for (const articles of await Promise.all(fetches)) {
    if (articles.length === 0) continue;
    const topic = articles[0].topic;
    const inputs = articles.map(toInput);
    allArticles.push(...articles);

    const batchCount = Math.ceil(inputs.length / 5);
    console.log(
      `\n  ${topic}: ${inputs.length} articles → ${batchCount} batches`,
    );

    for (let b = 0, qNum = 0; b < batchCount; b++) {
      const batch = inputs.slice(b * 5, b * 5 + 5);
      const dsQuestions = await generateQuiz(batch);

      for (const q of dsQuestions) {
        allQuestions.push({
          ...q,
          id: `${topic}-${qNum}`,
          topic,
          source: batch[qNum % 5]?.source,
          imageUrl: batch[qNum % 5]?.imageUrl ?? q.imageUrl,
          articleUrl: batch[qNum % 5]?.url ?? q.articleUrl,
          articleRef: articles[qNum]?.id ?? `${topic}-a${qNum}`,
        });
        qNum++;
        qTotal++;
      }

      console.log(`    batch ${b + 1}/${batchCount} → 5 questions`);
      if (b < batchCount - 1) await new Promise((r) => setTimeout(r, 300));
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const path = await saveCollectedData(allArticles, allQuestions);
  await writeQuizJson(allQuestions);
  console.log(
    `\nSaved ${qTotal} questions, ${allArticles.length} articles in ${elapsed}s → ${path}`,
  );
}

// ── file ──

async function runFile(filename: string) {
  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (!dsKey) {
    console.error("Error: DEEPSEEK_API_KEY must be set");
    process.exit(1);
  }

  const filePath = join(DATA_DIR, filename);
  if (!existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(filePath, "utf-8")) as CollectedDataFile;

  // Group articles by their topic field
  const byTopic: Record<string, any[]> = {};
  for (const a of data.rawArticles) {
    const topic = a.topic || "general";
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(a);
  }

  const topics = Object.keys(byTopic);
  const start = Date.now();
  console.log(
    `\nRegenerating from "${filename}": ${data.rawArticles.length} articles across ${topics.length} topics: ${topics.join(", ")}\n`,
  );

  const questions: QuizQuestionOutput[] = [];

  for (const topic of topics) {
    const articles = byTopic[topic];
    const inputs = articles.map(toInput);
    const batchCount = Math.ceil(inputs.length / 5);

    if (batchCount === 0) {
      console.log(`  ${topic}: only ${inputs.length} articles, skipping`);
      continue;
    }

    console.log(
      `  ${topic}: ${inputs.length} articles → ${batchCount} batches`,
    );
    let qNum = 0;

    for (let b = 0; b < batchCount; b++) {
      const batch = inputs.slice(b * 5, b * 5 + 5);
      const dsQuestions = await generateQuiz(batch);

      for (const q of dsQuestions) {
        questions.push({
          ...q,
          id: `${topic}-${qNum}`,
          topic,
          source: inputs[qNum]?.source ?? q.source,
          imageUrl: inputs[qNum]?.imageUrl ?? q.imageUrl,
          articleUrl: articles[qNum]?.url ?? q.articleUrl,
          articleRef: articles[qNum]?.id ?? `${topic}-a${qNum}`,
        });
        qNum++;
      }

      console.log(`    batch ${b + 1}/${batchCount} → 5 questions`);
      if (b < batchCount - 1) await new Promise((r) => setTimeout(r, 300));
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const path = await saveCollectedData(data.rawArticles, questions);
  await writeQuizJson(questions);
  console.log(`\nSaved ${questions.length} questions in ${elapsed}s → ${path}`);
}

// ── main ──

function parseArgs(
  argv: string[],
): { mode: "fresh" } | { mode: "file"; file: string } | null {
  let fresh = false;
  let file: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--fresh") fresh = true;
    else if (argv[i] === "--file" && i + 1 < argv.length) file = argv[++i];
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      return null;
    }
  }
  if (fresh) return { mode: "fresh" };
  if (file) return { mode: "file", file };
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args) {
    console.log(USAGE);
    process.exit(1);
  }
  if (args.mode === "fresh") await runFresh();
  else await runFile(args.file);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
