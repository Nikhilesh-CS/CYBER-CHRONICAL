import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "phishing",
  title: "Spotting phishing",
  summary: "Verify suspicious requests through a channel you already trust.",
  keyPoints: [
    "Urgency and authority are common persuasion tactics.",
    "Use a trusted bookmark, known number or official app to verify unusual requests.",
  ],
  animation: {
    template: "flow",
    steps: ["Read the request", "Check the destination", "Verify independently", "Report or discard"],
    caution: "A familiar logo or real colleague’s name is easy to imitate.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("phishing-1",
        "A message asks for a password reset through a link. What is the safest first check?",
        ["Open the service from a known bookmark", "Reply with your username", "Trust it because it has a company logo"], 0,
        "Opening the service directly avoids following an unverified destination."),
      question("phishing-2",
        "Which part of a link most directly identifies the site?",
        ["Its display text", "Its actual registered domain", "Its leading lock icon alone"], 1,
        "The visible label can differ from the destination. Check the actual domain."),
      question("phishing-3",
        "A colleague requests a sudden bank detail change by email. What should you do?",
        ["Approve after checking the signature block", "Forward it to personal email", "Call using a known directory number"], 2,
        "An independent channel can confirm the request if an email account was compromised."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A delivery text demands a small payment today. What should you do first?",
    options: ["Follow the payment link", "Check tracking in the official carrier app", "Enter a card number to test the form"],
    answer: "Check tracking in the official carrier app",
    explanation: "The official app can verify the claim without opening the message link.",
  },
  newsKeywords: ["phish", "smish", "spoof", "clickfix"],
};
