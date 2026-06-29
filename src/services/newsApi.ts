import type { NewsArticle } from '../types/news';

type NewsApiResponse = {
  articles?: Array<{
    title?: string;
    description?: string;
    url?: string;
    urlToImage?: string;
    source?: { name?: string };
    publishedAt?: string;
  }>;
  error?: string;
};

export async function fetchDailyNews(): Promise<NewsArticle[]> {
  const response = await fetch('/api/news');

  if (!response.ok) {
    throw new Error('NewsAPI briefing desk dropped its sandwich.');
  }

  const payload = (await response.json()) as NewsApiResponse;

  return (payload.articles ?? [])
    .filter((article) => article.title && article.url)
    .map((article) => ({
      title: article.title ?? 'Untitled news object',
      description: article.description ?? 'The details are developing, probably while someone says "sources indicate".',
      url: article.url ?? '#',
      imageUrl: article.urlToImage,
      source: article.source?.name ?? 'Mystery Desk',
      publishedAt: article.publishedAt
    }));
}
