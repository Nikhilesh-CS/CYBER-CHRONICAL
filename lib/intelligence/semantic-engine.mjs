import crypto from "node:crypto";
import { resolve } from "node:path";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const FALLBACK_DIMENSIONS = 192;

export function storyText(item) {
  const details = item.metadata?.type === "cyber"
    ? [item.metadata.severity, item.metadata.affected, item.metadata.action]
    : [];
  return [item.title, item.studentSummary || item.summary, item.primaryPublisher, ...(item.categories || []), ...details]
    .filter(Boolean)
    .join(". ")
    .slice(0, 1800);
}

export function contentHash(item) {
  return crypto.createHash("sha256").update(storyText(item)).digest("hex").slice(0, 16);
}

export function normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}

export function lexicalVector(text, dimensions = FALLBACK_DIMENSIONS) {
  const vector = Array(dimensions).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
  for (const token of tokens) {
    const digest = crypto.createHash("sha256").update(token).digest();
    const index = digest.readUInt16BE(0) % dimensions;
    vector[index] += digest[2] % 2 ? 1 : -1;
  }
  return normalize(vector);
}

export function cosineSimilarity(left, right) {
  if (!left?.length || left.length !== right?.length) return 0;
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) dot += left[index] * right[index];
  return dot;
}

export function relatedStoryIds(id, stories, limit = 6, threshold = 0.32) {
  const current = stories[id];
  if (!current) return [];
  return Object.entries(stories)
    .filter(([candidateId, candidate]) => candidateId !== id && candidate.vector.length === current.vector.length)
    .map(([candidateId, candidate]) => ({ id: candidateId, score: cosineSimilarity(current.vector, candidate.vector) }))
    .filter((candidate) => candidate.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((candidate) => candidate.id);
}

async function transformerVectors(texts) {
  const { env, pipeline } = await import("@huggingface/transformers");
  env.cacheDir = resolve(".cache/transformers");
  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
  const vectors = [];
  for (let offset = 0; offset < texts.length; offset += 24) {
    const batch = texts.slice(offset, offset + 24);
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    const dimensions = output.dims.at(-1);
    for (let row = 0; row < batch.length; row += 1) {
      vectors.push(Array.from(output.data.slice(row * dimensions, (row + 1) * dimensions)));
    }
  }
  return vectors;
}

export async function buildIntelligenceIndex(items, previousIndex = null, options = {}) {
  const stories = {};
  const missing = [];
  for (const item of items) {
    const hash = contentHash(item);
    const previous = previousIndex?.stories?.[item.id];
    if (previous?.contentHash === hash && Array.isArray(previous.vector)) {
      stories[item.id] = {
        contentHash: hash,
        vector: previous.vector,
        relatedIds: [],
        firstSeenAt: previous.firstSeenAt || item.publishedAt,
        independentSourceCount: item.independentSourceCount,
        corroborationVelocity: Math.max(0, item.independentSourceCount - (previous.independentSourceCount ?? item.independentSourceCount)),
      };
    } else {
      missing.push({ item, hash, text: storyText(item) });
    }
  }

  let model = previousIndex?.model || EMBEDDING_MODEL;
  if (missing.length) {
    let vectors;
    if (previousIndex?.model === "local-lexical-fallback-v1" && !options.embed) {
      vectors = missing.map((entry) => lexicalVector(entry.text));
      model = "local-lexical-fallback-v1";
    } else {
      try {
        vectors = options.embed ? await options.embed(missing.map((entry) => entry.text)) : await transformerVectors(missing.map((entry) => entry.text));
        model = EMBEDDING_MODEL;
      } catch (error) {
        console.warn(`[INTELLIGENCE] Semantic model unavailable; rebuilding with deterministic lexical vectors: ${error instanceof Error ? error.message : String(error)}`);
        for (const key of Object.keys(stories)) delete stories[key];
        for (const item of items) {
          stories[item.id] = {
            contentHash: contentHash(item),
            vector: lexicalVector(storyText(item)).map((value) => Number(value.toFixed(6))),
            relatedIds: [],
            firstSeenAt: previousIndex?.stories?.[item.id]?.firstSeenAt || item.publishedAt,
            independentSourceCount: item.independentSourceCount,
            corroborationVelocity: Math.max(0, item.independentSourceCount - (previousIndex?.stories?.[item.id]?.independentSourceCount ?? item.independentSourceCount)),
          };
        }
        vectors = [];
        model = "local-lexical-fallback-v1";
      }
    }
    if (vectors.length) {
      missing.forEach((entry, index) => {
        const previous = previousIndex?.stories?.[entry.item.id];
        stories[entry.item.id] = {
          contentHash: entry.hash,
          vector: vectors[index].map((value) => Number(value.toFixed(6))),
          relatedIds: [],
          firstSeenAt: previous?.firstSeenAt || entry.item.publishedAt,
          independentSourceCount: entry.item.independentSourceCount,
          corroborationVelocity: Math.max(0, entry.item.independentSourceCount - (previous?.independentSourceCount ?? entry.item.independentSourceCount)),
        };
      });
    }
  }

  for (const id of Object.keys(stories)) stories[id].relatedIds = relatedStoryIds(id, stories);
  return {
    generatedAt: new Date().toISOString(),
    model,
    dimensions: Object.values(stories)[0]?.vector.length || 0,
    stories,
  };
}
