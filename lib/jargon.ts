import type { RealIntelligenceItem } from "./news";
import { plainTitle } from "./editorial";

export type JargonEntry = {
  term: string;
  simple: string;
  example: string;
  matches: RegExp;
};

export const JARGON_DICTIONARY: JargonEntry[] = [
  {
    term: "Rogue AI agent",
    simple: "An AI program acting outside the rules it was given, either because it was misused, compromised, or given too much freedom.",
    example: "It might access files or send information that it was never supposed to touch.",
    matches: /\brogue ai agents?\b/i,
  },
  {
    term: "AI agent",
    simple: "An AI program that can take actions, use tools, or complete tasks instead of only answering questions.",
    example: "An agent might open files, run software, or make changes on a user's behalf.",
    matches: /\bai agents?\b/i,
  },
  {
    term: "Exploit",
    simple: "A method attackers use to take advantage of a weakness in software.",
    example: "It is like finding a broken lock and using it to get through the door.",
    matches: /\bexploits?|exploited|weaponize[ds]?\b/i,
  },
  {
    term: "Zero-day",
    simple: "A software weakness that defenders had no patch for when attackers discovered or used it.",
    example: "The vendor has had zero days to fix the problem before it becomes a threat.",
    matches: /\bzero.days?\b/i,
  },
  {
    term: "Vulnerability",
    simple: "A weakness or mistake in software that could make an attack possible.",
    example: "Think of it as a faulty lock that needs to be repaired with an update.",
    matches: /\bvulnerabilit(?:y|ies)|\bflaws?\b/i,
  },
  {
    term: "Sandbox escape",
    simple: "A program breaks out of the restricted area designed to contain it.",
    example: "Code meant to stay in one safe room gets access to the rest of the computer.",
    matches: /\bsandbox escape\b/i,
  },
  {
    term: "Slopsquatting",
    simple: "Attackers create malicious software packages using names that AI tools have invented by mistake.",
    example: "A developer follows an AI suggestion, installs the fake package, and may install malware too.",
    matches: /\bslopsquatting\b/i,
  },
  {
    term: "ClickFix",
    simple: "A trick that tells someone to copy and run a command as a supposed fix, but the command installs malware.",
    example: "A fake warning may ask you to press Windows+R and paste a command.",
    matches: /\bclickfix\b/i,
  },
  {
    term: "C2 (command and control)",
    simple: "The hidden communication channel attackers use to send instructions to an infected device.",
    example: "It works like a remote control for malware.",
    matches: /\bc2\b|command.and.control/i,
  },
  {
    term: "RAT",
    simple: "Remote access malware that lets an attacker control a device from somewhere else.",
    example: "An attacker may use it to view files, run commands, or spy on activity.",
    matches: /\brat\b|remote access trojan/i,
  },
  {
    term: "Ransomware",
    simple: "Malware that locks files or systems and demands payment.",
    example: "A business may lose access to its data until it restores a safe backup.",
    matches: /\bransomware\b/i,
  },
  {
    term: "Phishing",
    simple: "A fake message or website designed to make someone reveal information or install something harmful.",
    example: "A fake sign-in page may steal the password entered into it.",
    matches: /\bphish(?:ing|ed|ers?)?\b/i,
  },
  {
    term: "Privilege escalation",
    simple: "A user or program gains more control over a computer than it should have.",
    example: "A normal account finds a way to become an administrator.",
    matches: /\bprivilege escalation\b|\broot access\b|\bgives?.{0,18}\broot\b/i,
  },
  {
    term: "Supply-chain attack",
    simple: "Attackers compromise software or a supplier so they can reach the people who trust and use it.",
    example: "A poisoned update or package can spread the attack to many customers.",
    matches: /\bsupply.chain\b|\btrojanized\b/i,
  },
];

export function jargonFor(item: RealIntelligenceItem) {
  const title = plainTitle(item);
  const matches = JARGON_DICTIONARY.filter((entry) => entry.matches.test(title));
  const withoutDuplicateAiAgent = matches.filter(
    (entry) => entry.term !== "AI agent" || !matches.some((candidate) => candidate.term === "Rogue AI agent"),
  );
  return withoutDuplicateAiAgent.slice(0, 4);
}
