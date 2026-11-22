import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "linux",
  title: "Linux for safer administration",
  summary: "Read ownership and permissions before changing an environment.",
  keyPoints: [
    "Linux file permissions distinguish the owner, group and others.",
    "Processes run with the permissions of their account and any configured capabilities.",
  ],
  animation: {
    template: "flow",
    steps: ["Identify the account", "Check file ownership", "Check requested access", "Apply the minimum permission"],
    caution: "Fix ownership or the minimum needed access before broadening permissions.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("linux-1",
        "Who normally has the broadest operating-system privileges?",
        ["A read-only auditor", "The root account", "The file’s group regardless of permissions"], 1,
        "Root is the administrative user on conventional Linux systems."),
      question("linux-2",
        "What does the executable bit mean for a regular file?",
        ["The file is encrypted", "Its group is the owner", "Permitted users can request to execute it"], 2,
        "Execution permission controls whether the system can run a regular file as a program."),
      question("linux-3",
        "Which permission change is the best default?",
        ["Grant access only to the account or group that needs it", "Make every file writable by everyone", "Run the service as root to avoid permission errors"], 0,
        "Least privilege reduces accidental and malicious changes."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "Your service needs to read its configuration. Which grant is sufficient?",
    options: ["World write", "Read access for the service account", "Root access for all users"],
    answer: "Read access for the service account",
    explanation: "Give the application only the access its operation requires.",
  },
  newsKeywords: ["linux", "permissions", "root privilege"],
};
