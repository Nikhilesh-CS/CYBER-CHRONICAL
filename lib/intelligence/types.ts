export type StoryIntelligence = {
  vector: number[];
  relatedIds: string[];
  contentHash: string;
  firstSeenAt: string;
  independentSourceCount: number;
  corroborationVelocity: number;
};

export type IntelligenceIndex = {
  generatedAt: string;
  model: string;
  dimensions: number;
  stories: Record<string, StoryIntelligence>;
};

export type InterestProfile = {
  vector: number[];
  engagementCount: number;
  updatedAt: string;
};
