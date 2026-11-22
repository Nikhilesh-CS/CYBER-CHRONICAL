import type { QuizQuestion } from "../types.ts";

export function question(id: string, prompt: string, labels: [string, string, string], answer: 0 | 1 | 2, explanation: string): QuizQuestion {
  const options = labels.map((label, index) => ({ id: String(index), label }));
  return { id, prompt, options, correctId: String(answer), explanation };
}
