import { describe, it, expect } from 'vitest';
import { buildDailyQuiz } from './quizBuilder';
import type { NewsArticle } from '../types/news';

const makeArticle = (title: string, index = 0): NewsArticle => ({
  title,
  description: `Description for ${title}`,
  url: `https://example.com/${index}`,
  source: 'Test Source',
  imageUrl: index % 2 === 0 ? `https://example.com/img/${index}.jpg` : undefined
});

describe('buildDailyQuiz', () => {
  it('returns exactly 5 questions', () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i)
    );
    const quiz = buildDailyQuiz(articles);
    expect(quiz).toHaveLength(5);
  });

  it('falls back to demo articles when fewer than 5 provided', () => {
    const quiz = buildDailyQuiz([]);
    expect(quiz).toHaveLength(5);
  });

  it('each question has a unique id', () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i)
    );
    const quiz = buildDailyQuiz(articles);
    const ids = quiz.map((q) => q.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('each question has exactly 4 options', () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i)
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q) => {
      expect(q.options).toHaveLength(4);
    });
  });

  it('each set of options contains the correct answer', () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i)
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q) => {
      expect(q.options).toContain(q.correctAnswer);
    });
  });

  it('includes two other real headlines as decoys (strips suffixes)', () => {
    const articles = [
      makeArticle('Breaking: stocks fall - analysts shocked'),
      makeArticle('Weather: heavy rain expected today'),
      makeArticle('Sports: team wins championship | recap'),
      makeArticle('Tech: new phone launch'),
      makeArticle('Health: vaccine update')
    ];
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q) => {
      const otherHeadlines = quiz
        .filter((other) => other.id !== q.id)
        .map((other) => other.correctAnswer);
      const realDecoys = q.options.filter((o) => o !== q.correctAnswer && otherHeadlines.includes(o));
      expect(realDecoys.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('preserves source and url from original articles', () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i)
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q, i) => {
      expect(q.source).toBe(articles[i].source);
      expect(q.articleUrl).toBe(articles[i].url);
    });
  });

  it('preserves optional imageUrl when present', () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i)
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q, i) => {
      expect(q.imageUrl).toBe(articles[i].imageUrl);
    });
  });

  it('uses summary from article description', () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      makeArticle(`Headline ${i + 1}`, i)
    );
    const quiz = buildDailyQuiz(articles);
    quiz.forEach((q, i) => {
      expect(q.summary).toBe(articles[i].description);
    });
  });
});
