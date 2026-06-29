import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = process.env.PORT || 3000;
const DIST = join(import.meta.dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json'
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeArticlesForLLM(articles) {
  return articles
    .filter((a) => a.title && a.url)
    .slice(0, 5)
    .map((a) => ({
      title: a.title,
      description: a.description ?? '',
      url: a.url,
      source: a.source ?? 'Unknown',
      imageUrl: a.imageUrl ?? a.urlToImage
    }));
}

async function generateQuizWithLLM(articles) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || articles.length < 5) {
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

  const articleText = articles.map((a, i) =>
    `Article ${i + 1}:
Title: ${a.title}
Source: ${a.source}
Description: ${a.description}`
  ).join('\n\n');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a 5-question quiz from these articles:\n\n${articleText}` }
      ],
      max_tokens: 2000,
      temperature: 0.9
    })
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content ?? '';

  try {
    const cleaned = raw.replace(/```(?:json)?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.slice(0, 5).map((q, i) => ({
      id: `${i}-${articles[i]?.title ?? 'llm'}`,
      prompt: q.prompt ?? 'What just happened?',
      correctAnswer: q.correctAnswer ?? articles[i]?.title ?? '',
      options: Array.isArray(q.options) && q.options.length === 4 ? q.options : [],
      summary: q.summary ?? articles[i]?.description ?? ''
    }));
  } catch {
    return [];
  }
}

async function serveStatic(res, path) {
  try {
    const content = await readFile(path);
    const ext = extname(path);
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.end(content);
  } catch {
    try {
      const html = await readFile(join(DIST, 'index.html'));
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    } catch {
      res.statusCode = 500;
      res.end('Build output not found. Run pnpm build first.\n');
    }
  }
}

async function newsHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    res.statusCode = 200;
    res.end(JSON.stringify({ articles: [] }));
    return;
  }

  const url = new URL('https://newsapi.org/v2/top-headlines');
  const reqUrl = new URL(req.url, 'http://localhost');
  url.searchParams.set('language', 'en');
  url.searchParams.set('pageSize', '20');
  url.searchParams.set('apiKey', apiKey);

  const country = reqUrl.searchParams.get('country');
  if (country) {
    url.searchParams.set('country', country);
  }

  try {
    const response = await fetch(url);
    const payload = await response.json();

    if (!response.ok) {
      res.statusCode = response.status;
      res.end(JSON.stringify({ error: payload.message ?? 'NewsAPI request failed', articles: [] }));
      return;
    }

    res.end(JSON.stringify({ articles: payload.articles ?? [] }));
  } catch {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Could not reach NewsAPI', articles: [] }));
  }
}

const server = createServer((req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost');
  if (reqUrl.pathname === '/api/news') {
    return newsHandler(req, res);
  }

  if (reqUrl.pathname === '/api/generate-quiz' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const body = await readJsonBody(req);
      const articles = normalizeArticlesForLLM(body.articles ?? []);
      const quiz = await generateQuizWithLLM(articles);
      res.end(JSON.stringify({ quiz }));
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Could not generate quiz', quiz: [] }));
    }
    return;
  }

  const filePath = join(DIST, reqUrl.pathname === '/' ? 'index.html' : reqUrl.pathname);
  return serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Newser running on http://localhost:${PORT}`);
});
