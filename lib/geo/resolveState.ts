import { INDIA_STATE_BOUNDARIES } from "./india-states.ts";

export function resolveState(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const matches = INDIA_STATE_BOUNDARIES.flatMap((state) => state.bounds
    .filter((bounds) => lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng)
    .map((bounds) => ({
      name: state.name,
      area: (bounds.maxLat - bounds.minLat) * (bounds.maxLng - bounds.minLng),
    })));

  matches.sort((left, right) => left.area - right.area);
  return matches[0]?.name ?? null;
}
