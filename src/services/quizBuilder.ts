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

const categoryKeywords: Record<string, string[]> = {
  politics: ['election', 'vote', 'president', 'congress', 'senate', 'government', 'policy', 'mayor', 'governor', 'diplomat', 'treaty', 'bill', 'law', 'legislation', 'politician', 'political', 'campaign', 'debate', 'party', 'parliament', 'minister', 'cabinet', 'court', 'ruling', 'supreme', 'judge', 'justice', 'constitution'],
  tech: ['ai', 'artificial intelligence', 'app', 'software', 'tech', 'technology', 'silicon', 'startup', 'robot', 'internet', 'cyber', 'digital', 'data', 'algorithm', 'google', 'apple', 'microsoft', 'chip', 'semiconductor', 'coding', 'device', 'gadget', 'iphone', 'android'],
  sports: ['team', 'win', 'championship', 'league', 'score', 'match', 'game', 'player', 'coach', 'olympic', 'tournament', 'season', 'goal', 'race', 'football', 'soccer', 'basketball', 'tennis', 'athlete', 'sports', 'playoff', 'nfl', 'nba', 'mlb', 'nhl', 'fifa'],
  science: ['scientist', 'study', 'research', 'discovery', 'space', 'nasa', 'climate', 'gene', 'dna', 'species', 'fossil', 'physics', 'chemistry', 'biology', 'medicine', 'vaccine', 'virus', 'pandemic', 'ocean', 'earth', 'planet', 'moon', 'mars', 'galaxy', 'energy', 'battery', 'nuclear', 'environment', 'telescope'],
  world: ['international', 'united nations', 'foreign', 'war', 'peace', 'troops', 'military', 'nato', 'european union', 'border', 'migrant', 'refugee', 'protest', 'crisis', 'conflict', 'cease-fire', 'sanctions', 'summit', 'global', 'diplomatic'],
  business: ['market', 'stock', 'economy', 'inflation', 'bank', 'investor', 'trade', 'tariff', 'dollar', 'crypto', 'bitcoin', 'finance', 'revenue', 'earnings', 'profit', 'business', 'industry', 'company', 'corporation', 'merger', 'acquisition', 'ipo', 'rate', 'fed', 'federal reserve']
};

const promptPools: Record<string, string[]> = {
  politics: [
    'What political saga is unfolding in this headline?',
    'Which power move just hit the front page?',
    "What's the latest drama from the halls of power?",
    'Which political plot twist made the briefing?',
    'What just happened that has pundits scrambling?',
    'Which headline sounds like a season finale cliffhanger?'
  ],
  tech: [
    'What shiny new thing is Silicon Valley foaming about?',
    'Which tech headline made your phone buzz with urgency?',
    'What gadget or gizmo is about to change everything (again)?',
    'Which algorithm just got a promotion?',
    'What tech headline sounds like it was written by a bot (and might have been)?',
    'Which startup just promised to disrupt something nobody asked to be disrupted?'
  ],
  sports: [
    'What sports drama has the commentators losing their minds?',
    'Which athletic feat made the highlight reel?',
    "What's the scoreboard screaming about today?",
    'Which sporting moment just broke the internet?',
    'What just happened on the field that will be replayed forever?',
    'Which headline turned the sports section into a telenovela?'
  ],
  science: [
    'What discovery has lab coats high-fiving this week?',
    'Which science headline made the nerd community vibrate with joy?',
    'What breakthrough is about to make your old tech look sad?',
    'Which research finding sounds like sci-fi but is not?',
    "What did scientists just figure out that you'll pretend to understand?",
    'Which discovery has the "well actually" crowd sharpening their tweets?'
  ],
  world: [
    "What's happening across the globe that the world desk is buzzing about?",
    'Which international story just landed with a thud?',
    'What global development has diplomats reaching for their phones?',
    'Over to the world desk—what is the headline?',
    'What is going on overseas that sounds like a movie plot?',
    'Which world event has everyone updating their news app every four minutes?'
  ],
  business: [
    "What's making the markets do that thing they do?",
    'Which business headline has traders spilling coffee?',
    "What's the latest plot twist in the economy?",
    'Which money move just made the briefing?',
    'What business headline has your group chat suddenly full of armchair economists?',
    'Which economic indicator just did something alarming?'
  ],
  general: [
    'What is everyone suddenly pointing at in this headline?',
    'Over to the world desk, what is this picture probably about?',
    'Which headline made the morning briefing put down its coffee?',
    'What were people banding together about this week?',
    'What plot twist did the news cycle serve today?',
    "What's the story that has the newsroom in a tizzy?",
    'Which headline requires the least amount of coffee to process?',
    'What happened that will be on trivia night six months from now?'
  ]
};

const imagePromptPools: Record<string, string[]> = {
  politics: [
    'What political drama does this photo capture?',
    'Which headline goes with this slightly-too-serious press photo?',
    'Look at this picture. What just happened in the halls of power?'
  ],
  tech: [
    'What gadget reveal does this photo promise to change everything?',
    'Which tech headline is this stock photo trying very hard to match?',
    'What shiny new thing is this picture pretending to be casual about?'
  ],
  sports: [
    'What athletic triumph is frozen in this action shot?',
    'Which sports headline had photographers scrambling for this frame?',
    'Study this photo. What sporting moment just broke the scoreboard?'
  ],
  science: [
    'What discovery does this science photo want you to be amazed by?',
    'Which research headline inspired this very serious lab photo?',
    'What breakthrough is this picture trying to make look simple?'
  ],
  world: [
    'What global scene is captured in this photo?',
    'Which world headline is this photo attached to?',
    'Look at this image. What just happened on the international stage?'
  ],
  business: [
    'What market event does this business photo capture?',
    'Which money headline is this photo trying to look calm about?',
    'What economic move does this picture represent?'
  ],
  general: [
    'Over to the world desk, what is this picture probably about?',
    'What headline goes with this photo? You have four guesses.',
    'Look at this image. What news just broke?',
    'What story does this picture tell that the headline confirms?'
  ]
};

export function detectCategory(article: NewsArticle): string {
  const text = `${article.title} ${article.description}`.toLowerCase();
  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function pickPrompt(category: string, seed: number, hasImage: boolean): string {
  if (hasImage) {
    const pool = imagePromptPools[category] ?? imagePromptPools.general;
    return pool[seed % pool.length];
  }
  const pool = promptPools[category] ?? promptPools.general;
  return pool[seed % pool.length];
}

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

export function getDailySeed(date: Date = new Date()): number {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildDailyQuiz(articles: NewsArticle[], seed?: number): QuizQuestion[] {
  const usable = (articles.length >= 5 ? articles : fallbackArticles).slice(0, 5);
  const dailySeed = seed ?? getDailySeed();

  return usable.map((article, index) => {
    const correctAnswer = compactAnswer(article.title);
    const otherHeadlines = usable
      .filter((_, otherIndex) => otherIndex !== index)
      .map((item) => compactAnswer(item.title))
      .slice(0, 2);
    const questionSeed = dailySeed + index;
    const options = seededShuffle([correctAnswer, ...otherHeadlines, decoys[index]], questionSeed);
    const category = detectCategory(article);

    return {
      id: `${index}-${article.title}`,
      prompt: pickPrompt(category, questionSeed, Boolean(article.imageUrl)),
      imageUrl: article.imageUrl,
      source: article.source,
      articleUrl: article.url,
      correctAnswer,
      options,
      summary: article.description
    };
  });
}
