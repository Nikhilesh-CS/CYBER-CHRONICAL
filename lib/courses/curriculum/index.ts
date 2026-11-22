import type { Course } from "../types.ts";
import { lesson as clientsServers } from "./beginner/clients-servers.ts";
import { lesson as dns } from "./beginner/dns.ts";
import { lesson as ciaTriad } from "./beginner/cia-triad.ts";
import { lesson as passwords } from "./beginner/passwords.ts";
import { lesson as phishing } from "./beginner/phishing.ts";
import { lesson as malware } from "./beginner/malware.ts";
import { lesson as https } from "./intermediate/https.ts";
import { lesson as sqli } from "./intermediate/sqli.ts";
import { lesson as networking } from "./intermediate/networking.ts";
import { lesson as owasp } from "./intermediate/owasp.ts";
import { lesson as linux } from "./intermediate/linux.ts";
import { lesson as symmetric } from "./advanced/symmetric.ts";
import { lesson as publicKey } from "./advanced/public-key.ts";
import { lesson as responseCycle } from "./advanced/response-cycle.ts";
import { lesson as threatHunting } from "./advanced/threat-hunting.ts";
import { lesson as patchPriority } from "./advanced/patch-priority.ts";

export const COURSE_PATH: Course = {
  id: "cyber-academy",
  title: "Cyber Academy",
  description: "A guided path from internet basics to incident response.",
  tiers: [
    {
      id: "beginner",
      title: "Beginner",
      summary: "Build the foundations.",
      modules: [
        { id: "internet", title: "How the internet works", summary: "Follow a request and find the address it needs.",
          lessons: [clientsServers, dns] },
        { id: "security", title: "Security essentials", summary: "Protect accounts and spot suspicious activity.",
          lessons: [ciaTriad, passwords, phishing, malware] },
      ],
    },
    {
      id: "intermediate",
      title: "Intermediate",
      summary: "Review common risks and choose preventive controls.",
      modules: [
        { id: "web", title: "Web security", summary: "Protect connections, data access and database queries.",
          lessons: [https, sqli, owasp] },
        { id: "systems", title: "Networks and systems", summary: "Plan access to networks, files and processes.",
          lessons: [networking, linux] },
      ],
    },
    {
      id: "advanced",
      title: "Advanced",
      summary: "Apply evidence to defensive decisions.",
      modules: [
        { id: "crypto", title: "Cryptography", summary: "Choose the right protection and verify key identity.",
          lessons: [symmetric, publicKey] },
        { id: "response", title: "Defensive operations", summary: "Investigate signals and prioritize remediation.",
          lessons: [responseCycle, threatHunting, patchPriority] },
      ],
    },
  ],
};

export const ACADEMY_LESSONS = COURSE_PATH.tiers.flatMap((tier) => tier.modules.flatMap((module) => module.lessons));
