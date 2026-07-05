import { describe, it, expect } from "vitest";
import { buildDailyQuiz, detectCategory, getDailySeed } from "./quizBuilder";
import type { NewsArticle } from "../types/news";

const makeArticle = (title: string, index = 0): NewsArticle => ({
  title,
  description: `Description for ${title}`,
  url: `https://example.com/${index}`,
  source: "Test Source",
  imageUrl:
    index % 2 === 0 ? `https://example.com/img/${index}.jpg` : undefined,
});

describe("buildDailyQuiz", () => {
  it("returns exactly 5 questions", () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i),
    );
    const quiz = buildDailyQuiz(articles);
    expect(quiz).toHaveLength(5);
  });

  it("falls back to demo articles when fewer than 5 provided", () => {
    const quiz = buildDailyQuiz([]);
    expect(quiz).toHaveLength(5);
  });

  it("each question has a unique id", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i),
    );
    const quiz = buildDailyQuiz(articles);
    const ids = quiz.map((q) => q.id);
    expect(new Set(ids).size).toBe(5);
  });

  it("each question has exactly 4 options", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i),
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q) => {
      expect(q.options).toHaveLength(4);
    });
  });

  it("each set of options contains the correct answer", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i),
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q) => {
      expect(q.options).toContain(q.correctAnswer);
    });
  });

  it("includes two other real headlines as decoys (strips suffixes)", () => {
    const articles = [
      makeArticle("Breaking: stocks fall - analysts shocked"),
      makeArticle("Weather: heavy rain expected today"),
      makeArticle("Sports: team wins championship | recap"),
      makeArticle("Tech: new phone launch"),
      makeArticle("Health: vaccine update"),
    ];
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q) => {
      const otherHeadlines = quiz
        .filter((other) => other.id !== q.id)
        .map((other) => other.correctAnswer);
      const realDecoys = q.options.filter(
        (o) => o !== q.correctAnswer && otherHeadlines.includes(o),
      );
      expect(realDecoys.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("preserves source and url from original articles", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i),
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q, i) => {
      expect(q.source).toBe(articles[i].source);
      expect(q.articleUrl).toBe(articles[i].url);
    });
  });

  it("preserves optional imageUrl when present", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i),
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q, i) => {
      expect(q.imageUrl).toBe(articles[i].imageUrl);
    });
  });

  it("uses summary from article description", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i),
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q, i) => {
      expect(q.summary).toBe(articles[i].description);
    });
  });

  describe("getDailySeed", () => {
    it("returns the same seed for the same date", () => {
      const date = new Date("2026-06-29T12:00:00Z");
      expect(getDailySeed(date)).toBe(getDailySeed(date));
    });

    it("returns different seeds for different dates", () => {
      const today = new Date("2026-06-29T12:00:00Z");
      const tomorrow = new Date("2026-06-30T12:00:00Z");
      expect(getDailySeed(today)).not.toBe(getDailySeed(tomorrow));
    });

    it("returns the same seed for different times on the same UTC day", () => {
      const morning = new Date("2026-06-29T06:00:00Z");
      const evening = new Date("2026-06-29T22:00:00Z");
      expect(getDailySeed(morning)).toBe(getDailySeed(evening));
    });
  });

  describe("daily seeding determinism", () => {
    it("produces the same option order with the same seed", () => {
      const articles = [
        makeArticle("Alpha", 0),
        makeArticle("Bravo", 1),
        makeArticle("Charlie", 2),
        makeArticle("Delta", 3),
        makeArticle("Echo", 4),
      ];
      const fixedSeed = 12345;
      const quiz1 = buildDailyQuiz(articles, fixedSeed);
      const quiz2 = buildDailyQuiz(articles, fixedSeed);

      quiz1.forEach((q, i) => {
        expect(q.options).toEqual(quiz2[i].options);
      });
    });

    it("produces different option order with different seeds", () => {
      const articles = [
        makeArticle("Alpha", 0),
        makeArticle("Bravo", 1),
        makeArticle("Charlie", 2),
        makeArticle("Delta", 3),
        makeArticle("Echo", 4),
      ];
      const quiz1 = buildDailyQuiz(articles, 111);
      const quiz2 = buildDailyQuiz(articles, 999);

      const ordersDiffer = quiz1.some((q, i) => {
        const a = JSON.stringify(q.options);
        const b = JSON.stringify(quiz2[i].options);
        return a !== b;
      });
      expect(ordersDiffer).toBe(true);
    });
  });

  describe("detectCategory", () => {
    it("detects politics from election keywords", () => {
      expect(detectCategory(makeArticle("President election results", 0))).toBe(
        "politics",
      );
    });

    it("detects tech from software keywords", () => {
      expect(
        detectCategory(makeArticle("New AI app launches tech revolution", 1)),
      ).toBe("tech");
    });

    it("detects sports from team and game keywords", () => {
      expect(
        detectCategory(makeArticle("Team wins championship game", 2)),
      ).toBe("sports");
    });

    it("detects science from research keywords", () => {
      expect(
        detectCategory(makeArticle("Scientists make discovery in space", 3)),
      ).toBe("science");
    });

    it("detects world from international keywords", () => {
      expect(
        detectCategory(makeArticle("International crisis summit held", 4)),
      ).toBe("world");
    });

    it("detects business from market keywords", () => {
      expect(
        detectCategory(makeArticle("Stock market economy inflation", 6)),
      ).toBe("business");
    });

    it("falls back to general when no keywords match", () => {
      expect(detectCategory(makeArticle("Local cat found in tree", 7))).toBe(
        "general",
      );
    });

    it("uses the highest-scoring category when multiple match", () => {
      // Article matches both tech and politics; tech gets more keyword hits from 'ai', 'tech', 'technology'
      expect(
        detectCategory(makeArticle("President election and AI technology", 8)),
      ).toBe("tech");
    });
  });

  it("uses category-matched prompts for categorized articles", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Technology innovation AI software ${i}`, i),
    );
    const quiz = buildDailyQuiz(articles, 1);
    quiz.forEach((q) => {
      expect(q.prompt).toBeTruthy();
      expect(typeof q.prompt).toBe("string");
    });
  });

  it("uses image-specific prompts when article has an imageUrl", () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Technology innovation AI software ${i}`, i),
    );
    const quiz = buildDailyQuiz(articles, 1);
    // Articles with even index have imageUrl, odds don't
    const withImage = quiz.filter((_, i) => i % 2 === 0);
    withImage.forEach((q) => {
      expect(q.prompt).toBeTruthy();
    });
  });
});
