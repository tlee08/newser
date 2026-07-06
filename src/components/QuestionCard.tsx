import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Progress,
  Radio,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ExternalLink, RotateCcw, Sparkles } from "lucide-react";
import type { QuizQuestion } from "../types/news";

type QuestionCardProps = {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  answered: boolean;
  score: number;
  onSelect: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onRestart: () => void;
};

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  answered,
  score,
  onSelect,
  onSubmit,
  onNext,
  onRestart,
}: QuestionCardProps) {
  const isFinal = questionNumber === totalQuestions;

  return (
    <Card className="quiz-card" shadow="xl" padding="sm">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Badge color="dark" variant="filled" size="sm">
            Question {questionNumber} / {totalQuestions}
          </Badge>
          <Badge color="pink" leftSection={<Sparkles size={12} />} size="sm">
            Score {score}
          </Badge>
        </Group>

        <Progress
          value={(questionNumber / totalQuestions) * 100}
          color="pink"
          radius="xs"
          size="sm"
        />

        {question.imageUrl ? (
          <>
            <Image
              key={question.imageUrl}
              src={question.imageUrl}
              alt=""
              className="news-image"
              fallbackSrc="/news-placeholder.svg"
            />
            <Anchor
              href={question.imageUrl}
              target="_blank"
              rel="noreferrer"
              size="10px"
              ta="right"
              c="pink.7"
            >
              image source
            </Anchor>
          </>
        ) : (
          <div className="image-fallback">Breaking-ish</div>
        )}

        <Stack gap="xs">
          <Text size="sm" fw={700} c="pink.7">
            {question.source}
          </Text>
          <Title order={3}>{question.prompt}</Title>
        </Stack>

        <Radio.Group value={selectedAnswer} onChange={onSelect}>
          <Stack gap="xs">
            {question.options.map((option, index) => {
              const isCorrect =
                answered && index === question.correctAnswerIndex;
              const isWrongPick =
                answered &&
                selectedAnswer === option &&
                index !== question.correctAnswerIndex;
              return (
                <Radio.Card
                  className="answer-option"
                  data-correct={isCorrect || undefined}
                  data-wrong={isWrongPick || undefined}
                  value={option}
                  key={option}
                  disabled={answered}
                >
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <Text fw={700}>{option}</Text>
                  </Group>
                </Radio.Card>
              );
            })}
          </Stack>
        </Radio.Group>

        {answered ? (
          <Stack className="summary-strip" gap="sm">
            <Text fw={800}>
              {selectedAnswer === question.options[question.correctAnswerIndex]
                ? "Correct. The newsroom salutes you."
                : "Nope. The headline had other plans."}
            </Text>
            <Text>{question.summary}</Text>
            <Anchor href={question.articleUrl} target="_blank" rel="noreferrer">
              <Group gap={6}>
                Read the source <ExternalLink size={16} />
              </Group>
            </Anchor>
          </Stack>
        ) : null}

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="dark"
            size="sm"
            leftSection={<RotateCcw size={15} />}
            onClick={onRestart}
          >
            Restart
          </Button>
          {answered ? (
            <Button color="dark" size="sm" onClick={onNext}>
              {isFinal ? "Show my score" : "Next headline"}
            </Button>
          ) : (
            <Button
              color="pink"
              size="sm"
              onClick={onSubmit}
              disabled={!selectedAnswer}
            >
              Lock in the take
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
