import snapshot from "../public/data/news.json";
import type { RealIntelligenceResponse } from "./models.ts";

export const currentEdition = snapshot as unknown as RealIntelligenceResponse;
