import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "symmetric",
  title: "Symmetric encryption",
  summary: "Understand shared keys, authenticated encryption and nonce reuse.",
  keyPoints: [
    "Symmetric encryption uses a shared secret to protect and recover data.",
    "Authenticated encryption protects confidentiality and detects unauthorized modifications.",
  ],
  animation: {
    template: "flow",
    steps: ["Choose a key", "Generate a nonce", "Encrypt and authenticate", "Verify before reading"],
    caution: "Follow library nonce requirements. Reusing a nonce with the same key can break protection.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("symmetric-1",
        "What must both parties protect in a symmetric system?",
        ["The shared secret key", "Only the algorithm’s name", "The ciphertext’s filename"], 0,
        "Anyone with the shared secret can perform the operations that use that key."),
      question("symmetric-2",
        "What does authenticated encryption add?",
        ["A public hostname", "Tampering detection alongside confidentiality", "Automatic backup recovery"], 1,
        "It lets the receiver detect modifications before accepting the plaintext."),
      question("symmetric-3",
        "How should nonce uniqueness be handled?",
        ["Reuse the nonce after each restart", "Use one nonce for every message", "Follow the algorithm’s uniqueness requirements for each key"], 2,
        "Many designs require every nonce to be unique under the same key."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A library reports an invalid authentication tag. What should the receiver do?",
    options: ["Accept the decrypted bytes anyway", "Reject the message", "Send the key to the originator"],
    answer: "Reject the message",
    explanation: "The tag failure indicates the data cannot be authenticated.",
  },
  newsKeywords: ["encryption", "nonce", "cryptography"],
};
