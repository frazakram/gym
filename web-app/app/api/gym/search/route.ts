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
  imageUrl: string | null;
  rating: number | null;
}

const MOCK_GYMS: GymSearchResult[] = [
  {
    placeId: "mock_1",
    name: "Gold's Gym",
    address: "Nearby — add GOOGLE_PLACES_API_KEY for real results",
    imageUrl: null,
    rating: null,
  },
  {
    placeId: "mock_2",
    name: "Anytime Fitness",
    address: "Nearby — add GOOGLE_PLACES_API_KEY for real results",
    imageUrl: null,
    rating: null,
  },
  {
    placeId: "mock_3",
    name: "CrossFit Box",
    address: "Nearby — add GOOGLE_PLACES_API_KEY for real results",
    imageUrl: null,
    rating: null,
  },
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

    const { q, lat, lng } = parsed.data;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    // If no API key, return mock data for dev
    if (!apiKey) {
      const filtered = MOCK_GYMS.filter(
        (g) => g.name.toLowerCase().includes(q.toLowerCase()) || q.length > 0
      );
      return withCors(NextResponse.json({ results: filtered.length > 0 ? filtered : MOCK_GYMS }));
    }

    // Google Places Text Search
    const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    searchUrl.searchParams.set("query", q);
    searchUrl.searchParams.set("type", "gym");
    searchUrl.searchParams.set("key", apiKey);
    if (lat != null && lng != null) {
      searchUrl.searchParams.set("location", `${lat},${lng}`);
      searchUrl.searchParams.set("radius", "10000");
    }

    const res = await fetch(searchUrl.toString());
    if (!res.ok) {
      console.error("Google Places API error:", await res.text().catch(() => ""));
      return withCors(NextResponse.json({ results: MOCK_GYMS }));
    }

    const data = (await res.json()) as {
      results?: Array<{
        place_id?: string;
        name?: string;
        formatted_address?: string;
        rating?: number;
        photos?: Array<{ photo_reference?: string }>;
      }>;
    };

    const results: GymSearchResult[] = (data.results || []).slice(0, 10).map((place) => {
      const photoRef = place.photos?.[0]?.photo_reference;
      const imageUrl = photoRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
        : null;

      return {
        placeId: place.place_id || "",
        name: place.name || "",
        address: place.formatted_address || "",
        imageUrl,
        rating: place.rating ?? null,
      };
    });

    return withCors(NextResponse.json({ results }));
  } catch (error) {
    console.error("GET /api/gym/search error:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
