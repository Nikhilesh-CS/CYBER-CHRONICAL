import { CyberChronicleApp } from "./cyber-chronicle-app";
import { getRealIntelligence } from "./api/intelligence/real-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialData = await getRealIntelligence();
  return <CyberChronicleApp initialData={initialData} />;
}
