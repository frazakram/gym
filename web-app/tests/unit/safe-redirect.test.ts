import { describe, expect, it } from "vitest";
import { DEFAULT_RETURN_PATH, toSafeReturnPath } from "@/lib/safe-redirect";

describe("toSafeReturnPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard?tab=profile#top", "/dashboard?tab=profile#top"],
    ["/coach/portal", "/coach/portal"],
  ])("keeps same-site path %j", (input, expected) => {
    expect(toSafeReturnPath(input)).toBe(expected);
  });

  it.each([
    ["https://evil.example/phish"],
    ["http://evil.example"],
    ["//evil.example/phish"],
    ["/\\evil.example"],
    ["\\\\evil.example"],
    ["/%09/evil.example"],
    [" /dashboard"],
    ["javascript:alert(1)"],
    ["dashboard"],
    ["/dash\nboard"],
    [""],
    ["/" + "a".repeat(600)],
  ])("rejects %j and falls back to the default", (input) => {
    expect(toSafeReturnPath(input)).toBe(DEFAULT_RETURN_PATH);
  });

  it("falls back for missing or non-string values", () => {
    expect(toSafeReturnPath(null)).toBe(DEFAULT_RETURN_PATH);
    expect(toSafeReturnPath(undefined)).toBe(DEFAULT_RETURN_PATH);
    expect(toSafeReturnPath(42)).toBe(DEFAULT_RETURN_PATH);
  });

  it("uses /dashboard as the default", () => {
    expect(DEFAULT_RETURN_PATH).toBe("/dashboard");
  });
});
