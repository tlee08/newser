import { describe, it, expect, vi } from "vitest";
import { generateLLMQuiz } from "./llmQuiz";
import type { NewsArticle } from "../types/news";

describe("generateLLMQuiz", () => {
  it("returns empty array when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("Network error"))),
    );
    const result = await generateLLMQuiz([]);
    expect(result).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("returns empty array on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await generateLLMQuiz([]);
    expect(result).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("maps article metadata correctly by index", async () => {
    const articles: NewsArticle[] = [
      {
        title: "A1",
        description: "D1",
        url: "u1",
        source: "S1",
        imageUrl: "img1",
      },
      {
        title: "A2",
        description: "D2",
        url: "u2",
        source: "S2",
        imageUrl: "img2",
      },
    ];

    const mockQuiz = [
      {
        id: "0",
        prompt: "P1",
        correctAnswer: "C1",
        options: ["a", "b", "c", "d"],
        summary: "Sum1",
      },
      {
        id: "1",
        prompt: "P2",
        correctAnswer: "C2",
        options: ["a", "b", "c", "d"],
        summary: "Sum2",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ quiz: mockQuiz }),
      }),
    );

    const result = await generateLLMQuiz(articles);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("S1");
    expect(result[0].articleUrl).toBe("u1");
    expect(result[0].imageUrl).toBe("img1");
    expect(result[1].source).toBe("S2");
    expect(result[1].articleUrl).toBe("u2");
    expect(result[1].imageUrl).toBe("img2");
    vi.unstubAllGlobals();
  });
});
