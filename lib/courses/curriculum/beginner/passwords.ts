import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "passwords",
  title: "Passwords, passkeys and MFA",
  summary: "Protect an account from reused credentials and misleading sign-in prompts.",
  keyPoints: [
    "A password manager makes it practical to use a unique password per service.",
    "Passkeys bind authentication to the site origin and help resist credential phishing.",
  ],
  animation: {
    template: "flow",
    steps: ["Create a unique credential", "Store it securely", "Enable a second factor", "Keep recovery codes safe"],
    caution: "Unexpected approval prompts should be denied and checked through the official service.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("passwords-1",
        "Why use a unique password for every account?",
        ["It makes backups faster", "It limits damage from password reuse", "It removes the need for recovery"], 1,
        "A stolen credential from one service cannot be reused directly at another."),
      question("passwords-2",
        "What should you do with an MFA prompt you did not start?",
        ["Approve it to clear the prompt", "Share the code with support", "Deny it and check through the official service"], 2,
        "An unexpected prompt can indicate that someone has your password."),
      question("passwords-3",
        "What makes passkeys resistant to lookalike domains?",
        ["The credential is bound to the site origin", "The same secret is sent to every site", "Every passkey uses a text code"], 0,
        "The authenticator signs only for the registered site identity."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A site you used was breached. Which accounts should you consider at immediate risk?",
    options: ["Any account where you reused its password", "Only accounts on the same phone", "Every account with a passkey"],
    answer: "Any account where you reused its password",
    explanation: "Reuse enables a leaked password to work on otherwise unrelated sites.",
  },
  newsKeywords: ["password", "passkey", "mfa", "credential"],
};
