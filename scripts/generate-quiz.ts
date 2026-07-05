import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile, saveCollectedData, type CollectedDataFile, type QuizQuestionOutput } from "../lib/pipeline";

const USAGE = `Usage:
  pnpm generate-quiz --fresh
  pnpm generate-quiz --file <name>

Options:
  --fresh        Fetch news from NewsAPI, generate quizzes via DeepSeek,
                 save to resources/collected_data/.
  --file <name>  Re-read articles from an existing collected_data JSON file,
                 regenerate quiz questions via DeepSeek (different each time),
                 save as a new collected_data file.`;

type Args = { mode: "fresh" } | { mode: "file"; file: string };

const TOPICS: Record<string, { category?: string; q?: string }> = {
  all: {},
  general: { category: "general" },
  tech: { category: "technology" },
  politics: { q: "politics" },
  business: { category: "business" },
  sports: { category: "sports" },
  science: { category: "science" },
};

// ── args ──

function parseArgs(argv: string[]): Args | null {
  let fresh = false;
  let file: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fresh") fresh = true;
    else if (arg === "--file" && i + 1 < argv.length) file = argv[++i];
    else { console.error(`Unknown argument: ${arg}`); return null; }
  }

  if (fresh) return { mode: "fresh" };
  if (file) return { mode: "file", file };
  console.error("Error: specify --fresh or --file");
  return null;
}

// ── NewsAPI ──

type RawArticle = { title?: string; description?: string; url?: string; urlToImage?: string; source?: { name?: string }; publishedAt?: string };

async function fetchNews(apiKey: string, category?: string, q?: string): Promise<RawArticle[]> {
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
  return payload.articles ?? [];
}

function normalize(articles: RawArticle[]) {
  const inputs: { title: string; description: string; url: string; source: string; imageUrl?: string }[] = [];
  const indices: number[] = [];

  for (let i = 0; i < articles.length && inputs.length < 5; i++) {
    const a = articles[i];
    if (a.title && a.url) {
      inputs.push({ title: a.title, description: a.description ?? "", url: a.url, source: a.source?.name ?? "Unknown", imageUrl: a.urlToImage });
      indices.push(i);
    }
  }
  return { inputs, indices };
}

// ── DeepSeek ──

const SYSTEM_PROMPT = `You are a witty news quiz generator for "Newser" — a playful daily briefing app. Your job: turn 5 news articles into a funny multiple-choice quiz.

RULES:
- Generate exactly 5 questions, one per article.
- Each question must have: a prompt, 4 answer options, the correct answer, and a short factual summary (1 sentence).
- The prompt should be funny and energetic — like a loud morning show host.
- The correct answer must be factually accurate based on the article. Do NOT invent false events. The correct answer should be a compact version of the headline without trailing source info.
- The summary must stick to the article facts. Do not fabricate.

For each question, provide exactly 4 answer options (the correct answer MUST be one of them):
1. The correct answer.
2. One humorously far-fetched decoy — absurd, playful, obviously wrong.
3. One plausible-but-whimsical decoy — sounds almost believable but has a playful twist.
4. One decoy loosely adapted from another article's headline — take a different article's topic and rework it to feel oddly relevant to this question. You will receive the other headlines.

Return ONLY a JSON array. No markdown, no explanations.

Format:
[{
  "prompt": "Funny question text",
  "correctAnswer": "The accurate fact",
  "options": ["Correct answer text", "Far-fetched decoy", "Plausible decoy", "Adapted-headline decoy"],
  "summary": "One sentence factual summary"
}]`;

async function generateQuiz(
  articles: { title: string; description: string; url: string; source: string; imageUrl?: string }[],
  apiKey: string,
): Promise<QuizQuestionOutput[]> {
  if (!apiKey || articles.length < 5) return [];

  const articleText = articles.map((a, i) => `Article ${i + 1}:\nTitle: ${a.title}\nSource: ${a.source}\nDescription: ${a.description}`).join("\n\n");
  const otherHeadlines = articles.map((a) => `- ${a.title}`).join("\n");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Other headlines for decoy inspiration:\n${otherHeadlines}\n\nGenerate a 5-question quiz from these articles:\n\n${articleText}` },
      ],
      max_tokens: 2000,
      temperature: 0.9,
    }),
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = payload?.choices?.[0]?.message?.content ?? "";

  try {
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    const parsed = JSON.parse(cleaned) as any[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.slice(0, 5).map((q: any, i: number) => {
      const rawOptions: string[] = Array.isArray(q.options) && q.options.length === 4 ? q.options : [];
      const correctAnswer = q.correctAnswer ?? articles[i]?.title ?? "";
      const options = rawOptions.includes(correctAnswer) ? rawOptions : [correctAnswer, ...rawOptions.slice(0, 3)];
      // Fisher-Yates shuffle
      const arr = [...options];
      const correct = arr[0];
      for (let j = arr.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [arr[j], arr[k]] = [arr[k], arr[j]];
      }
      return {
        id: `q-${i}`,
        prompt: q.prompt ?? "What just happened?",
        correctAnswerIndex: arr.indexOf(correct),
        options: arr,
        summary: q.summary ?? articles[i]?.description ?? "",
        imageUrl: articles[i]?.imageUrl,
        articleUrl: articles[i]?.url,
      };
    });
  } catch {
    return [];
  }
}

function fallbackQuiz(inputs: { title: string; description: string; url: string; source: string; imageUrl?: string }[]): QuizQuestionOutput[] {
  return inputs.map((a, i) => ({
    id: `q-${i}`,
    prompt: "What's the headline about?",
    correctAnswerIndex: 0,
    options: [a.title, "Something else entirely", "A completely different event", "Not this one"],
    summary: a.description,
    imageUrl: a.imageUrl,
    articleUrl: a.url,
  }));
}

// ── generate + save ──

const DATA_DIR = join(import.meta.dirname, "..", "resources", "collected_data");

async function runFresh() {
  const newsKey = process.env.NEWSAPI_KEY;
  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (!newsKey || !dsKey) {
    console.error("Error: NEWSAPI_KEY and DEEPSEEK_API_KEY must be set");
    process.exit(1);
  }

  const topics = Object.keys(TOPICS);
  const results: Record<string, { articles: RawArticle[]; questions: QuizQuestionOutput[] }> = {};

  const fetches = topics.map(async (topic) => {
    const cfg = TOPICS[topic];
    try {
      const articles = await fetchNews(newsKey, cfg.category, cfg.q);
      return { topic, articles };
    } catch {
      console.error(`  Failed to fetch articles for "${topic}"`);
      return { topic, articles: [] as RawArticle[] };
    }
  });

  const fetched = await Promise.all(fetches);

  for (const { topic, articles } of fetched) {
    if (articles.length < 5) {
      console.error(`  Not enough articles for "${topic}" (got ${articles.length})`);
      continue;
    }

    const { inputs } = normalize(articles);
    console.log(`  Generating "${topic}" quiz...`);

    const dsQuestions = await generateQuiz(inputs, dsKey);
    const questions = (dsQuestions && dsQuestions.length === 5) ? dsQuestions : fallbackQuiz(inputs);

    results[topic] = { articles, questions: questions.slice(0, 5) };
    if (dsKey) await new Promise((r) => setTimeout(r, 500));
  }

  const savedArticles: any[] = [];
  const savedQuestions: QuizQuestionOutput[] = [];

  for (const topic of topics) {
    const r = results[topic];
    if (!r) continue;
    for (const [i, a] of r.articles.entries()) {
      savedArticles.push({ ...a, id: `${topic}-a${i}` });
    }
    for (const [i, q] of r.questions.entries()) {
      savedQuestions.push({ ...q, id: `${topic}-${i}`, articleRef: `${topic}-a${i}`, imageUrl: r.articles[i]?.urlToImage ?? q.imageUrl, articleUrl: r.articles[i]?.url ?? q.articleUrl });
    }
  }

  const path = await saveCollectedData(savedArticles, savedQuestions);
  console.log(`Saved to ${path}`);
}

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

  const topicArticles: Record<string, any[]> = {};
  for (const a of data.rawArticles) {
    const match = (a.id ?? "").match(/^([a-z]+)-a\d+$/);
    if (match && TOPICS[match[1]]) {
      if (!topicArticles[match[1]]) topicArticles[match[1]] = [];
      topicArticles[match[1]].push(a);
    }
  }

  const activeTopics = Object.keys(topicArticles);
  if (activeTopics.length === 0) {
    console.error("Error: no topic-prefixed articles found in file");
    process.exit(1);
  }

  const savedQuestions: QuizQuestionOutput[] = [];

  for (const topic of activeTopics) {
    const articles = topicArticles[topic];
    if (articles.length < 5) {
      console.error(`  Not enough articles for "${topic}" (got ${articles.length}), skipping`);
      continue;
    }

    const { inputs } = normalize(articles);
    console.log(`  Regenerating "${topic}" quiz from ${inputs.length} articles...`);

    const dsQuestions = await generateQuiz(inputs, dsKey);
    if (!dsQuestions || dsQuestions.length < 5) {
      console.error(`  DeepSeek returned insufficient questions for "${topic}", skipping`);
      continue;
    }

    const tagged = dsQuestions.slice(0, 5).map((q, i) => ({
      ...q,
      id: `${topic}-${i}`,
      imageUrl: inputs[i]?.imageUrl,
      articleUrl: inputs[i]?.url,
      articleRef: `${topic}-a${parseInt(q.id.split("-")[1] ?? "0", 10)}`,
    }));

    savedQuestions.push(...tagged);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Build "all" topic from other topics
  const allQuestions: QuizQuestionOutput[] = [];
  for (const topic of activeTopics) {
    const qs = savedQuestions.filter((q) => q.id.startsWith(`${topic}-`));
    if (qs.length > 0 && allQuestions.length < 5) {
      allQuestions.push({ ...qs[0], id: `all-${allQuestions.length}` });
    }
  }

  const path = await saveCollectedData(data.rawArticles, [...savedQuestions, ...allQuestions]);
  console.log(`Saved to ${path}`);
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv);
  if (!args) { console.log(USAGE); process.exit(1); }

  if (args.mode === "fresh") await runFresh();
  else await runFile(args.file);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
