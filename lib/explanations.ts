import type { RealIntelligenceItem } from "./news.ts";
import { plainTitle } from "./editorial.ts";

export function beginnerExplanation(item: RealIntelligenceItem) {
  const title = plainTitle(item);
  const text = title.toLowerCase();
  const summary = item.summary.trim();
  const hasPublisherSummary = Boolean(summary)
    && !/^source metadata only\b/i.test(summary)
    && !/^the publisher did not include a usable summary\b/i.test(summary);
  const sourceContext = hasPublisherSummary
    ? ` ${item.primaryPublisher}'s feed summary says: ${summary}`
    : " The available feed metadata does not contain enough detail for a reliable explanation, so open the original source for context.";

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

  if (/\b(?:spacecraft|satellite|rocket|launch|mission|astronaut|moon|mars|orbit)\b/.test(text) || item.categories.includes("space")) {
    return `This is a space update about a mission, launch, spacecraft, or new observation.${sourceContext}`;
  }
  if (/\b(?:study|researchers?|scientists?|discovery|experiment|evidence)\b/.test(text) || item.categories.includes("science")) {
    return `This is a science update about research or new evidence. A single report may describe early findings rather than a settled conclusion.${sourceContext}`;
  }
  if (/\b(?:health|disease|virus|vaccine|hospital|medicine|patient)\b/.test(text) || item.categories.includes("health")) {
    return `This is a health update. It may affect public guidance, medical research, or healthcare services; use the linked source for the exact scope.${sourceContext}`;
  }
  if (/\b(?:climate|weather|pollution|emission|environment|wildlife)\b/.test(text) || item.categories.includes("environment")) {
    return `This is an environment update about conditions, policy, or scientific evidence that may affect people or ecosystems.${sourceContext}`;
  }
  if (/\b(?:election|government|minister|parliament|court|law|policy)\b/.test(text) || item.categories.includes("politics")) {
    return `This is a public-affairs update about a government decision, political event, law, or institution.${sourceContext}`;
  }
  if (/\b(?:company|market|economy|economic|business|funding|acquisition|merger)\b/.test(text) || item.categories.includes("business") || item.categories.includes("markets")) {
    return `This is a business or markets update. It may concern a company decision, the economy, investment, or industry conditions.${sourceContext}`;
  }
  if (item.categories.includes("education")) {
    return `This is an education update about students, institutions, policy, or learning.${sourceContext}`;
  }
  if (item.categories.includes("sports")) {
    return `This is a sports update about a competition, team, athlete, or sporting organisation.${sourceContext}`;
  }
  if (item.categories.includes("entertainment")) {
    return `This is an entertainment update about media, culture, or the people and organisations involved.${sourceContext}`;
  }
  if (item.categories.includes("india")) {
    return `This is an India-focused public update.${sourceContext}`;
  }
  if (item.categories.includes("world")) {
    return `This is an international news update.${sourceContext}`;
  }

  if (hasPublisherSummary) {
    return `Cyber Chronicle does not have enough verified context to simplify this story without guessing. ${item.primaryPublisher}'s feed summary says: ${summary}`;
  }
  return "Cyber Chronicle cannot produce a reliable plain-language explanation from the available feed metadata. Open the linked source for the publisher's full context.";
}
