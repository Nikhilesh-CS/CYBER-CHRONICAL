import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "patch-priority",
  title: "Prioritizing vulnerability remediation",
  summary: "Combine severity, exploitation evidence and real asset exposure.",
  keyPoints: [
    "CVSS describes technical severity. EPSS estimates likelihood over a time window.",
    "CISA KEV records known exploitation. Asset exposure and vendor guidance shape the response.",
  ],
  animation: {
    template: "flow",
    steps: ["Read the advisory", "Confirm asset applicability", "Check exploitation evidence", "Plan and verify remediation"],
    caution: "A CVE mention alone does not prove that your system is affected.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("patch-priority-1",
        "What does a positive KEV match support?",
        ["Proof that your organization was breached", "Evidence of known exploitation of that vulnerability", "The probability of exploitation tomorrow"], 1,
        "KEV contains vulnerabilities for which CISA has identified evidence of exploitation."),
      question("patch-priority-2",
        "What does EPSS estimate?",
        ["The likelihood of exploitation in the next 30 days", "The technical impact score used by CVSS", "The inventory of vulnerable devices"], 0,
        "EPSS expresses a forecast and should be read with its score date."),
      question("patch-priority-3",
        "What should you check before acting on a patch?",
        ["Only which label has the brightest color", "Only whether the CVE was published recently", "Affected versions, exposure and vendor guidance"], 2,
        "Verify applicability and operational context before prioritizing remediation."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A record is in KEV but your deployed version is explicitly unaffected. What should you record?",
    options: ["The evidence supporting your version and applicability decision", "That all versions are compromised", "The EPSS value as your local exposure"],
    answer: "The evidence supporting your version and applicability decision",
    explanation: "Document the evidence that the asset is outside the advisory’s scope.",
  },
  newsKeywords: ["cve", "cvss", "epss", "kev", "vulnerability"],
};
