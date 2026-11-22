import { CyberChronicleApp } from "./cyber-chronicle-app";
import type { RealIntelligenceResponse } from "../lib/news";
import newsSnapshot from "../public/data/news.json";
import { isCyberStory } from "../lib/reader";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/CYBER-CHRONICAL";
const buildRenderTime = Date.now();

export default function Home() {
  const edition = newsSnapshot as unknown as RealIntelligenceResponse;
  const bootstrap = [
    ...edition.items.filter(isCyberStory).slice(0, 45),
    ...edition.items.filter((item) => !isCyberStory(item)).slice(0, 15),
  ];
  return (
    <CyberChronicleApp
      initialData={{ ...edition, items: bootstrap }}
      initialRenderTime={buildRenderTime}
      dataUrl={`${basePath}/data/news.json`}
      serviceWorkerUrl={`${basePath}/service-worker.js`}
    />
  );
}
