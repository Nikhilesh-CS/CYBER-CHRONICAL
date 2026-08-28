import type { RealIntelligenceItem } from "../news.ts";
import { intelligencePriority } from "../editorial.ts";
import type { IntelligenceIndex, InterestProfile } from "./types.ts";

export const INTEREST_PROFILE_KEY = "cyber-chronicle-interest-profile-v1";

export function cosineSimilarity(left?: number[], right?: number[]) {
  if (!left?.length || !right?.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftMagnitude * rightMagnitude);
  return denominator ? dot / denominator : 0;
}

function normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}

export function readInterestProfile(): InterestProfile | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(INTEREST_PROFILE_KEY) || "null") as InterestProfile | null;
    return parsed?.vector?.length ? parsed : null;
  } catch {
    return null;
  }
}

export function learnFromStory(current: InterestProfile | null, storyVector: number[], weight = 1): InterestProfile {
  if (!current || current.vector.length !== storyVector.length) {
    return { vector: normalize(storyVector), engagementCount: weight, updatedAt: new Date().toISOString() };
  }
  const total = current.engagementCount + weight;
  const vector = current.vector.map((value, index) => ((value * current.engagementCount) + (storyVector[index] * weight)) / total);
  return { vector: normalize(vector), engagementCount: total, updatedAt: new Date().toISOString() };
}

export function rankForReader(
  items: RealIntelligenceItem[],
  index: IntelligenceIndex | null,
  profile: InterestProfile | null,
  followedState: string | null = null,
) {
  return [...items].sort((left, right) => {
    const editorialDifference = intelligencePriority(right) - intelligencePriority(left);
    const hasInterestProfile = Boolean(index && profile && profile.engagementCount >= 2);
    const hasStatePreference = Boolean(followedState);
    if (!hasInterestProfile && !hasStatePreference) return editorialDifference;
    const leftAffinity = hasInterestProfile ? cosineSimilarity(profile?.vector, index?.stories[left.id]?.vector) : 0;
    const rightAffinity = hasInterestProfile ? cosineSimilarity(profile?.vector, index?.stories[right.id]?.vector) : 0;
    const leftStateBonus = followedState && left.state === followedState ? 12 : 0;
    const rightStateBonus = followedState && right.state === followedState ? 12 : 0;
    return (editorialDifference * 0.72) + ((rightAffinity - leftAffinity) * 34) + rightStateBonus - leftStateBonus;
  });
}
