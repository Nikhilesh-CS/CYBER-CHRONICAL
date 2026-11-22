import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "public-key",
  title: "Public-key cryptography and signatures",
  summary: "Distinguish encryption, signing and certificate trust.",
  keyPoints: [
    "A digital signature is made with a signing key and checked with a public key.",
    "The verifier still needs a trusted way to associate that key with its owner.",
  ],
  animation: {
    template: "flow",
    steps: ["Generate key pair", "Protect the private key", "Share the public key", "Verify identity and signatures"],
    caution: "A valid signature establishes integrity and authenticity relative to a trusted key.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("public-key-1",
        "Which key verifies a conventional digital signature?",
        ["The signer's public key", "The signer's private key", "The receiver's password"], 0,
        "Anyone with the authentic signing public key can check a signature."),
      question("public-key-2",
        "What happens if you verify against an attacker-controlled key?",
        ["The content is guaranteed authentic", "The verification can succeed for the wrong sender", "The browser always rejects the algorithm"], 1,
        "Cryptographic correctness cannot replace trusted key identification."),
      question("public-key-3",
        "What protection does signing alone provide?",
        ["Content secrecy", "Access control for every reader", "Integrity and authenticity for a trusted key"], 2,
        "Signatures can be verified publicly and do not hide the message."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A repository offers a public key next to an unfamiliar download. What else should you verify?",
    options: ["The public key through a trusted independent source", "The filename is short", "The download is in a ZIP archive"],
    answer: "The public key through a trusted independent source",
    explanation: "An attacker could publish both a binary and its own signing key.",
  },
  newsKeywords: ["digital signature", "public key", "certificate"],
};
