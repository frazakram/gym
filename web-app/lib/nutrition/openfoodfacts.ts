/**
 * Open Food Facts integration — text search + barcode lookup.
 *
 * OFF is free and key-less but asks every client to send an identifying
 * User-Agent and respects per-IP rate limits (15 req/min product reads,
 * 10 req/min search). We normalize every product into a {@link FoodSearchResult}
 * with macros per 100 g so the UI can scale to any quantity.
 *
 * Endpoints (verified live, June 2026):
 *  - Barcode: GET https://world.openfoodfacts.org/api/v2/product/{barcode}
 *  - Search:  GET https://search.openfoodfacts.org/search   (Search-a-licious)
 *             fallback: GET https://world.openfoodfacts.org/cgi/search.pl?json=1
 */

import type { FoodSearchResult, MacroSet } from '@/types';

const OFF_BASE = 'https://world.openfoodfacts.org';
const SEARCH_BASE = 'https://search.openfoodfacts.org';

/** OFF requires a descriptive User-Agent: "AppName/Version (contact)". */
const USER_AGENT =
  process.env.OFF_USER_AGENT || 'GymBroAI/1.0 (nutrition-tracker; contact@gymbro.app)';

const FIELDS = 'code,product_name,brands,nutriments,serving_size,image_front_thumb_url';

const TIMEOUT_MS = 8000;

interface OffNutriments {
  'energy-kcal_100g'?: number;
  'energy_100g'?: number; // kJ fallback
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  [k: string]: unknown;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string | string[];
  nutriments?: OffNutriments;
  serving_size?: string;
  image_front_thumb_url?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function offFetchOnce(url: string): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('rate_limited');
      throw new Error(`OFF request failed: ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch with one retry for transient failures (OFF's free infra throws 5xx /
 * times out intermittently). A single hiccup shouldn't surface as "no results".
 * Rate-limits (429) are not retried — back off instead.
 */
async function offFetch(url: string): Promise<unknown> {
  try {
    return await offFetchOnce(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const transient =
      msg.includes('aborted') ||
      msg.includes('fetch') ||
      msg.includes('network') ||
      /OFF request failed: 5\d\d/.test(msg);
    if (!transient) throw err;
    await sleep(400);
    return offFetchOnce(url);
  }
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** kJ → kcal when energy-kcal is missing (1 kcal = 4.184 kJ). */
function kcalFrom(n: OffNutriments): number {
  const kcal = num(n['energy-kcal_100g']);
  if (kcal > 0) return kcal;
  const kj = num(n['energy_100g']);
  return kj > 0 ? Math.round(kj / 4.184) : 0;
}

function macrosPer100g(n: OffNutriments | undefined): MacroSet {
  if (!n) return { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 };
  return {
    calories: Math.round(kcalFrom(n)),
    protein_g: num(n.proteins_100g),
    carb_g: num(n.carbohydrates_100g),
    fat_g: num(n.fat_100g),
  };
}

/** Parse "30 g", "1 cup (240 ml)", "0.5 l" → grams/ml. Returns undefined if unknown. */
export function parseServingGrams(serving?: string): number | undefined {
  if (!serving) return undefined;
  // Prefer a value inside parentheses, e.g. "1 cup (240 ml)".
  const paren = serving.match(/\(([^)]*)\)/);
  const candidates = [paren?.[1], serving].filter(Boolean) as string[];
  for (const c of candidates) {
    const m = c.match(/([\d.]+)\s*(kg|g|mg|l|ml|cl)/i);
    if (!m) continue;
    const value = parseFloat(m[1]);
    if (!Number.isFinite(value)) continue;
    switch (m[2].toLowerCase()) {
      case 'kg':
        return value * 1000;
      case 'g':
      case 'ml':
        return value;
      case 'mg':
        return value / 1000;
      case 'l':
        return value * 1000;
      case 'cl':
        return value * 10;
    }
  }
  return undefined;
}

function normalizeBrand(brands?: string | string[]): string | undefined {
  if (!brands) return undefined;
  const first = Array.isArray(brands) ? brands[0] : brands.split(',')[0];
  return first?.trim() || undefined;
}

function toResult(p: OffProduct, source: FoodSearchResult['source']): FoodSearchResult | null {
  const name = p.product_name?.trim();
  if (!name) return null;
  const per100g = macrosPer100g(p.nutriments);
  // Skip products with no usable nutrition data.
  if (per100g.calories === 0 && per100g.protein_g === 0 && per100g.carb_g === 0 && per100g.fat_g === 0) {
    return null;
  }
  return {
    code: p.code,
    name,
    brand: normalizeBrand(p.brands),
    per100g,
    serving_size: p.serving_size,
    serving_grams: parseServingGrams(p.serving_size),
    thumb_url: p.image_front_thumb_url,
    source,
  };
}

/** Look up a single product by EAN/UPC barcode. Returns null when not found. */
export async function lookupBarcode(barcode: string): Promise<FoodSearchResult | null> {
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}?fields=${FIELDS}`;
  const data = (await offFetch(url)) as { status?: number; product?: OffProduct };
  if (!data || data.status === 0 || !data.product) return null;
  return toResult({ ...data.product, code: data.product.code ?? barcode }, 'barcode');
}

/** Full-text product search via Search-a-licious, with a legacy cgi fallback. */
export async function searchFoods(query: string, pageSize = 15): Promise<FoodSearchResult[]> {
  const size = Math.max(1, Math.min(25, Math.floor(pageSize)));
  try {
    const url = `${SEARCH_BASE}/search?q=${encodeURIComponent(query)}&page_size=${size}&fields=${FIELDS}`;
    const data = (await offFetch(url)) as { hits?: OffProduct[] };
    const hits = Array.isArray(data?.hits) ? data.hits : [];
    const results = hits.map((h) => toResult(h, 'search')).filter((r): r is FoodSearchResult => r !== null);
    if (results.length > 0) return results;
  } catch (error) {
    console.warn('OFF search-a-licious failed, falling back to cgi:', error);
  }

  // Fallback: legacy cgi search (deprecated but reliable).
  try {
    const url =
      `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1&page_size=${size}&fields=${FIELDS}`;
    const data = (await offFetch(url)) as { products?: OffProduct[] };
    const products = Array.isArray(data?.products) ? data.products : [];
    return products.map((p) => toResult(p, 'search')).filter((r): r is FoodSearchResult => r !== null);
  } catch (error) {
    console.error('OFF cgi search failed:', error);
    return [];
  }
}
