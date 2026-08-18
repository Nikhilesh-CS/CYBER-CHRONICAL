import type { RealIntelligenceItem } from "./news";
import { plainTitle } from "./editorial";

export function beginnerExplanation(item: RealIntelligenceItem) {
  const title = plainTitle(item);
  const text = title.toLowerCase();

  if (/\bslopsquatting\b/.test(text)) {
    return "The report warns that AI tools can suggest software package names that do not exist. Attackers may create harmful packages with those names, hoping a developer installs one by mistake.";
  }
  if (/\bclickfix\b/.test(text)) {
    return "The report describes fake error messages that ask people to copy and run a command. The command does not fix the computer—it can install malware instead.";
  }
  if (/\bsandbox escape\b/.test(text)) {
    return "The report says code may be able to break out of the restricted area meant to contain it and reach parts of the computer that should be off-limits.";
  }
  if (/\bfake\b.*\b(?:teams|update)\b|\b(?:teams|update)\b.*\bfake\b/.test(text)) {
    return "Attackers reportedly disguised harmful software as a trusted update. Installing it could let them place malware on the computer or control it remotely.";
  }
  if (/\brogue ai agents?\b|\bai agents?\b.*\b(?:escape|hack|attack|steal|post-exploitation)\b/.test(text)) {
    return "The report says an AI program was able to take risky or unauthorised actions. The concern is that an agent with too much access could run commands, reach private data, or help an attacker.";
  }
  if (/\bprocess ghosting\b/.test(text)) {
    return "The report describes malware hiding behind a Windows process so security tools have a harder time seeing what is really running.";
  }
  if (/\btelegram\b.*\bc2\b|\bc2\b.*\btelegram\b/.test(text)) {
    return "The report says attackers used Telegram as a hidden remote-control channel for infected computers, allowing them to send instructions without running their own obvious server.";
  }
  if (/\b(?:exploit|exploited|vulnerabilit|flaw|zero.day)\b/.test(text)) {
    return "The report says researchers or attackers found a weakness in the named software. If the weakness can be used in an attack, affected users may need an official update or other vendor guidance.";
  }
  if (/\bdata breach\b|\bleak(?:ed)?\b|\bexposed\b.*\bdata\b/.test(text)) {
    return "The report concerns information that may have been viewed, stolen, or exposed without permission. People connected to the service should wait for confirmed details and watch for follow-up scams.";
  }
  if (/\bransomware\b/.test(text)) {
    return "The report concerns malware designed to lock files or systems and demand payment. Organisations should check whether they are affected and rely on verified recovery and security guidance.";
  }
  if (/\bphish|\bfake (?:website|login|message|email)\b/.test(text)) {
    return "The report describes an attempt to make people trust a fake message or website. The goal may be to steal sign-in details, money, or persuade someone to install harmful software.";
  }
  if (/\bmalware\b|\bspyware\b|\btrojan\b|\bstealer\b|\brat\b/.test(text)) {
    return "The report describes harmful software that may steal information, spy on activity, or let an attacker control a device. The exact risk depends on the affected product and how the malware is delivered.";
  }

  return `In plain English, this is a report about ${title}. Cyber Chronicle has only source metadata for this item, so open the linked evidence before treating the headline as a confirmed technical explanation.`;
}
