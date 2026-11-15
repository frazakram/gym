import { describe, expect, it } from "vitest";
import {
  canonicalYouTubeWatchUrl,
  getYouTubeId,
  isValidYouTubeVideoId,
  isYouTubeUrl,
  sanitizeYouTubeUrls,
} from "@/lib/youtube";

const ID = "dQw4w9WgXcQ";
const ID2 = "aaaaaaaaaa1";
const ID3 = "bbbbbbbbbb2";
const ID4 = "cccccccccc3";

describe("getYouTubeId", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=30s`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`  https://youtu.be/${ID}  `],
  ])("extracts the id from %s", (url) => {
    expect(getYouTubeId(url)).toBe(ID);
  });

  it.each([
    ["not a url"],
    [""],
    [`https://vimeo.com/${ID}`],
    ["https://www.youtube.com/watch?v=short"],
    ["https://www.youtube.com/results?search_query=squat"],
    ["https://youtu.be/"],
  ])("returns null for %j", (url) => {
    expect(getYouTubeId(url)).toBeNull();
  });

  it("matches hosts by substring (current behaviour)", () => {
    // Pinned so a future tightening of host matching is a deliberate change.
    expect(getYouTubeId(`https://notyoutube.com/watch?v=${ID}`)).toBe(ID);
  });
});

describe("isValidYouTubeVideoId / isYouTubeUrl / canonical URL", () => {
  it("validates 11-char ids", () => {
    expect(isValidYouTubeVideoId(ID)).toBe(true);
    expect(isValidYouTubeVideoId("a-b_c123456")).toBe(true);
    expect(isValidYouTubeVideoId("tooshort")).toBe(false);
    expect(isValidYouTubeVideoId("has space!!")).toBe(false);
  });

  it("isYouTubeUrl requires an extractable id", () => {
    expect(isYouTubeUrl(`https://youtu.be/${ID}`)).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/")).toBe(false);
  });

  it("builds canonical watch URLs", () => {
    expect(canonicalYouTubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});

describe("sanitizeYouTubeUrls", () => {
  it("canonicalises, dedupes, drops junk and caps at max (default 3)", () => {
    const out = sanitizeYouTubeUrls([
      `https://youtu.be/${ID}`,
      `https://www.youtube.com/watch?v=${ID}`,
      "garbage",
      42,
      "",
      `https://www.youtube.com/shorts/${ID2}`,
      `https://www.youtube.com/embed/${ID3}`,
      `https://www.youtube.com/embed/${ID4}`,
    ]);
    expect(out).toEqual([ID, ID2, ID3].map(canonicalYouTubeWatchUrl));
  });

  it("accepts a single string and non-array input", () => {
    expect(sanitizeYouTubeUrls(`https://youtu.be/${ID}`)).toEqual([canonicalYouTubeWatchUrl(ID)]);
    expect(sanitizeYouTubeUrls(undefined)).toEqual([]);
    expect(sanitizeYouTubeUrls({ url: "x" })).toEqual([]);
  });

  it("respects a custom max", () => {
    expect(sanitizeYouTubeUrls([`https://youtu.be/${ID}`, `https://youtu.be/${ID2}`], 1)).toHaveLength(1);
  });
});
