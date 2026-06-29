import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

type NewsApiArticle = {
  title?: string;
  description?: string;
  url?: string;
  urlToImage?: string;
  source?: { name?: string };
  publishedAt?: string;
};

function newsApiMiddleware(): Plugin {
  return {
    name: 'newser-newsapi-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/news', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');

        const apiKey = process.env.NEWSAPI_KEY;
        if (!apiKey) {
          res.statusCode = 200;
          res.end(JSON.stringify({ articles: [] }));
          return;
        }

        const url = new URL('https://newsapi.org/v2/top-headlines');
        url.searchParams.set('language', 'en');
        url.searchParams.set('pageSize', '20');
        url.searchParams.set('apiKey', apiKey);

        try {
          const response = await fetch(url);
          const payload = (await response.json()) as { articles?: NewsApiArticle[]; message?: string };

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
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), newsApiMiddleware()]
});
