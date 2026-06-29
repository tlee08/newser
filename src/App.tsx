import {
  Alert,
  Button,
  Chip,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Filter, Globe, Newspaper, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionCard } from "./components/QuestionCard";
import { ScoreScreen } from "./components/ScoreScreen";
import { generateLLMQuiz } from "./services/llmQuiz";
import { fetchDailyNews } from "./services/newsApi";
import { buildDailyQuiz, detectCategory } from "./services/quizBuilder";
import { recordPlay } from "./services/streaks";
import type { NewsArticle, QuizQuestion } from "./types/news";

type Stage = "loading" | "playing" | "score";

export default function App() {
  const [stage, setStage] = useState<Stage>("loading");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [llmQuizQuestions, setLLMQuizQuestions] = useState<
    QuizQuestion[] | null
  >(null);

  const availableCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      const cat = detectCategory(article);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
  }, [articles]);

  const filteredArticles = useMemo(
    () =>
      selectedCategory
        ? articles.filter((a) => detectCategory(a) === selectedCategory)
        : articles,
    [articles, selectedCategory],
  );

  const quizArticles = useMemo(
    () => (filteredArticles.length >= 5 ? filteredArticles : articles),
    [filteredArticles, articles],
  );

  const ruleBasedQuiz = useMemo(
    () => buildDailyQuiz(quizArticles),
    [quizArticles],
  );
  const quiz = llmQuizQuestions ?? ruleBasedQuiz;
  const currentQuestion = quiz[questionIndex];

  async function loadNews() {
    setStage("loading");
    setError(null);
    setLLMQuizQuestions(null);
    try {
      const dailyNews = await fetchDailyNews(selectedCountry ?? undefined);
      setArticles(dailyNews);

      if (dailyNews.length >= 5) {
        try {
          const llm = await generateLLMQuiz(dailyNews);
          if (llm.length === 5 && llm.every((q) => q.options.length === 4)) {
            setLLMQuizQuestions(llm);
          }
        } catch {
          // LLM failed, will use rule-based fallback
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "NewsAPI went full mime.",
      );
      setArticles([]);
    } finally {
      setQuestionIndex(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setScore(0);
      setStage("playing");
    }
  }

  useEffect(() => {
    void loadNews();
  }, []);

  useEffect(() => {
    setLLMQuizQuestions(null);
  }, [selectedCategory]);

  useEffect(() => {
    void loadNews();
  }, [selectedCountry]);

  function submitAnswer() {
    if (!selectedAnswer || answered) {
      return;
    }

    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore((currentScore) => currentScore + 1);
    }
    setAnswered(true);
  }

  const finishQuiz = useCallback(() => {
    setStreak(recordPlay());
    setStage("score");
  }, []);

  function nextQuestion() {
    if (questionIndex + 1 >= quiz.length) {
      finishQuiz();
      return;
    }

    setQuestionIndex((index) => index + 1);
    setSelectedAnswer(null);
    setAnswered(false);
  }

  return (
    <main className="app-shell">
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <header className="app-header">
            <Group gap="sm" justify="center">
              <Newspaper size={34} />
              <Text fw={900} tt="uppercase" className="kicker">
                Newser
              </Text>
            </Group>
            <Title className="hero-title">Daily Briefing Brawl</Title>
            <Text className="hero-copy">
              Five headlines enter. One reader leaves mildly informed and
              overconfident.
            </Text>
          </header>

          {error ? (
            <Alert color="yellow" title="Using demo headlines">
              {error}
            </Alert>
          ) : null}

          {availableCategories.length > 1 ? (
            <Group justify="center" gap="xs">
              <Filter size={16} />
              <Chip.Group
                multiple={false}
                value={selectedCategory ?? ""}
                onChange={(val) => setSelectedCategory(val || null)}
              >
                <Chip value="">All</Chip>
                {availableCategories.map((cat) => (
                  <Chip key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Chip>
                ))}
              </Chip.Group>
            </Group>
          ) : null}

          <Group justify="center" gap="xs">
            <Globe size={16} />
            <Chip.Group
              multiple={false}
              value={selectedCountry ?? ""}
              onChange={(val) => setSelectedCountry(val || null)}
            >
              <Chip value="">Worldwide</Chip>
              <Chip value="us">US</Chip>
            </Chip.Group>
          </Group>

          <Group justify="center">
            <Button
              variant="subtle"
              color="dark"
              leftSection={<RefreshCcw size={18} />}
              onClick={loadNews}
            >
              Refresh headlines
            </Button>
          </Group>

          {stage === "loading" ? (
            <div className="loading-panel">
              <Loader color="pink" />
              <Text fw={800}>Shaking the news vending machine...</Text>
            </div>
          ) : null}

          {stage === "playing" && currentQuestion ? (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              questionNumber={questionIndex + 1}
              totalQuestions={quiz.length}
              selectedAnswer={selectedAnswer}
              answered={answered}
              score={score}
              onSelect={setSelectedAnswer}
              onSubmit={submitAnswer}
              onNext={nextQuestion}
              onRestart={loadNews}
            />
          ) : null}

          {stage === "score" ? (
            <ScoreScreen
              score={score}
              total={quiz.length}
              streak={streak}
              onRestart={loadNews}
            />
          ) : null}
        </Stack>
      </Container>
    </main>
  );
}
