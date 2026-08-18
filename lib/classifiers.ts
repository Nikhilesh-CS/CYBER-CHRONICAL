import type { NewsCategory } from "./sources.ts";

export const TOPIC_FILTERS: Record<NewsCategory, RegExp> = {
  cyber: /\b(cyber(?:security|attack|crime)?|ransomware|malware|phish(?:ing)?|breach|hack(?:ed|ing)?|vulnerabilit(?:y|ies)|exploit|security (?:incident|risk|weakness|breach)|data leak|threat actor|digital fraud|identity theft|botnet|spyware|trojan)\b/i,
  technology: /\b(technology|software|hardware|it infrastructure|cloud computing|saas|datacenter|server|smartphone|laptop|os|operating system)\b/i,
  ai: /\b(ai|artificial intelligence|machine learning|deep learning|llm|generative ai|neural network|chatgpt|openai|gemini)\b/i,
  business: /\b(business|corporate|acquisition|merger|startup|funding|revenue|quarterly earnings|ceo|market share)\b/i,
  markets: /\b(stock|shares|nasdaq|nyse|bse|nse|crypto|bitcoin|bull market|bear market|inflation|interest rate)\b/i,
  science: /\b(science|scientific|research|physics|chemistry|biology|discovery|experiment|scientists)\b/i,
  space: /\b(space|nasa|isro|esa|spacex|satellite|orbit|moon|mars|lunar|galaxy|telescope)\b/i,
  health: /\b(health|medical|disease|virus|vaccine|hospital|doctor|patient|fda|who|pandemic)\b/i,
  environment: /\b(environment|climate|global warming|carbon|emissions|sustainability|green energy|pollution|weather)\b/i,
  education: /\b(education|school|university|college|student|teacher|degree|campus|curriculum|exam)\b/i,
  sports: /\b(sports|cricket|football|soccer|tennis|olympics|athlete|tournament|championship|match)\b/i,
  entertainment: /\b(entertainment|movie|film|actor|actress|music|album|hollywood|bollywood|celebrity|theatre)\b/i,
  politics: /\b(politics|government|election|parliament|congress|senate|minister|president|diplomacy|policy|lawmaker)\b/i,
  world: /\b(global|international|world|un|united nations|foreign|treaty|diplomat)\b/i,
  india: /\b(india|indian|delhi|mumbai|bangalore|bengaluru|narendra modi|rupee)\b/i,
};

export const OFFICIAL_CYBER_TOPIC = /\b(cyber(?:security|attack|crime)?|ransomware|malware|phish(?:ing)?|data breach|information security|technology risk|digital fraud|IT governance|IT systems?|payment security|operational resilience)\b/i;

export function classifyText(text: string): NewsCategory[] {
  const detected: NewsCategory[] = [];
  for (const [category, regex] of Object.entries(TOPIC_FILTERS)) {
    if (regex.test(text)) {
      detected.push(category as NewsCategory);
    }
  }
  return detected;
}

export function enhanceCategories(baseCategories: NewsCategory[], title: string, summary: string): NewsCategory[] {
  const haystack = `${title} ${summary}`;
  const detected = classifyText(haystack);
  
  // Merge and deduplicate
  const merged = Array.from(new Set([...baseCategories, ...detected]));
  return merged;
}
