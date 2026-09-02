import crypto from "node:crypto";

const DEFAULT_PUBLIC_URL = "https://nikhilesh-cs.github.io/CYBER-CHRONICAL";

function publicBaseUrl() {
  const configured = process.env.CYBER_CHRONICLE_PUBLIC_URL || DEFAULT_PUBLIC_URL;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:") return DEFAULT_PUBLIC_URL;
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_PUBLIC_URL;
  }
}

function notificationImageUrl(item) {
  try {
    const image = new URL(item.imageUrl || "");
    if (image.protocol === "https:") return image.toString();
  } catch {
    // Use the branded Cyber Chronicle social card below.
  }
  return `${publicBaseUrl()}/og.png`;
}

function plainTitle(item) {
  if (item.metadata?.type === "cyber" && item.metadata.identifier) {
    return item.title.replace(`${item.metadata.identifier}: `, "");
  }
  return item.title.replace(/^CC-[A-Z0-9]+:\s*/, "");
}

function computeIntelligenceType(item) {
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

export function buildNotificationPayload(item) {
  const intelType = computeIntelligenceType(item);
  const severity = item.metadata?.type === "cyber" ? item.metadata.severity : "Unknown";
  const isCyber = item.metadata?.type === "cyber";
  const isOfficial = item.verificationStatus === "official";
  const isConfirmed = item.confidence === "High";
  
  let notificationType = "NEWS_UPDATE";
  
  if (severity === "Critical" && isCyber && (isOfficial || isConfirmed)) {
    notificationType = "CRITICAL_ALERT";
  } else if (severity === "High" && isCyber) {
    notificationType = "HIGH_ALERT";
  } else if (intelType === "Official Advisory") {
    notificationType = "SECURITY_UPDATE";
  } else if (intelType === "Threat Intelligence" || intelType === "Data Breach" || intelType === "Incident" || intelType === "Vulnerability") {
    notificationType = "INTELLIGENCE_UPDATE";
  }
  
  const titleText = plainTitle(item);
  let title = "";
  if (notificationType === "CRITICAL_ALERT") title = "🚨 Critical security alert";
  else if (notificationType === "HIGH_ALERT") title = "⚠️ High-priority security news";
  else if (notificationType === "SECURITY_UPDATE") title = "🛡️ Security update";
  else if (notificationType === "INTELLIGENCE_UPDATE") title = "🔍 Security news";
  else title = "📰 Cyber Chronicle";
  
  const bodyChunks = [titleText, `${item.primaryPublisher}${severity && severity !== "Unknown" ? ` · ${severity}` : ""}`];
  
  if (item.metadata?.type === "cyber") {
    if (item.metadata.affected) {
      bodyChunks.push(`Affects: ${item.metadata.affected}`);
    }
    if (item.metadata.action) {
      bodyChunks.push(`Next step: ${item.metadata.action}`);
    }
  }
  
  const fingerprintSource = [
    severity,
    item.verificationStatus,
    item.confidence,
    titleText,
    item.metadata?.type === "cyber" ? item.metadata.affected || "" : "",
    item.metadata?.type === "cyber" ? item.metadata.action || "" : "",
  ].join("|");
  
  const fingerprint = crypto.createHash("md5").update(fingerprintSource).digest("hex");
  
  return {
    title,
    body: bodyChunks.join("\n\n"),
    imageUrl: notificationImageUrl(item), // Every notification gets an HTTPS image.
    severity: severity || "Unknown",
    notificationType,
    intelligenceType: intelType,
    storyId: item.id,
    url: `/CYBER-CHRONICAL/?story=${encodeURIComponent(item.id)}`,
    tag: `cyber-chronicle:${item.id}`,
    fingerprint,
  };
}
