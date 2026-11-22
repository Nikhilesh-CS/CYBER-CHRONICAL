import type { Lesson } from "../../types.ts";
import { question } from "../question.ts";

export const lesson: Lesson = {
  id: "networking",
  title: "Networking for defenders",
  summary: "Trace traffic through routes, ports and segmentation.",
  keyPoints: [
    "Ports identify communication endpoints within a transport protocol.",
    "Segmentation limits which services can communicate with each other.",
  ],
  animation: {
    template: "flow",
    steps: ["Identify endpoints", "Check the transport", "Check policy", "Verify the observed path"],
    caution: "An open port identifies reachability. It does not prove a service is vulnerable.",
  },
  quiz: {
    passThreshold: 2 / 3,
    questions: [
      question("networking-1",
        "What does a firewall rule typically control?",
        ["Whether traffic matching a policy is allowed", "What the user typed inside encrypted traffic", "Which passwords authenticate the server"], 0,
        "Rules usually use properties such as addresses, ports or application identity."),
      question("networking-2",
        "Why separate a guest network from internal systems?",
        ["To share administrator credentials", "To limit lateral access after a compromise", "To make browser certificates unnecessary"], 1,
        "Segmentation constrains which internal services a guest device can reach."),
      question("networking-3",
        "What does a TCP connection result tell you directly?",
        ["The server is fully patched", "The application data is accurate", "Whether you reached a listening endpoint"], 2,
        "Transport reachability does not establish the endpoint’s security posture."),
    ],
  },
  exercise: {
    type: "spot",
    prompt: "Guests need internet access only. Which rule matches that objective?",
    options: ["Allow guest network to all internal subnets", "Isolate guests from internal services while allowing internet access", "Give guests a shared administrator login"],
    answer: "Isolate guests from internal services while allowing internet access",
    explanation: "Allow the specific traffic needed and block access to protected services.",
  },
  newsKeywords: ["network", "firewall", "segmentation", "vpn"],
};
