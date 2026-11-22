import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "clients-servers",
  title: "Clients, servers and requests",
  summary: "Follow a web request from a browser to a server and back.",
  keyPoints: [
    "An HTTP response contains a status code and may include headers and a body.",
    "Opening one page often triggers separate requests for its resources.",
  ],
  animation: {
    template: "flow",
    steps: ["Browser prepares a request", "Server receives the request", "Server sends a response", "Browser renders the page"],
    caution: "A successful response for the page does not tell you whether every image or script loaded.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("clients-servers-1",
        "Who initiates a normal page load?",
        ["The browser", "The web server", "The DNS resolver"], 0,
        "The browser is the client. It initiates the HTTP request after it has an address and a connection."),
      question("clients-servers-2",
        "What does a 404 response mean?",
        ["The browser has no network", "The server did not find that resource", "The server rejected the TLS certificate"], 1,
        "A 404 is an HTTP response for a resource the server could not find."),
      question("clients-servers-3",
        "Why can a page load with missing images?",
        ["Images always use a different domain", "The browser skips every image on slow connections", "The image requests can fail separately"], 2,
        "The document and images are separate requests with separate results."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "The document returned 200 but one image returned 404. Which URL should you inspect?",
    options: ["The image URL", "The DNS resolver address", "The site home page only"],
    answer: "The image URL",
    explanation: "The missing image has its own URL and status.",
  },
  newsKeywords: ["http request", "browser", "web server"],
};
