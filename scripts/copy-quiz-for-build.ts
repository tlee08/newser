import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadQuizFile } from "../lib/pipeline";

const OUT = join(import.meta.dirname, "..", "public", "quizzes.json");

const FALLBACK: Record<string, any[]> = {
  all: [],
  general: [],
  tech: [],
  politics: [],
  business: [],
  sports: [],
  science: [],
};

const quizzes = loadQuizFile() ?? FALLBACK;

// Trim each topic to max 5 questions for the static build
for (const key of Object.keys(quizzes)) {
  if (quizzes[key].length > 5) quizzes[key] = quizzes[key].slice(0, 5);
}

if (!existsSync(join(import.meta.dirname, "..", "public"))) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(join(import.meta.dirname, "..", "public"), { recursive: true });
}

await writeFile(OUT, JSON.stringify({ quizzes }), "utf-8");
console.log(`Wrote ${Object.values(quizzes).reduce((s, qs) => s + qs.length, 0)} questions to quizzes.json`);
