export type NewsArticle = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt?: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  imageUrl?: string;
  source: string;
  articleUrl: string;
  correctAnswer: string;
  options: string[];
  summary: string;
};
