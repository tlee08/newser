import { Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { RotateCcw, Share2, Trophy, Zap } from "lucide-react";
import { shareScore } from "../services/streaks";

type ScoreScreenProps = {
  score: number;
  total: number;
  streak?: number;
  onRestart: () => void;
};

export function ScoreScreen({
  score,
  total,
  streak,
  onRestart,
}: ScoreScreenProps) {
  const verdict =
    score === total
      ? "Pulitzer adjacent. Extremely suspicious."
      : score >= 3
        ? "Briefing gobbled. You may approach the group chat."
        : "A humble score, but the news cycle is famously slippery.";

  return (
    <Card className="quiz-card score-card" shadow="xl" padding="sm">
      <Stack align="center" gap="sm">
        <div className="trophy-wrap">
          <Trophy size={32} />
        </div>
        <Title order={2}>
          {score} / {total}
        </Title>
        <Text size="md" fw={800} ta="center">
          {verdict}
        </Text>
        {(streak ?? 0) > 1 ? (
          <Badge
            color="pink"
            variant="filled"
            size="lg"
            leftSection={<Zap size={16} />}
          >
            {streak}-day streak
          </Badge>
        ) : null}
        <Text ta="center" c="dark.5">
          Come back tomorrow for five more tiny chaos nuggets from the global
          briefing desk.
        </Text>
        <Group>
          <Button
            color="pink"
            size="sm"
            leftSection={<RotateCcw size={16} />}
            onClick={onRestart}
          >
            Play again
          </Button>
          <Button
            variant="outline"
            color="dark"
            size="sm"
            leftSection={<Share2 size={16} />}
            onClick={() => shareScore(score, total, streak ?? 0)}
          >
            Share
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
