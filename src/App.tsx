import { Alert, Button, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { Newspaper, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { QuestionCard } from './components/QuestionCard';
import { ScoreScreen } from './components/ScoreScreen';
import { fetchDailyNews } from './services/newsApi';
import { buildDailyQuiz } from './services/quizBuilder';
import type { NewsArticle } from './types/news';

type Stage = 'loading' | 'playing' | 'score';

export default function App() {
  const [stage, setStage] = useState<Stage>('loading');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const quiz = useMemo(() => buildDailyQuiz(articles), [articles]);
  const currentQuestion = quiz[questionIndex];

  async function loadNews() {
    setStage('loading');
    setError(null);
    try {
      const dailyNews = await fetchDailyNews();
      setArticles(dailyNews);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'NewsAPI went full mime.');
      setArticles([]);
    } finally {
      setQuestionIndex(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setScore(0);
      setStage('playing');
    }
  }

  useEffect(() => {
    void loadNews();
  }, []);

  function submitAnswer() {
    if (!selectedAnswer || answered) {
      return;
    }

    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore((currentScore) => currentScore + 1);
    }
    setAnswered(true);
  }

  function nextQuestion() {
    if (questionIndex + 1 >= quiz.length) {
      setStage('score');
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
              Five headlines enter. One reader leaves mildly informed and overconfident.
            </Text>
          </header>

          {error ? (
            <Alert color="yellow" title="Using demo headlines">
              {error}
            </Alert>
          ) : null}

          {stage === 'loading' ? (
            <div className="loading-panel">
              <Loader color="pink" />
              <Text fw={800}>Shaking the news vending machine...</Text>
            </div>
          ) : null}

          {stage === 'playing' && currentQuestion ? (
            <QuestionCard
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

          {stage === 'score' ? <ScoreScreen score={score} total={quiz.length} onRestart={loadNews} /> : null}

          <Group justify="center">
            <Button variant="subtle" color="dark" leftSection={<RefreshCcw size={18} />} onClick={loadNews}>
              Refresh headlines
            </Button>
          </Group>
        </Stack>
      </Container>
    </main>
  );
}
