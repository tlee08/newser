import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type QuizQuestionOutput = {
  id: string;
  topic: string;
  prompt: string;
  correctAnswerIndex: number;
  options: string[];
  summary: string;
  articleRef?: string;
  imageUrl?: string;
  articleUrl?: string;
};

export type CollectedDataFile = {
  timestamp: string;
  source: { country: string | null; articleCount: number };
  rawArticles: {
    id: string;
    topic: string;
    title: string;
    description: string;
    url: string;
    source: string;
    imageUrl?: string;
    publishedAt?: string;
  }[];
  quizQuestions: (QuizQuestionOutput & { articleRef: string })[];
};

const COLLECTED_DIR = join(import.meta.dirname, "..", "resources", "collected_data");

export function loadEnvFile(filePath?: string): void {
  const path = filePath ?? join(import.meta.dirname, "..", ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

export function loadQuizFile(source?: string): Record<string, QuizQuestionOutput[]> | null {
  const filename = source ?? latestFile();
  if (!filename) return null;

  const filePath = join(COLLECTED_DIR, filename);
  if (!existsSync(filePath)) return null;

  const data = JSON.parse(readFileSync(filePath, "utf-8")) as CollectedDataFile;
  const result: Record<string, QuizQuestionOutput[]> = { all: data.quizQuestions };

  for (const q of data.quizQuestions) {
    const topic = q.topic;
    if (topic && topic !== "all") {
      if (!result[topic]) result[topic] = [];
      if (result[topic].length < 5) result[topic].push(q);
    }
  }

  return result;
}

function latestFile(): string | null {
  try {
    if (!existsSync(COLLECTED_DIR)) return null;
    const files = readdirSync(COLLECTED_DIR).filter((f) => f.endsWith(".json")).sort().reverse();
    return files[0] ?? null;
  } catch {
    return null;
  }
}

export async function saveCollectedData(
  rawArticles: any[],
  quizQuestions: QuizQuestionOutput[],
): Promise<string> {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = join(import.meta.dirname, "..", "resources", "collected_data");

  await mkdir(dir, { recursive: true });

  const data: CollectedDataFile = {
    timestamp: now.toISOString(),
    source: { country: null, articleCount: rawArticles.length },
    rawArticles: rawArticles.map((a: any, i: number) => ({
      id: a.id ?? `a-${i}`,
      topic: a.topic ?? "general",
      title: a.title ?? "Untitled",
      description: a.description ?? "",
      url: a.url ?? "#",
      source: typeof a.source === "object" ? (a.source?.name ?? "Unknown") : (String(a.source ?? "Unknown")),
      imageUrl: a.imageUrl ?? a.urlToImage,
      publishedAt: a.publishedAt,
    })),
    quizQuestions: quizQuestions.map((q) => ({ ...q, articleRef: q.articleRef ?? "" })) as CollectedDataFile["quizQuestions"],
  };

  const filePath = join(dir, `${stamp}.json`);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}
