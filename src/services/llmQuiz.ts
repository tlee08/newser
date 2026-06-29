import type { NewsArticle, QuizQuestion } from '../types/news';

type LLMQuizResponse = {
  quiz?: Array<{
    id: string;
    prompt: string;
    correctAnswer: string;
    options: string[];
    summary: string;
  }>;
  error?: string;
};

export async function generateLLMQuiz(articles: NewsArticle[]): Promise<QuizQuestion[]> {
  try {
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles })
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as LLMQuizResponse;
    const rawQuestions = payload.quiz ?? [];

    return rawQuestions.map((q, i) => ({
      id: q.id,
      prompt: q.prompt,
      correctAnswer: q.correctAnswer,
      options: q.options,
      summary: q.summary,
      source: articles[i]?.source ?? 'NewsAPI',
      articleUrl: articles[i]?.url ?? '#',
      imageUrl: articles[i]?.imageUrl
    }));
  } catch {
    return [];
  }
}
