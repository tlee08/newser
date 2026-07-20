import { create } from "zustand";
import type { QuizQuestion } from "../types/news";

export const TOPIC_IDS = [
  "general",
  "tech",
  "politics",
  "business",
  "sports",
  "science",
] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

export const TOPIC_LABELS: Record<TopicId, string> = {
  general: "General",
  tech: "Tech",
  politics: "Politics",
  business: "Business",
  sports: "Sports",
  science: "Science",
};

type TopicState = {
  currentIndex: number;
  score: number;
  answeredCount: number;
  selectedAnswer: string | null;
  answered: boolean;
  finished: boolean;
};

type QuizStore = {
  quizzes: Record<string, QuizQuestion[]>;
  activeTopic: TopicId;
  topics: Record<string, TopicState>;
  setQuizzes: (data: Record<string, QuizQuestion[]>) => void;
  setActiveTopic: (topic: TopicId) => void;
  selectAnswer: (answer: string) => void;
  submitAnswer: () => void;
  nextQuestion: () => void;
  restartTopic: (topic: TopicId) => void;
};

function blankTopic(): TopicState {
  return {
    currentIndex: 0,
    score: 0,
    answeredCount: 0,
    selectedAnswer: null,
    answered: false,
    finished: false,
  };
}

function initTopics(): Record<string, TopicState> {
  const topics: Record<string, TopicState> = {};
  for (const id of TOPIC_IDS) topics[id] = blankTopic();
  return topics;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  quizzes: {},
  activeTopic: "general",
  topics: initTopics(),

  setQuizzes: (data) => set({ quizzes: data }),

  setActiveTopic: (topic) => set({ activeTopic: topic }),

  selectAnswer: (answer) => {
    const { activeTopic } = get();
    set((s) => ({
      topics: {
        ...s.topics,
        [activeTopic]: { ...s.topics[activeTopic], selectedAnswer: answer },
      },
    }));
  },

  submitAnswer: () => {
    const { activeTopic, topics, quizzes } = get();
    const t = topics[activeTopic];
    if (!t.selectedAnswer || t.answered) return;

    const questions = quizzes[activeTopic];
    if (!questions) return;

    const current = questions[t.currentIndex];
    const correctAnswer = current.answers.find((a) => a.type === "correct");
    const correct = t.selectedAnswer === correctAnswer?.text;

    set((s) => ({
      topics: {
        ...s.topics,
        [activeTopic]: {
          ...s.topics[activeTopic],
          answered: true,
          answeredCount: s.topics[activeTopic].answeredCount + 1,
          score: correct
            ? s.topics[activeTopic].score + 1
            : s.topics[activeTopic].score,
        },
      },
    }));
  },

  nextQuestion: () => {
    const { activeTopic, topics, quizzes } = get();
    const questions = quizzes[activeTopic];
    if (!questions) return;

    const t = topics[activeTopic];
    const isLast = t.currentIndex + 1 >= questions.length;

    set((s) => ({
      topics: {
        ...s.topics,
        [activeTopic]: {
          ...s.topics[activeTopic],
          currentIndex: isLast ? t.currentIndex : t.currentIndex + 1,
          selectedAnswer: null,
          answered: false,
          finished: isLast,
        },
      },
    }));
  },

  restartTopic: (topic) => {
    set((s) => ({
      topics: { ...s.topics, [topic]: blankTopic() },
    }));
  },
}));
