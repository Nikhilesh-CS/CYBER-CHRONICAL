import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "https",
  title: "HTTPS and trust",
  summary: "Understand the protections and limits of TLS.",
  keyPoints: [
    "TLS helps protect the connection from interception and tampering.",
    "Certificates associate a public key with a verified domain name.",
  ],
  animation: {
    template: "flow",
    steps: ["Browser requests HTTPS", "Server sends certificate", "Browser verifies identity", "Traffic is encrypted"],
    caution: "HTTPS does not establish that a merchant or other website is honest.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("https-1",
        "What does TLS protect between browser and server?",
        ["Traffic confidentiality and integrity", "The server’s database backups", "The accuracy of text on the page"], 0,
        "TLS protects the connection and authenticates its endpoints where configured."),
      question("https-2",
        "What should you do when the browser reports an unexpected certificate mismatch?",
        ["Continue if the page looks familiar", "Stop and verify the domain or contact the operator", "Disable HTTPS on the device"], 1,
        "A mismatch means the connection identity failed verification."),
      question("https-3",
        "Can a phishing site have a valid certificate?",
        ["Only if it has no login form", "No, certificates verify business reputation", "Yes, a lookalike domain can get its own certificate"], 2,
        "The certificate can correctly identify a domain that is itself malicious."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "You see a padlock on an unfamiliar billing domain. What can you conclude?",
    options: ["Traffic to that domain is protected", "The bill is legitimate", "The domain belongs to the company you expected"],
    answer: "Traffic to that domain is protected",
    explanation: "The padlock describes the connection, not the truth of the request.",
  },
  newsKeywords: ["https", "tls", "certificate"],
};
