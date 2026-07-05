import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

type NewsApiArticle = {
  title?: string;
  description?: string;
  url?: string;
  urlToImage?: string;
  source?: { name?: string };
  publishedAt?: string;
};

type QuizArticleInput = {
  title: string;
  description: string;
  url: string;
  source: string;
  imageUrl?: string;
};

type QuizQuestionOutput = {
  id: string;
  prompt: string;
  correctAnswer: string;
  options: string[];
  summary: string;
};

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function normalizeArticlesForLLM(articles: any[]): QuizArticleInput[] {
  return articles
    .filter((a: any) => a.title && a.url)
    .slice(0, 5)
    .map((a: any) => ({
      title: a.title,
      description: a.description ?? "",
      url: a.url,
      source: a.source ?? "Unknown",
      imageUrl: a.imageUrl ?? a.urlToImage,
    }));
}

async function generateQuizWithLLM(
  articles: QuizArticleInput[],
  apiKey?: string,
): Promise<QuizQuestionOutput[]> {
  if (!apiKey || articles.length < 5) {
    return [];
  }

  const systemPrompt = `You are a witty news quiz generator for "Newser" — a playful daily briefing app. Your job: turn 5 news articles into a funny multiple-choice quiz.

RULES:
- Generate exactly 5 questions, one per article.
- Each question must have: a prompt, 4 answer options, the correct answer, and a short factual summary (1 sentence).
- The prompt should be funny and energetic — like a loud morning show host.
- The correct answer must be factually accurate based on the article. Do NOT invent false events. The correct answer should be a compact version of the headline (strip trailing "- Source" or "| Recap" parts).
- 3 of the 4 options must be WRONG. Make 2 of those wrong answers humorous decoys based on the article's topic (playful, absurd but not libelous). The 3rd wrong answer should be a very wrong but funny decoy.
- The summary must stick to the article facts. Do not fabricate.
- Return ONLY a JSON array. No markdown, no explanations.

Format:
[{
  "prompt": "Funny question text",
  "correctAnswer": "Accurate fact",
  "options": ["Correct answer", "Wrong decoy 1", "Wrong decoy 2", "Very wrong decoy"],
  "summary": "One sentence factual summary"
}]`;

  const articleText = articles
    .map(
      (a, i) =>
        `Article ${i + 1}:
Title: ${a.title}
Source: ${a.source}
Description: ${a.description}`,
    )
    .join("\n\n");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a 5-question quiz from these articles:\n\n${articleText}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "";

  try {
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    const parsed = JSON.parse(cleaned) as any[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.slice(0, 5).map((q: any, i: number) => ({
      id: `${i}-${articles[i]?.title ?? "llm"}`,
      prompt: q.prompt ?? "What just happened?",
      correctAnswer: q.correctAnswer ?? articles[i]?.title ?? "",
      options:
        Array.isArray(q.options) && q.options.length === 4 ? q.options : [],
      summary: q.summary ?? articles[i]?.description ?? "",
    }));
  } catch {
    return [];
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  function makeNewsApiMiddleware(): Plugin {
    return {
      name: "newser-api-dev-middleware",
      configureServer(server) {
        server.middlewares.use("/api/news", async (req, res) => {
          res.setHeader("Content-Type", "application/json");

          const apiKey = env.NEWSAPI_KEY;
          if (!apiKey) {
            res.statusCode = 200;
            res.end(JSON.stringify({ articles: [] }));
            return;
          }

          const url = new URL("https://newsapi.org/v2/top-headlines");
          const reqUrl = new URL(req.url ?? "/", "http://localhost");
          url.searchParams.set("language", "en");
          url.searchParams.set("pageSize", "20");
          url.searchParams.set("apiKey", apiKey);

          const country = reqUrl.searchParams.get("country");
          if (country) {
            url.searchParams.set("country", country);
          }

          try {
            const response = await fetch(url);
            const payload = (await response.json()) as {
              articles?: NewsApiArticle[];
              message?: string;
            };

            if (!response.ok) {
              res.statusCode = response.status;
              res.end(
                JSON.stringify({
                  error: payload.message ?? "NewsAPI request failed",
                  articles: [],
                }),
              );
              return;
            }

            res.end(JSON.stringify({ articles: payload.articles ?? [] }));
          } catch {
            res.statusCode = 502;
            res.end(
              JSON.stringify({
                error: "Could not reach NewsAPI",
                articles: [],
              }),
            );
          }
        });

        server.middlewares.use("/api/generate-quiz", async (req, res) => {
          res.setHeader("Content-Type", "application/json");

          try {
            const body = await readJsonBody(req);
            const articles = normalizeArticlesForLLM(body.articles ?? []);
            const quiz = await generateQuizWithLLM(
              articles,
              env.DEEPSEEK_API_KEY,
            );
            res.end(JSON.stringify({ quiz }));
          } catch {
            res.statusCode = 400;
            res.end(
              JSON.stringify({ error: "Could not generate quiz", quiz: [] }),
            );
          }
        });
      },
    };
  }

  return {
    plugins: [react(), makeNewsApiMiddleware()],
  };
});
