export type RawArticle = {
  id: string;
  topic: string;
  title: string;
  description?: string;
  url: string;
  urlToImage?: string;
  source?: string | { name?: string };
  publishedAt?: string;
  content?: string;
};

export type QuizAnswer = {
  text: string;
  type: "correct" | "plausible_whimsical" | "absurd" | "adapted_headline";
};

export type QuizQuestionOutput = {
  id: string;
  topic: string;
  prompt: string;
  answers: QuizAnswer[];
  summary: string;
  source?: string;
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
    content?: string;
  }[];
  quizQuestions: (QuizQuestionOutput & { articleRef: string })[];
};
