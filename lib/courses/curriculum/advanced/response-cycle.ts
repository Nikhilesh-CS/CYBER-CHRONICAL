import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "response-cycle",
  title: "Incident response from detection to recovery",
  summary: "Coordinate containment, evidence and restoration.",
  keyPoints: [
    "Separate evidence collection from decisions about recovery.",
    "Track what was observed, who changed what and when.",
  ],
  animation: {
    template: "flow",
    steps: ["Validate the signal", "Contain impact", "Remove the cause", "Restore and monitor"],
    caution: "Escalate through your authorized process. An uncoordinated reset can erase evidence.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("response-cycle-1",
        "What is the immediate purpose of containment?",
        ["To prove attribution", "To limit the incident’s spread or impact", "To publish the final report"], 1,
        "Containment reduces exposure while investigation and recovery continue."),
      question("response-cycle-2",
        "Which record supports a reliable incident timeline?",
        ["An unverified account of events", "A list of applications only", "Timestamped observations and actions with provenance"], 2,
        "A traceable timeline lets responders distinguish evidence from assumptions."),
      question("response-cycle-3",
        "When should restored systems be returned to service?",
        ["After checks confirm trustworthy operation", "Before examining the cause", "As soon as the alert disappears"], 0,
        "Recovery includes validating integrity and monitoring for recurrences."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "An alert suggests an affected endpoint is exposing internal services. Which goal comes first?",
    options: ["Contain the exposure through the authorized process", "Delete all logs", "Publish a detailed report"],
    answer: "Contain the exposure through the authorized process",
    explanation: "Containment limits further harm while evidence is preserved.",
  },
  newsKeywords: ["incident", "response", "forensic", "recovery"],
};
