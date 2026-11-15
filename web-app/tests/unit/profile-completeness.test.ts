import { describe, expect, it } from "vitest";
import { missingPlanFields } from "@/lib/profile-completeness";
import type { Profile } from "@/types";

const complete = { age: 30, weight: 72, height: 178, goal: "Muscle gain", level: "Beginner" } as Partial<Profile>;

describe("missingPlanFields", () => {
  it("nothing is missing from a complete profile", () => {
    expect(missingPlanFields(complete)).toEqual([]);
  });

  it("an empty (skipped) profile is missing every needed field", () => {
    expect(missingPlanFields({})).toEqual(["age", "weight", "height", "goal", "level"]);
    expect(missingPlanFields(null)).toEqual(["age", "weight", "height", "goal", "level"]);
  });

  it("null and blank values count as missing", () => {
    expect(missingPlanFields({ ...complete, weight: null as never, level: "  " as never })).toEqual(["weight", "level"]);
  });
});
