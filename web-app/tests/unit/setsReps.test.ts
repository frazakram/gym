import { describe, expect, it } from "vitest";
import { parseSetsReps } from "@/lib/setsReps";

// Characterization tests: they pin down what parseSetsReps does today,
// including quirks, so refactors can't silently change routine display.
describe("parseSetsReps", () => {
  it.each([
    ["3 sets x 10 reps (rest 90s)", { sets: 3, reps: 10, restSeconds: 90 }],
    ["4 x 8\u201310 (rest 2 min)", { sets: 4, reps: 8, restSeconds: 120 }],
    ["3 sets of 12 reps", { sets: 3, reps: 12 }],
    ["5 \u00d7 5", { sets: 5, reps: 5 }],
    ["4 sets x 6-8 reps, rest 1.5 min", { sets: 4, reps: 6, restSeconds: 90 }],
    ["1 set x 20 reps rest 45 seconds", { sets: 1, reps: 20, restSeconds: 45 }],
  ])("parses %j", (input, expected) => {
    expect(parseSetsReps(input)).toEqual({ raw: input, ...expected });
  });

  it("returns only raw for empty or whitespace input", () => {
    expect(parseSetsReps("")).toEqual({ raw: "" });
    expect(parseSetsReps("   ")).toEqual({ raw: "" });
  });

  it("tolerates null/undefined at runtime", () => {
    expect(parseSetsReps(null as unknown as string)).toEqual({ raw: "" });
    expect(parseSetsReps(undefined as unknown as string)).toEqual({ raw: "" });
  });

  it("trims the raw value", () => {
    expect(parseSetsReps("  3 sets x 10 reps  ").raw).toBe("3 sets x 10 reps");
  });

  it("leaves fields undefined for free text", () => {
    expect(parseSetsReps("AMRAP until failure")).toEqual({ raw: "AMRAP until failure" });
  });

  it("takes the lower bound of a rep range", () => {
    expect(parseSetsReps("3 sets x 8-12 reps").reps).toBe(8);
  });

  it("ignores rest without a recognised unit", () => {
    expect(parseSetsReps("3 x 10 rest 90").restSeconds).toBeUndefined();
  });
});
