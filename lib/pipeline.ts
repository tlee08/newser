import { existsSync, readFileSync, readdirSync } from "node:fs";
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

export function loadQuizFile(source?: string): Record<string, QuizQuestionOutput[]> | null {
  const filename = source ?? latestFile();
  if (!filename) return null;

  const filePath = join(COLLECTED_DIR, filename);
  if (!existsSync(filePath)) return null;

  const data = JSON.parse(readFileSync(filePath, "utf-8")) as CollectedDataFile;
  const result: Record<string, QuizQuestionOutput[]> = {};

  for (const q of data.quizQuestions) {
    const topic = q.topic;
    if (topic) {
      if (!result[topic]) result[topic] = [];
      if (result[topic].length < 5) result[topic].push(q);
    }
  }

  result.all = [];
  const topicKeys = Object.keys(result).filter((k) => k !== "all");
  for (const topic of topicKeys) {
    if (result[topic].length > 0 && result.all.length < 5) {
      result.all.push({ ...result[topic][0], id: `all-${result.all.length}` });
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
