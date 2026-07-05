import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStreak,
  recordPlay,
  generateShareText,
  shareScore,
} from "./streaks";

const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

let writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: writeTextMock },
  writable: true,
});

describe("getStreak", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("returns 0 when no streak data exists", () => {
    expect(getStreak()).toBe(0);
  });

  it("returns the stored streak count", () => {
    store.set("newser-streak-count", "3");
    expect(getStreak()).toBe(3);
  });
});

describe("recordPlay", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("starts a streak at 1 on first play", () => {
    const streak = recordPlay();
    expect(streak).toBe(1);
    expect(getStreak()).toBe(1);
  });

  it("increments streak when played on consecutive days", () => {
    // Set up: yesterday's date and streak of 2
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yyyy = yesterday.getUTCFullYear();
    const mm = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(yesterday.getUTCDate()).padStart(2, "0");
    store.set("newser-last-play-date", `${yyyy}-${mm}-${dd}`);
    store.set("newser-streak-count", "2");

    const streak = recordPlay();
    expect(streak).toBe(3);
    expect(getStreak()).toBe(3);
  });

  it("resets streak to 1 when a day is missed", () => {
    // Set up: a date from 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    const yyyy = threeDaysAgo.getUTCFullYear();
    const mm = String(threeDaysAgo.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(threeDaysAgo.getUTCDate()).padStart(2, "0");
    store.set("newser-last-play-date", `${yyyy}-${mm}-${dd}`);
    store.set("newser-streak-count", "5");

    const streak = recordPlay();
    expect(streak).toBe(1);
    expect(getStreak()).toBe(1);
  });

  it("does not increment when played again on the same day", () => {
    // First play today
    recordPlay();
    expect(getStreak()).toBe(1);

    // Play again today — streak should not change
    const streak = recordPlay();
    expect(streak).toBe(1);
    expect(getStreak()).toBe(1);
  });
});

describe("generateShareText", () => {
  it("includes score and streak", () => {
    const text = generateShareText(4, 5, 3);
    expect(text).toContain("4/5");
    expect(text).toContain("3-day streak");
  });

  it("uses perfect-score message when score equals total", () => {
    const text = generateShareText(5, 5, 1);
    expect(text).toContain("swept");
  });

  it("handles zero streak gracefully", () => {
    const text = generateShareText(2, 5, 0);
    expect(text).not.toContain("0-day");
  });
});

describe("shareScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to clipboard when navigator.share is unavailable", () => {
    const originalShare = navigator.share;
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
    });

    shareScore(3, 5, 2);
    expect(writeTextMock).toHaveBeenCalled();

    Object.defineProperty(navigator, "share", {
      value: originalShare,
      writable: true,
    });
  });
});
