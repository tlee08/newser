export type RawArticle = {
  id: string;
  topic: string;
  title: string;
  description?: string;
  url: string;
  urlToImage?: string;
  source?: string | { name?: string };
  publishedAt?: string;
};

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
