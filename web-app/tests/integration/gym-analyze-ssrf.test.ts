import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as gymAnalyze } from "@/app/api/gym/analyze/route";
import { asHandler, call, newUser } from "./helpers";

// An attacker-chosen URL pointing at internal infrastructure.
const INTERNAL_URL = "http://169.254.169.254/latest/meta-data/";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/gym/analyze server-side request forgery", () => {
  it("never fetches a client-supplied imageUrl", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { id } = await newUser("ssrf");

    const response = await call(asHandler(gymAnalyze), {
      method: "POST",
      path: "/api/gym/analyze",
      userId: id,
      body: { imageUrl: INTERNAL_URL, api_key: "sk-user-own-key" },
    });

    const fetchedUrls = fetchSpy.mock.calls.map(([requestUrl]) => String(requestUrl));
    expect(fetchedUrls).not.toContain(INTERNAL_URL);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No images provided" });
  });
});
