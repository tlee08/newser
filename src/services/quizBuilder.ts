import type { NewsArticle, QuizQuestion } from '../types/news';

const fallbackArticles: NewsArticle[] = [
  {
    title: 'French farmers stage coordinated protests over agricultural rules',
    description: 'Farmers gathered to protest new rules, pricing pressure, and the bureaucracy haunting their tractors.',
    url: 'https://newsapi.org/',
    source: 'Demo Wire'
  },
  {
    title: 'Mexico prepares for heavy rains as officials issue public safety alerts',
    description: 'Authorities warned communities to prepare for disruption, flooding, and the ancient ritual of checking weather apps twice.',
    url: 'https://newsapi.org/',
    source: 'Demo Wire'
  },
  {
    title: 'Tech companies race to launch new AI tools for office workers',
    description: 'The latest software promises to summarize meetings, draft emails, and possibly ask whether that meeting needed to exist.',
    url: 'https://newsapi.org/',
    source: 'Demo Wire'
  },
  {
    title: 'Global markets wobble as investors watch central bank signals',
    description: 'Investors reacted to hints about interest rates with the emotional stability of a shopping cart on a hill.',
    url: 'https://newsapi.org/',
    source: 'Demo Wire'
  },
  {
    title: 'Scientists report progress on cleaner battery materials',
    description: 'Researchers say new materials could make batteries cheaper and cleaner, which is excellent news for everything that beeps.',
    url: 'https://newsapi.org/',
    source: 'Demo Wire'
  }
];

const promptOpeners = [
  'What is everyone suddenly pointing at in this headline?',
  'Over to the world desk, what is this picture probably about?',
  'Which headline made the morning briefing put down its coffee?',
  'What were people banding together about this week?',
  'What plot twist did the news cycle serve today?'
];

const decoys = [
  'A ceremonial cheese audit got wildly out of hand',
  'Someone attempted to regulate clouds by spreadsheet',
  'A mayor declared Tuesday emotionally unavailable',
  'A committee formed to investigate suspiciously confident ducks',
  'A finance chart achieved sentience during lunch'
];

function compactAnswer(title: string): string {
  return title
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s+\|\s+.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffled<T>(items: T[], seed: number): T[] {
  return [...items].sort((a, b) => {
    const left = JSON.stringify(a).charCodeAt(seed % JSON.stringify(a).length);
    const right = JSON.stringify(b).charCodeAt(seed % JSON.stringify(b).length);
    return left - right;
  });
}

export function buildDailyQuiz(articles: NewsArticle[]): QuizQuestion[] {
  const usable = (articles.length >= 5 ? articles : fallbackArticles).slice(0, 5);

  return usable.map((article, index) => {
    const correctAnswer = compactAnswer(article.title);
    const otherHeadlines = usable
      .filter((_, otherIndex) => otherIndex !== index)
      .map((item) => compactAnswer(item.title))
      .slice(0, 2);
    const options = shuffled([correctAnswer, ...otherHeadlines, decoys[index]], index + article.title.length);

    return {
      id: `${index}-${article.title}`,
      prompt: promptOpeners[index],
      imageUrl: article.imageUrl,
      source: article.source,
      articleUrl: article.url,
      correctAnswer,
      options,
      summary: article.description
    };
  });
}
