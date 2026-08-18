import type { NewsCategory } from "./sources.ts";

export type VerificationStatus = "official" | "corroborated" | "single-source";
export type StoryState = "confirmed" | "developing";
export type ConfidenceLabel = "High" | "Medium" | "Low";

export type EvidenceLink = {
  publisher: string;
  category: string; 
  url: string;
  publishedAt: string;
  dependencyGroup: string;
  trustTier: 1 | 2 | 3 | 4;
};

export type CyberMetadata = {
  type: "cyber";
  severity?: "Critical" | "High" | "Medium" | "Low" | "Unknown";
  identifier?: string;
  affected?: string;
  action?: string;
  dueDate?: string;
};

export type GeneralMetadata = {
  type: "general";
};

export type StoryMetadata = CyberMetadata | GeneralMetadata;

export type RealIntelligenceItem = {
  id: string;
  sourceId: string; // Keep this as it's used internally
  title: string;
  summary: string;

  publishedAt: string;
  updatedAt: string;

  categories: NewsCategory[];
  region: "india" | "global" | "regional";

  primaryPublisher: string;

  verificationStatus: VerificationStatus;
  storyState: StoryState;
  confidence: ConfidenceLabel;

  independentSourceCount: number;
  evidence: EvidenceLink[];
  references: string[]; // Keep this as it's used internally

  studentSummary: string;
  knownFacts: string[];
  unknowns: string[];

  metadata: StoryMetadata;
  imageUrl?: string;
};

export type SourceResult = {
  id: string;
  name: string;
  authority: string;
  categories: NewsCategory[];
  trustTier: 1 | 2 | 3 | 4;
  url: string;
  retrievedFrom: string | null;
  retrievedAt: string | null;
  status: "current" | "stale" | "failed";
  error?: string;
  itemCount: number;
};

export type RealIntelligenceResponse = {
  state: "fresh" | "cached" | "stale" | "partial" | "unavailable";
  generatedAt: string;
  lastSuccessfulAt: string | null;
  cacheAgeSeconds: number | null;
  notice: string;
  items: RealIntelligenceItem[];
  sources: SourceResult[];
};
