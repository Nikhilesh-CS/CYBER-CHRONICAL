import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "sqli",
  title: "Defending database queries",
  summary: "Keep untrusted input separate from database instructions.",
  keyPoints: [
    "Parameterized queries send input as values separate from the query structure.",
    "Use a database role with the minimum permissions the feature requires.",
  ],
  animation: {
    template: "flow",
    steps: ["Receive user input", "Choose a fixed query", "Bind typed values", "Run with limited permissions"],
    caution: "Input validation helps data quality. A fixed query with bound parameters protects the command structure.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("sqli-1",
        "Which approach keeps user input from changing query structure?",
        ["Concatenating validated text into a command", "Using bound parameters", "Hiding database errors alone"], 1,
        "Bound parameters treat input as data alongside a fixed command."),
      question("sqli-2",
        "Why use a restricted database role?",
        ["It hides the site hostname", "It makes every command safe automatically", "It limits the impact if a flaw remains"], 2,
        "Permissions constrain the actions the application can perform."),
      question("sqli-3",
        "What should a regression test check?",
        ["The input is stored as data and no extra operations occur", "The browser always reloads after submission", "Every typed value is rewritten as HTML"], 0,
        "Assert both the intended result and the absence of unexpected side effects."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A search feature builds commands from raw user text. Which change addresses the design flaw?",
    options: ["Log less", "Separate the command from its bound values", "Change the search button color"],
    answer: "Separate the command from its bound values",
    explanation: "Parameterization enforces the boundary between code and data.",
  },
  newsKeywords: ["sql injection", "parameterized query", "database"],
};
