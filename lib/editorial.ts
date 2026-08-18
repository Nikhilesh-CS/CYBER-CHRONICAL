import type { RealIntelligenceItem } from "./news";

export type EditorialCategory =
  | "Top Stories"
  | "World Cyber News"
  | "Active Security Alerts"
  | "Company & Enterprise"
  | "Privacy & Data Breaches"
  | "Mobile & Consumer"
  | "Technology & AI";

export const categories: EditorialCategory[] = [
  "Top Stories",
  "World Cyber News",
  "Active Security Alerts",
  "Company & Enterprise",
  "Privacy & Data Breaches",
  "Mobile & Consumer",
  "Technology & AI",
];

export function plainTitle(item: RealIntelligenceItem) {
  return item.title.replace(`${item.identifier}: `, "");
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

export function editorialCategory(item: RealIntelligenceItem): EditorialCategory {
  const text = plainTitle(item).toLowerCase();
  if (item.sourceCategory === "official" || /\b(advisory|patch|vulnerabilit|exploit|zero.day|security update)\b/.test(text)) {
    return "Active Security Alerts";
  }
  if (/\b(breach|leak|privacy|personal data|stolen data|exposed|identity)\b/.test(text)) {
    return "Privacy & Data Breaches";
  }
  if (/\b(android|iphone|ios|mobile|smartphone|whatsapp|consumer|browser|extension|app)\b/.test(text)) {
    return "Mobile & Consumer";
  }
  if (/\b(ai|artificial intelligence|openai|model|cloud|github|software|technology)\b/.test(text)) {
    return "Technology & AI";
  }
  if (/\b(company|business|enterprise|bank|organisation|organization|startup|industry|ciso)\b/.test(text)) {
    return "Company & Enterprise";
  }
  return "World Cyber News";
}

export function categorySlug(category: EditorialCategory): string {
  return category.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and");
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
  const category = editorialCategory(item);
  const copy: Record<EditorialCategory, string> = {
    "Top Stories": "This is among the most recent significant developments in the cybersecurity news cycle.",
    "World Cyber News": "Cyber incidents can spread across borders quickly, affecting services, supply chains, and people far from the original event.",
    "Active Security Alerts": "Security weaknesses can put devices or business systems at risk if affected software is left unpatched.",
    "Company & Enterprise": "A major security issue at one organisation can affect employees, customers, suppliers, and connected services.",
    "Privacy & Data Breaches": "Exposed personal information can be used for fraud, phishing, impersonation, or unwanted account access.",
    "Mobile & Consumer": "This may involve devices, apps, or online services used in everyday life, so clear practical guidance matters.",
    "Technology & AI": "Changes in widely used technology can create new security risks and alter how defenders and attackers operate.",
  };
  return copy[category];
}

export type GuidanceLevel = "safe" | "watch" | "act" | "urgent";

export function readerGuidance(item: RealIntelligenceItem): readonly (readonly [string, string, GuidanceLevel])[] {
  const category = editorialCategory(item);
  if (category === "Active Security Alerts") {
    return [
      ["Home users", "Keep devices updated and check whether the named product is installed.", "watch"],
      ["Small businesses", "Ask your IT provider to review affected versions and official patch guidance.", "act"],
      ["Large organisations", "Confirm exposure, prioritise official remediation, and monitor for suspicious activity.", "urgent"],
    ] as const;
  }
  if (category === "Privacy & Data Breaches") {
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
  if (item.sourceCategory === "official") {
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
