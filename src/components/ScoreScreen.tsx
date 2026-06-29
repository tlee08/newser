import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { RotateCcw, Trophy } from 'lucide-react';

type ScoreScreenProps = {
  score: number;
  total: number;
  onRestart: () => void;
};

export function ScoreScreen({ score, total, onRestart }: ScoreScreenProps) {
  const verdict =
    score === total
      ? 'Pulitzer adjacent. Extremely suspicious.'
      : score >= 3
        ? 'Briefing gobbled. You may approach the group chat.'
        : 'A humble score, but the news cycle is famously slippery.';

  return (
    <Card className="quiz-card score-card" shadow="xl" padding="xl">
      <Stack align="center" gap="lg">
        <div className="trophy-wrap">
          <Trophy size={54} />
        </div>
        <Title order={1}>
          {score} / {total}
        </Title>
        <Text size="xl" fw={800} ta="center">
          {verdict}
        </Text>
        <Text ta="center" c="dark.5">
          Come back tomorrow for five more tiny chaos nuggets from the global briefing desk.
        </Text>
        <Group>
          <Button color="pink" leftSection={<RotateCcw size={18} />} onClick={onRestart}>
            Play again
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
