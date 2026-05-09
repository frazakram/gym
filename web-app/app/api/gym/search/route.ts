import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { GymSearchSchema, safeParseWithError } from "@/lib/validations";

export const runtime = "nodejs";

interface GymSearchResult {
  placeId: string;
  name: string;
  address: string;
  imageUrl: null;
  rating: null;
  lat?: number;
  lng?: number;
}

const FALLBACK_GYMS: GymSearchResult[] = [
  { placeId: "mock-1", name: "Local Fitness Center", address: "Add location access for real gyms nearby", imageUrl: null, rating: null },
  { placeId: "mock-2", name: "City Gym", address: "Add location access for real gyms nearby", imageUrl: null, rating: null },
  { placeId: "mock-3", name: "Iron House Gym", address: "Add location access for real gyms nearby", imageUrl: null, rating: null },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await initializeDatabase();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = safeParseWithError(GymSearchSchema, params);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));
    }

    const { lat, lng } = parsed.data;

    // Need coordinates to query Overpass
    if (lat == null || lng == null) {
      return withCors(NextResponse.json({ results: FALLBACK_GYMS }));
    }

    // Overpass API query — 3 tag variants covering most gyms on OSM
    const overpassQuery = `[out:json][timeout:10];(node["leisure"="fitness_centre"](around:5000,${lat},${lng});node["sport"="fitness"](around:5000,${lat},${lng});node["amenity"="gym"](around:5000,${lat},${lng}););out 15;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "GymBro-App/1.0" },
      });
      clearTimeout(timer);

      if (!res.ok) {
        return withCors(NextResponse.json({ results: FALLBACK_GYMS }));
      }

      const data = (await res.json()) as {
        elements?: Array<{
          id?: number;
          lat?: number;
          lon?: number;
          tags?: Record<string, string>;
        }>;
      };

      const results: GymSearchResult[] = (data.elements || [])
        .filter((el) => el.tags?.name)
        .slice(0, 15)
        .map((el) => ({
          placeId: String(el.id ?? Math.random()),
          name: el.tags?.name ?? "Unnamed Gym",
          address: [el.tags?.["addr:street"], el.tags?.["addr:city"]]
            .filter(Boolean)
            .join(", ") || "Address unavailable",
          imageUrl: null,
          rating: null,
          lat: el.lat,
          lng: el.lon,
        }));

      return withCors(NextResponse.json({ results: results.length > 0 ? results : FALLBACK_GYMS }));
    } catch {
      clearTimeout(timer);
      return withCors(NextResponse.json({ results: FALLBACK_GYMS }));
    }
  } catch (error) {
    console.error("GET /api/gym/search error:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
