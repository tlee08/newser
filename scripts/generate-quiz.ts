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

  grouped.all = [];
  for (const topic of Object.keys(grouped).filter((k) => k !== "all")) {
    if (grouped[topic].length > 0 && grouped.all.length < 5) {
      grouped.all.push({
        ...grouped[topic][0],
        id: `all-${grouped.all.length}`,
      });
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

async function fetchNews(
  apiKey: string,
  topic: string,
  category?: string,
  q?: string,
): Promise<RawArticle[]> {
  const url = new URL("https://newsapi.org/v2/top-headlines");
  url.searchParams.set("language", "en");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("apiKey", apiKey);
  if (category) url.searchParams.set("category", category);
  if (q) url.searchParams.set("q", q);

  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json()) as { message?: string };
    throw new Error(payload.message ?? "NewsAPI request failed");
  }
  const payload = (await response.json()) as { articles?: RawArticle[] };
  return (payload.articles ?? []).map((a, i) => ({
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
  };
}

// ── DeepSeek ──

const SYSTEM_PROMPT = `You are a witty news quiz generator for "Newser" — a playful daily briefing app. Your job: turn 5 news articles into a funny multiple-choice quiz.

RULES:
- Generate exactly 5 questions, one per article.
- Each question must have: a prompt, 4 answer options, the correct answer, and a short factual summary (1 sentence).
- The prompt should be funny and energetic — like a loud morning show host.
- The correct answer must be factually accurate based on the article. Do NOT invent false events.
- The summary must stick to the article facts. Do not fabricate.
- For the 3 wrong answers: one should be far-fetched and absurd, one should be plausible-but-whimsical, and one should be loosely adapted from another article's headline to feel oddly relevant.`;

const questionSchema = z.object({
  prompt: z.string(),
  correctAnswer: z.string(),
  decoy1: z.string(),
  decoy2: z.string(),
  decoy3: z.string(),
  summary: z.string(),
});

const quizSchema = z.object({
  questions: z.array(questionSchema).length(5),
});

function shuffle(options: string[]): { options: string[]; idx: number } {
  const arr = [...options];
  const correct = arr[0];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { options: arr, idx: arr.indexOf(correct) };
}

async function generateQuiz(
  articles: ArticleInput[],
): Promise<QuizQuestionOutput[]> {
  const articleText = articles
    .map(
      (a, i) =>
        `Article ${i + 1}:\nTitle: ${a.title}\nSource: ${a.source}\nDescription: ${a.description}`,
    )
    .join("\n\n");
  const otherHeadlines = articles.map((a) => `- ${a.title}`).join("\n");

  const { output } = await generateText({
    model: deepseek("deepseek-chat"),
    output: Output.object({ schema: quizSchema }),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Other headlines for decoy inspiration:\n${otherHeadlines}\n\nGenerate a 5-question quiz from these articles:\n\n${articleText}`,
      },
    ],
    temperature: 0.9,
    maxOutputTokens: 2000,
  });

  return output.questions.map((q, i) => {
    const allOptions = [q.correctAnswer, q.decoy1, q.decoy2, q.decoy3];
    const { options, idx } = shuffle(allOptions);

    return {
      id: "",
      topic: "",
      prompt: q.prompt,
      correctAnswerIndex: idx,
      options,
      summary: q.summary,
      imageUrl: articles[i]?.imageUrl,
      articleUrl: articles[i]?.url,
    };
  });
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

    const batchCount = Math.floor(inputs.length / 5);
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
    const batchCount = Math.floor(inputs.length / 5);

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
