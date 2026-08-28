import type { RealIntelligenceItem } from "./news.ts";

export function plainTitle(item: RealIntelligenceItem) {
  if (item.metadata?.type === "cyber" && item.metadata.identifier) {
    return item.title.replace(`${item.metadata.identifier}: `, "");
  }
  return item.title.replace(/^CC-[A-Z0-9]+:\s*/, "");
}

export function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function categorySlug(category: string): string {
  return category.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and");
}

export type Domain =
  | "Cybersecurity"
  | "AI & Technology"
  | "Business"
  | "World"
  | "India"
  | "Science"
  | "Space";

export const domains: Domain[] = [
  "Cybersecurity",
  "AI & Technology",
  "Business",
  "World",
  "India",
  "Science",
  "Space"
];

export type IntelligenceType =
  | "Official Advisory"
  | "Threat Intelligence"
  | "Incident"
  | "Vulnerability"
  | "Data Breach"
  | "Research"
  | "Industry News"
  | "General News";

export const intelligenceTypes: IntelligenceType[] = [
  "Official Advisory",
  "Threat Intelligence",
  "Incident",
  "Vulnerability",
  "Data Breach",
  "Research",
  "Industry News",
  "General News"
];

export function computeDomain(item: RealIntelligenceItem): Domain {
  const text = plainTitle(item).toLowerCase();
  if (item.region === "india" || /\b(india|indian|delhi|mumbai|bangalore|narendra modi|rupee|cert-in|rbi|sebi|pib|isro)\b/.test(text)) {
    return "India";
  }
  if (/\b(science|scientific|physics|chemistry|biology|discovery|experiment)\b/.test(text)) {
    return "Science";
  }
  if (/\b(space|nasa|esa|spacex|satellite|orbit|moon|mars|lunar|galaxy|telescope)\b/.test(text)) {
    return "Space";
  }
  if (/\b(ai|artificial intelligence|machine learning|openai|gemini|llm|chatgpt|model)\b/.test(text)) {
    return "AI & Technology";
  }
  if (/\b(cyber|ransomware|malware|phishing|breach|hack|vulnerability|exploit|security)\b/.test(text)) {
    return "Cybersecurity";
  }
  if (/\b(company|business|enterprise|bank|startup|funding|revenue|ceo|industry)\b/.test(text)) {
    return "Business";
  }
  return "World";
}

export function computeIntelligenceType(item: RealIntelligenceItem): IntelligenceType {
  const text = plainTitle(item).toLowerCase();
  
  if (item.verificationStatus === "official" || /\b(advisory|patch|security update)\b/.test(text)) {
    return "Official Advisory";
  }
  if (/\b(vulnerabilit|exploit|zero-day|cve-)\b/.test(text)) {
    return "Vulnerability";
  }
  if (/\b(breach|leak|personal data|stolen data|exposed data)\b/.test(text)) {
    return "Data Breach";
  }
  if (/\b(ransomware|attack|incident|hacked|compromise)\b/.test(text)) {
    return "Incident";
  }
  if (/\b(threat|campaign|apt|botnet|malware|trojan|spyware|actor|research)\b/.test(text)) {
    return "Threat Intelligence";
  }
  if (/\b(study|report|analysis|paper)\b/.test(text)) {
    return "Research";
  }
  if (/\b(acquisition|merger|startup|funding|industry|market)\b/.test(text)) {
    return "Industry News";
  }
  return "General News";
}

export function intelligencePriority(item: RealIntelligenceItem): number {
  let score = 0;
  
  if (item.metadata?.type === "cyber") {
    switch (item.metadata.severity) {
      case "Critical": score += 40; break;
      case "High": score += 30; break;
      case "Medium": score += 20; break;
      case "Low": score += 10; break;
    }
  }

  if (item.verificationStatus === "official") {
    score += 30;
  }

  score += Math.min(item.independentSourceCount * 10, 30);

  if (item.confidence === "High") {
    score += 20;
  } else if (item.confidence === "Medium") {
    score += 10;
  }

  const hoursOld = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld < 24) {
    score += Math.max(0, 30 - hoursOld);
  }

  const domain = computeDomain(item);
  if (domain === "Cybersecurity") score += 10;
  
  return score;
}

export function breakingScore(item: RealIntelligenceItem, now = Date.now(), corroborationVelocity = 0): number {
  const publishedAt = Date.parse(item.publishedAt);
  if (!Number.isFinite(publishedAt)) return 0;
  const ageMinutes = Math.max(0, (now - publishedAt) / 60_000);
  if (ageMinutes > 120) return 0;

  const severity = item.metadata?.type === "cyber" ? item.metadata.severity : "Unknown";
  const severityWeight = severity === "Critical" ? 55 : severity === "High" ? 42 : severity === "Medium" ? 24 : 0;
  const recencyWeight = 35 * Math.pow(0.5, ageMinutes / 90);
  const officialWeight = item.verificationStatus === "official" ? 15 : 0;
  const corroborationWeight = Math.min(item.independentSourceCount * 4, 12) + Math.min(corroborationVelocity * 8, 16);
  return severityWeight + recencyWeight + officialWeight + corroborationWeight;
}

export function isBreakingStory(item: RealIntelligenceItem, now = Date.now(), corroborationVelocity = 0) {
  return breakingScore(item, now, corroborationVelocity) >= 70;
}

export function verificationLabel(item: RealIntelligenceItem) {
  if (item.verificationStatus === "official") return "Official source";
  if (item.verificationStatus === "corroborated") return `${item.independentSourceCount} sources confirm`;
  return "Developing story";
}

export function simpleSummary(item: RealIntelligenceItem) {
  if (item.studentSummary) return item.studentSummary;
  return `${item.primaryPublisher} published an update about ${plainTitle(item)}. The details are being reviewed against the available evidence.`;
}

export function whyItMatters(item: RealIntelligenceItem) {
  const type = computeIntelligenceType(item);
  const copy: Partial<Record<IntelligenceType, string>> = {
    "Official Advisory": "Security weaknesses can put devices or business systems at risk if affected software is left unpatched.",
    "Data Breach": "Exposed personal information can be used for fraud, phishing, impersonation, or unwanted account access.",
    "Incident": "Cyber incidents can spread across borders quickly, affecting services, supply chains, and people far from the original event.",
    "Threat Intelligence": "Changes in widely used technology can create new security risks and alter how defenders and attackers operate.",
    "Vulnerability": "Security weaknesses can put devices or business systems at risk if affected software is left unpatched."
  };
  return copy[type] ?? "This is among the most recent significant developments in the cybersecurity news cycle.";
}

export type GuidanceLevel = "safe" | "watch" | "act" | "urgent";

export function readerGuidance(item: RealIntelligenceItem): readonly (readonly [string, string, GuidanceLevel])[] {
  const type = computeIntelligenceType(item);
  if (type === "Official Advisory" || type === "Vulnerability") {
    return [
      ["Home users", "Keep devices updated and check whether the named product is installed.", "watch"],
      ["Small businesses", "Ask your IT provider to review affected versions and official patch guidance.", "act"],
      ["Large organisations", "Confirm exposure, prioritise official remediation, and monitor for suspicious activity.", "urgent"],
    ] as const;
  }
  if (type === "Data Breach") {
    return [
      ["Home users", "Watch for direct notices from the organisation and be alert for follow-up phishing.", "watch"],
      ["Small businesses", "Check whether staff, customers, or suppliers use the affected service.", "watch"],
      ["Large organisations", "Review third-party exposure and prepare identity-protection guidance if needed.", "act"],
    ] as const;
  }
  return [
    ["Home users", "No immediate action unless you use a product or service named in the story.", "safe"],
    ["Small businesses", "Review the source and decide whether the development affects your systems or staff.", "watch"],
    ["Large organisations", "Track the story as it develops and validate relevance through official channels.", "watch"],
  ] as const;
}

export function practicalActions(item: RealIntelligenceItem) {
  if (item.verificationStatus === "official") {
    return [
      "Open the official advisory and check the affected products or versions.",
      "Install approved security updates or follow the vendor's mitigation guidance.",
      "Ask an IT professional for help if you are unsure whether the notice applies to you.",
    ];
  }
  return [
    "Read the linked evidence before sharing or acting on the headline.",
    "Look for a direct statement from the affected company, vendor, or public authority.",
    "Keep devices updated and remain cautious of messages that exploit breaking news.",
  ];
}

export type SourceGroup =
  | "OFFICIAL / GOVERNMENT"
  | "THREAT INTELLIGENCE & SECURITY RESEARCH"
  | "CYBERSECURITY NEWS"
  | "TECHNOLOGY & AI"
  | "SCIENCE & SPACE"
  | "WORLD / GENERAL NEWS";

export function computeSourceGroup(source: { trustTier: number; authority: string; categories: string[]; name: string }): SourceGroup {
  const auth = source.authority.toLowerCase();
  const name = source.name.toLowerCase();
  const cats = source.categories || [];

  if (source.trustTier === 1 || auth.includes("government") || auth.includes("official authority")) {
    return "OFFICIAL / GOVERNMENT";
  }

  if (cats.includes("cyber") && (auth.includes("research") || auth.includes("intelligence") || auth.includes("security") || name.includes("research") || name.includes("intelligence") || name.includes("labs"))) {
    return "THREAT INTELLIGENCE & SECURITY RESEARCH";
  }

  if (cats.includes("cyber")) {
    return "CYBERSECURITY NEWS";
  }

  if (cats.includes("technology") || cats.includes("ai")) {
    return "TECHNOLOGY & AI";
  }

  if (cats.includes("science") || cats.includes("space")) {
    return "SCIENCE & SPACE";
  }

  return "WORLD / GENERAL NEWS";
}
