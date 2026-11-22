import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "dns",
  title: "DNS and domain names",
  summary: "Understand how a browser finds the address for a domain.",
  keyPoints: [
    "DNS stores several kinds of records, including address records.",
    "Cached results can last until their time to live expires.",
  ],
  animation: {
    template: "flow",
    steps: ["Domain name", "Resolver checks its cache", "Resolver returns a record", "Browser connects"],
    caution: "DNS finds an address. HTTPS is the separate step that authenticates the connection.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("dns-1",
        "What can an A record provide?",
        ["An IPv4 address", "A TLS certificate", "An HTTP status"], 0,
        "An A record associates a name with an IPv4 address."),
      question("dns-2",
        "Why can two users see an address change at different times?",
        ["Their password managers differ", "Their DNS caches can expire at different times", "DNS permanently assigns one address to a name"], 1,
        "Different resolvers may still have cached answers with time remaining."),
      question("dns-3",
        "Does a DNS answer prove a page is legitimate?",
        ["Yes if it comes from a cache", "Yes if it resolves quickly", "No, you still need to verify the site identity"], 2,
        "An address lookup alone does not establish who operates the site."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "A domain moved servers and one laptop still reaches the previous address. Which explanation fits?",
    options: ["A cached DNS result may still be valid", "Its TLS certificate moved the server", "The web page changed its font"],
    answer: "A cached DNS result may still be valid",
    explanation: "Caches retain DNS records until their expiry.",
  },
  newsKeywords: ["dns", "domain", "dns hijack"],
};
