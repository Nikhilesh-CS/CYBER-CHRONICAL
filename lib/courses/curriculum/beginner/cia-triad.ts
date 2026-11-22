import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "cia-triad",
  title: "The CIA triad",
  summary: "Use confidentiality, integrity and availability to describe security impact.",
  keyPoints: [
    "Confidentiality limits disclosure to approved parties.",
    "Integrity protects correctness. Availability keeps systems usable for authorized users.",
  ],
  animation: {
    template: "flow",
    steps: ["Identify the asset", "Check disclosure", "Check unauthorized changes", "Check access to the service"],
    caution: "An incident can affect more than one goal.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("cia-triad-1",
        "Which goal did unauthorized disclosure affect?",
        ["Availability", "Confidentiality", "Integrity only"], 1,
        "Confidentiality concerns who can see the protected information."),
      question("cia-triad-2",
        "An intruder altered payroll records. Which goal is directly affected?",
        ["Integrity", "Availability", "Confidentiality only"], 0,
        "Unauthorized changes undermine the accuracy of records."),
      question("cia-triad-3",
        "Which concern describes a service outage?",
        ["Confidentiality", "Authentication", "Availability"], 2,
        "Legitimate users cannot access the service when they need it."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "The payroll data is intact but staff cannot access it. Which goal failed?",
    options: ["Integrity", "Availability", "Confidentiality"],
    answer: "Availability",
    explanation: "The problem is access to the service.",
  },
  newsKeywords: ["data breach", "service outage", "integrity"],
};
