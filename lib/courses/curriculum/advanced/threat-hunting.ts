import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "threat-hunting",
  title: "Defensive threat hunting",
  summary: "Test a hypothesis with scoped evidence and record what you learn.",
  keyPoints: [
    "Threat hunting starts with a testable hypothesis and observable evidence.",
    "An unusual result can have benign causes. Validate before escalating.",
  ],
  animation: {
    template: "flow",
    steps: ["Choose a hypothesis", "Identify available telemetry", "Compare with normal behavior", "Triage and document"],
    caution: "Work only with data and systems you are authorized to examine.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("threat-hunting-1",
        "What makes a hunt hypothesis useful?",
        ["It names a behavior observable in available telemetry", "It assumes every anomaly is malicious", "It requires a particular tool brand"], 0,
        "A testable hypothesis connects a behavior to measurable evidence."),
      question("threat-hunting-2",
        "What should you do when a rare transaction is detected?",
        ["Treat rarity as proof of compromise", "Compare it with expected behavior and corroborate it", "Delete it from the investigation"], 1,
        "Rarity is a lead. Context and independent evidence determine its significance."),
      question("threat-hunting-3",
        "No match was found in incomplete logs. What can you conclude?",
        ["The system was definitely secure", "The hypothesis is impossible", "The available data did not show a matching event"], 2,
        "Missing visibility limits the strength of a negative conclusion."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A behavior appears only after a legitimate software rollout. What should you check?",
    options: ["Whether authorized rollout records explain the activity", "Whether the alert text is bold", "Whether the system has a battery"],
    answer: "Whether authorized rollout records explain the activity",
    explanation: "A documented change may explain otherwise unusual activity.",
  },
  newsKeywords: ["threat hunting", "telemetry", "endpoint detection", "threat intelligence"],
};
