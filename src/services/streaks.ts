const STREAK_KEY = "newser-streak-count";
const DATE_KEY = "newser-last-play-date";

function todayKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function getStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw === null) return 0;
    const count = parseInt(raw, 10);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  } catch {
    return 0;
  }
}

export function recordPlay(): number {
  const today = todayKey();
  let streak = getStreak();

  try {
    const lastDate = localStorage.getItem(DATE_KEY);

    if (lastDate === today) {
      return streak;
    }

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayKey = todayKey(yesterday);

    if (lastDate === yesterdayKey) {
      streak += 1;
    } else {
      streak = 1;
    }

    localStorage.setItem(STREAK_KEY, String(streak));
    localStorage.setItem(DATE_KEY, today);
  } catch {
    // localStorage unavailable, return current streak
  }

  return streak;
}

export function generateShareText(
  score: number,
  total: number,
  streak: number,
): string {
  const flame =
    streak >= 7
      ? "🔥".repeat(Math.min(streak, 14))
      : streak > 0
        ? `🔥 ${streak}-day streak`
        : "";
  const headline =
    score === total
      ? "I just swept the Newser daily briefing. Suspiciously well-informed."
      : score >= 3
        ? `I scored ${score}/${total} on today's Newser quiz. The news cycle didn't stand a chance.`
        : `I scored ${score}/${total} on Newser. The headlines won this round.`;

  return [headline, flame, "https://newser.app"].filter(Boolean).join(" • ");
}

export function shareScore(score: number, total: number, streak: number): void {
  const text = generateShareText(score, total, streak);

  if (navigator.share) {
    navigator.share({ text, title: "Newser Daily Briefing" }).catch(() => {
      // user cancelled or share failed, no fallback needed
    });
  } else {
    navigator.clipboard?.writeText(text).catch(() => {
      // clipboard failed
    });
  }
}
