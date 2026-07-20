export type NewsArticle = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt?: string;
};

export type QuizAnswer = {
  text: string;
  type: "correct" | "plausible_whimsical" | "absurd" | "adapted_headline";
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  imageUrl?: string;
  source: string;
  articleUrl: string;
  answers: QuizAnswer[];
  summary: string;
};
