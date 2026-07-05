import {
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Newspaper } from "lucide-react";
import { useEffect, useState } from "react";
import { QuestionCard } from "./components/QuestionCard";
import { ScoreScreen } from "./components/ScoreScreen";
import { useQuizStore, TOPIC_IDS, TOPIC_LABELS, type TopicId } from "./services/quizStore";
import type { QuizQuestion } from "./types/news";

type FetchState = "loading" | "ready" | "error";

export default function App() {
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const activeTopic = useQuizStore((s) => s.activeTopic);
  const setActiveTopic = useQuizStore((s) => s.setActiveTopic);
  const setQuizzes = useQuizStore((s) => s.setQuizzes);
  const quizzes = useQuizStore((s) => s.quizzes);

  useEffect(() => {
    fetch("/quizzes.json")
      .then((r) => r.json())
      .then((data: { quizzes: Record<string, QuizQuestion[]> }) => {
        if (data.quizzes) {
          setQuizzes(data.quizzes);
          setFetchState("ready");
        } else {
          setFetchState("error");
        }
      })
      .catch(() => setFetchState("error"));
  }, [setQuizzes]);

  if (fetchState === "loading") {
    return (
      <main className="app-shell">
        <Container size="lg" py="xl">
          <div className="loading-panel">
            <Loader color="pink" />
            <Text fw={800}>Shaking the news vending machine...</Text>
          </div>
        </Container>
      </main>
    );
  }

  if (fetchState === "error" || Object.keys(quizzes).length === 0) {
    return (
      <main className="app-shell">
        <Container size="lg" py="xl">
          <Stack align="center" mt="xl">
            <Text fw={800} size="lg">Could not load quizzes. Try again later.</Text>
          </Stack>
        </Container>
      </main>
    );
  }

  const availableTopics = TOPIC_IDS.filter((id) => quizzes[id]);

  return (
    <main className="app-shell">
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <header className="app-header">
            <Group gap="sm" justify="center">
              <Newspaper size={34} />
              <Text fw={900} tt="uppercase" className="kicker">Newser</Text>
            </Group>
            <Title className="hero-title">Daily Briefing Brawl</Title>
            <Text className="hero-copy">
              Five headlines enter. One reader leaves mildly informed and overconfident.
            </Text>
          </header>

          <TopicTabs
            active={activeTopic}
            topics={availableTopics}
            onChange={setActiveTopic}
          />

          <TopicQuiz key={activeTopic} topic={activeTopic} />
        </Stack>
      </Container>
    </main>
  );
}

function TopicTabs({
  active,
  topics,
  onChange,
}: {
  active: TopicId;
  topics: TopicId[];
  onChange: (t: TopicId) => void;
}) {
  const allTopics = useQuizStore((s) => s.topics);
  const quizzes = useQuizStore((s) => s.quizzes);

  return (
    <Group justify="center" gap="xs">
      {topics.map((id) => {
        const t = allTopics[id];
        const answeredCount = t?.answeredCount ?? 0;
        const total = quizzes[id]?.length ?? 5;
        const isActive = id === active;

        return (
          <Button
            key={id}
            variant={isActive ? "filled" : "outline"}
            color={isActive ? "pink" : "dark"}
            size="sm"
            onClick={() => onChange(id)}
            rightSection={
              <Badge size="sm" color={isActive ? "pink" : "dark"} variant="light">
                {answeredCount}/{total}
              </Badge>
            }
          >
            {TOPIC_LABELS[id]}
          </Button>
        );
      })}
    </Group>
  );
}

function TopicQuiz({ topic }: { topic: TopicId }) {
  const quizzes = useQuizStore((s) => s.quizzes);
  const topics = useQuizStore((s) => s.topics);
  const selectAnswer = useQuizStore((s) => s.selectAnswer);
  const submitAnswer = useQuizStore((s) => s.submitAnswer);
  const nextQuestion = useQuizStore((s) => s.nextQuestion);
  const restartTopic = useQuizStore((s) => s.restartTopic);

  const questions = quizzes[topic];
  const t = topics[topic];

  if (!questions || questions.length === 0) {
    return (
      <Text ta="center" c="dark.3">No questions available for this topic.</Text>
    );
  }

  if (t.finished) {
    return (
      <ScoreScreen
        score={t.score}
        total={questions.length}
        onRestart={() => restartTopic(topic)}
      />
    );
  }

  const current = questions[t.currentIndex];
  if (!current) return null;

  return (
    <div>
      <QuestionCard
        question={current}
        questionNumber={t.currentIndex + 1}
        totalQuestions={questions.length}
        selectedAnswer={t.selectedAnswer}
        answered={t.answered}
        score={t.score}
        onSelect={selectAnswer}
        onSubmit={submitAnswer}
        onNext={nextQuestion}
        onRestart={() => restartTopic(topic)}
      />
    </div>
  );
}
