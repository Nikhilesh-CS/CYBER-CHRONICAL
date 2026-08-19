import crypto from "node:crypto";

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
  if (notificationType === "CRITICAL_ALERT") title = "🚨 CRITICAL SECURITY ALERT";
  else if (notificationType === "HIGH_ALERT") title = "⚠️ HIGH SEVERITY ALERT";
  else if (notificationType === "SECURITY_UPDATE") title = "🛡️ SECURITY ADVISORY";
  else if (notificationType === "INTELLIGENCE_UPDATE") title = "🔍 THREAT INTELLIGENCE";
  else title = "📰 CYBER CHRONICLE";
  
  let bodyChunks = [titleText];
  
  if (item.metadata?.type === "cyber") {
    if (item.metadata.affectedProducts && item.metadata.affectedProducts.length > 0) {
      bodyChunks.push(`Affected: ${item.metadata.affectedProducts.join(", ")}`);
    }
    if (item.metadata.suggestedActions && item.metadata.suggestedActions.length > 0) {
      bodyChunks.push(`Action: ${item.metadata.suggestedActions[0]}`);
    }
  }
  
  bodyChunks.push(item.primaryPublisher);

  // Compute fingerprint for deduplication
  const fingerprintSource = [
    severity,
    item.verificationStatus,
    item.confidence,
    titleText,
    item.metadata?.affectedProducts?.join(",") || "",
    item.metadata?.suggestedActions?.join(",") || ""
  ].join("|");
  
  const fingerprint = crypto.createHash("md5").update(fingerprintSource).digest("hex");
  
  return {
    title,
    body: bodyChunks.join("\n\n"),
    imageUrl: item.imageUrl || "", // All FCM data values must be strings
    severity: severity || "Unknown",
    notificationType,
    intelligenceType: intelType,
    storyId: item.id,
    url: `/CYBER-CHRONICAL/?story=${encodeURIComponent(item.id)}`,
    tag: `cyber-chronicle:${item.id}`,
    fingerprint,
  };
}
