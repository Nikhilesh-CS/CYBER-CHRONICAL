import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "owasp",
  title: "Web risk and the OWASP Top 10",
  summary: "Use common web risk categories to plan preventive reviews.",
  keyPoints: [
    "The Top 10 is an awareness resource for major web application risks.",
    "Authorization must be enforced where the protected data is accessed.",
  ],
  animation: {
    template: "flow",
    steps: ["Inventory features", "Identify trust boundaries", "Review controls", "Add regression checks"],
    caution: "Use the list to prioritize reviews and pair it with written security requirements.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("owasp-1",
        "Where should the permission to access an account record be enforced?",
        ["Only in the browser menu", "In the server-side action that retrieves it", "In the help documentation"], 1,
        "The protected action must verify permissions even if a client bypasses the supplied UI."),
      question("owasp-2",
        "How should a team use the OWASP Top 10?",
        ["To select common risks for design reviews and tests", "As a complete certification", "As a replacement for threat modeling"], 0,
        "The categories support awareness and review but cannot cover every application risk."),
      question("owasp-3",
        "Which finding is an access control problem?",
        ["A label has a spelling error", "A browser uses a slow animation", "One signed-in user can view another user’s private records"], 2,
        "Authentication alone does not grant permission to view another user’s records."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A route returns private files for any logged-in account. Which check belongs in the design?",
    options: ["Check the requested resource belongs to an allowed account", "Hide the button linking to the page", "Rename the file folder"],
    answer: "Check the requested resource belongs to an allowed account",
    explanation: "Resource-level authorization protects access even when the route is known.",
  },
  newsKeywords: ["owasp", "access control", "security misconfiguration"],
};
