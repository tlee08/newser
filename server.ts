import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { loadQuizFile } from "./lib/pipeline";

const PORT = process.env.PORT || 3000;
const DIST = join(import.meta.dirname, "dist");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};

const quizzes = loadQuizFile(process.env.QUIZ_SOURCE || undefined);

async function serveStatic(res: any, path: string) {
  try {
    const content = await readFile(path);
    res.setHeader("Content-Type", MIME[extname(path)] || "application/octet-stream");
    res.end(content);
  } catch {
    try {
      const html = await readFile(join(DIST, "index.html"));
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    } catch {
      res.statusCode = 500;
      res.end("Build output not found. Run pnpm build first.\n");
    }
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/api/quizzes") {
    res.setHeader("Content-Type", "application/json");
    if (!quizzes) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: "No quiz data found. Run pnpm generate-quiz --fresh first." }));
      return;
    }
    res.end(JSON.stringify({ quizzes }));
    return;
  }

  return serveStatic(res, join(DIST, url.pathname === "/" ? "index.html" : url.pathname));
});

server.listen(PORT, () => {
  console.log(`Newser running on http://localhost:${PORT}`);
});
