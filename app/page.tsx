import { CyberChronicleApp } from "./cyber-chronicle-app";
import type { RealIntelligenceResponse } from "../lib/news";
import newsSnapshot from "../public/data/news.json";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/CYBER-CHRONICAL";

export default function Home() {
  return (
    <CyberChronicleApp
      initialData={newsSnapshot as unknown as RealIntelligenceResponse}
      dataUrl={`${basePath}/data/news.json`}
      serviceWorkerUrl={`${basePath}/service-worker.js`}
    />
  );
}
