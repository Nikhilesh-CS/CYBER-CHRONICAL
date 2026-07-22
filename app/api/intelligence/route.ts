import { getRealIntelligence } from "./real-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getRealIntelligence();
  return Response.json(payload, {
    status: payload.state === "unavailable" ? 503 : 200,
    headers: {
      "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=900",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
    },
  });
}
