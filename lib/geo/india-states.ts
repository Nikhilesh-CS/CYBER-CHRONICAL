export type GeoBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type IndiaStateBoundary = {
  name: string;
  bounds: readonly GeoBounds[];
};

// Deliberately coarse offline bounds for local personalization. Smaller
// enclaves/UTs use separate boxes and resolution prefers the smallest match.
export const INDIA_STATE_BOUNDARIES: readonly IndiaStateBoundary[] = [
  { name: "Andaman and Nicobar Islands", bounds: [{ minLat: 6.7, maxLat: 13.8, minLng: 92.1, maxLng: 94.3 }] },
  { name: "Andhra Pradesh", bounds: [{ minLat: 12.6, maxLat: 19.2, minLng: 76.7, maxLng: 84.8 }] },
  { name: "Arunachal Pradesh", bounds: [{ minLat: 26.6, maxLat: 29.5, minLng: 91.5, maxLng: 97.4 }] },
  { name: "Assam", bounds: [{ minLat: 24.1, maxLat: 28.2, minLng: 89.7, maxLng: 96.0 }] },
  { name: "Bihar", bounds: [{ minLat: 24.3, maxLat: 27.6, minLng: 83.3, maxLng: 88.3 }] },
  { name: "Chandigarh", bounds: [{ minLat: 30.65, maxLat: 30.8, minLng: 76.7, maxLng: 76.85 }] },
  { name: "Chhattisgarh", bounds: [{ minLat: 17.8, maxLat: 24.1, minLng: 80.2, maxLng: 84.4 }] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", bounds: [
    { minLat: 20.05, maxLat: 20.35, minLng: 72.75, maxLng: 73.15 },
    { minLat: 20.05, maxLat: 20.7, minLng: 72.8, maxLng: 73.25 },
  ] },
  { name: "Delhi", bounds: [{ minLat: 28.4, maxLat: 28.9, minLng: 76.8, maxLng: 77.35 }] },
  { name: "Goa", bounds: [{ minLat: 14.85, maxLat: 15.8, minLng: 73.65, maxLng: 74.35 }] },
  { name: "Gujarat", bounds: [{ minLat: 20.0, maxLat: 24.8, minLng: 68.0, maxLng: 74.6 }] },
  { name: "Haryana", bounds: [{ minLat: 27.6, maxLat: 30.95, minLng: 74.45, maxLng: 77.6 }] },
  { name: "Himachal Pradesh", bounds: [{ minLat: 30.35, maxLat: 33.25, minLng: 75.55, maxLng: 79.0 }] },
  { name: "Jammu and Kashmir", bounds: [{ minLat: 32.25, maxLat: 35.15, minLng: 73.75, maxLng: 76.95 }] },
  { name: "Jharkhand", bounds: [{ minLat: 21.9, maxLat: 25.35, minLng: 83.3, maxLng: 87.95 }] },
  { name: "Karnataka", bounds: [{ minLat: 11.5, maxLat: 18.5, minLng: 74.0, maxLng: 78.7 }] },
  { name: "Kerala", bounds: [{ minLat: 8.2, maxLat: 12.8, minLng: 74.8, maxLng: 77.4 }] },
  { name: "Ladakh", bounds: [{ minLat: 32.2, maxLat: 35.9, minLng: 76.8, maxLng: 80.3 }] },
  { name: "Lakshadweep", bounds: [{ minLat: 8.0, maxLat: 12.8, minLng: 71.5, maxLng: 74.0 }] },
  { name: "Madhya Pradesh", bounds: [{ minLat: 21.0, maxLat: 26.9, minLng: 74.0, maxLng: 82.8 }] },
  { name: "Maharashtra", bounds: [{ minLat: 15.6, maxLat: 22.1, minLng: 72.6, maxLng: 80.95 }] },
  { name: "Manipur", bounds: [{ minLat: 23.8, maxLat: 25.7, minLng: 93.0, maxLng: 94.8 }] },
  { name: "Meghalaya", bounds: [{ minLat: 25.0, maxLat: 26.2, minLng: 89.8, maxLng: 92.8 }] },
  { name: "Mizoram", bounds: [{ minLat: 21.9, maxLat: 24.6, minLng: 92.2, maxLng: 93.5 }] },
  { name: "Nagaland", bounds: [{ minLat: 25.1, maxLat: 27.1, minLng: 93.2, maxLng: 95.3 }] },
  { name: "Odisha", bounds: [{ minLat: 17.8, maxLat: 22.7, minLng: 81.4, maxLng: 87.5 }] },
  { name: "Puducherry", bounds: [
    { minLat: 11.8, maxLat: 12.1, minLng: 79.65, maxLng: 80.0 },
    { minLat: 10.8, maxLat: 11.1, minLng: 79.7, maxLng: 80.0 },
    { minLat: 16.65, maxLat: 16.85, minLng: 82.15, maxLng: 82.35 },
  ] },
  { name: "Punjab", bounds: [{ minLat: 29.5, maxLat: 32.6, minLng: 73.8, maxLng: 76.95 }] },
  { name: "Rajasthan", bounds: [{ minLat: 23.0, maxLat: 30.2, minLng: 69.4, maxLng: 78.3 }] },
  { name: "Sikkim", bounds: [{ minLat: 27.0, maxLat: 28.2, minLng: 88.0, maxLng: 88.95 }] },
  { name: "Tamil Nadu", bounds: [
    { minLat: 8.0, maxLat: 11.15, minLng: 76.2, maxLng: 80.35 },
    { minLat: 11.0, maxLat: 13.6, minLng: 78.0, maxLng: 80.35 },
    { minLat: 10.4, maxLat: 11.8, minLng: 76.2, maxLng: 78.2 },
  ] },
  { name: "Telangana", bounds: [{ minLat: 15.7, maxLat: 19.95, minLng: 77.1, maxLng: 81.0 }] },
  { name: "Tripura", bounds: [{ minLat: 22.9, maxLat: 24.55, minLng: 91.1, maxLng: 92.4 }] },
  { name: "Uttar Pradesh", bounds: [{ minLat: 23.8, maxLat: 30.5, minLng: 77.0, maxLng: 84.7 }] },
  { name: "Uttarakhand", bounds: [{ minLat: 28.7, maxLat: 31.5, minLng: 77.5, maxLng: 81.1 }] },
  { name: "West Bengal", bounds: [{ minLat: 21.4, maxLat: 27.3, minLng: 85.8, maxLng: 89.9 }] },
];

export const INDIA_STATE_NAMES = INDIA_STATE_BOUNDARIES.map((entry) => entry.name);
