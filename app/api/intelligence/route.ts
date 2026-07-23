import { getRealIntelligence } from "./real-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const payload = await getRealIntelligence(new Date(), { force });
  return Response.json(payload, {
    status: payload.state === "unavailable" ? 503 : 200,
    headers: {
      "cache-control": "no-store, max-age=0, must-revalidate",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
    },
  });
}
