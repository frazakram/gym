import { describe, expect, it } from "vitest";
import {
  DayCompletionSchema,
  ExerciseCompletionSchema,
  LoginSchema,
  RegisterSchema,
  RoutineGenerateSchema,
  parseOrThrow,
  safeParseWithError,
} from "@/lib/validations";

describe("LoginSchema", () => {
  it("accepts a valid username/password", () => {
    expect(LoginSchema.safeParse({ username: "gym_bro-1", password: "secret1" }).success).toBe(true);
  });

  it.each([
    [{ username: "ab", password: "secret1" }],
    [{ username: "a".repeat(51), password: "secret1" }],
    [{ username: "bad name", password: "secret1" }],
    // Emails are not valid usernames (Google users log in via OAuth only).
    [{ username: "user@example.com", password: "secret1" }],
    [{ username: "gym_bro", password: "12345" }],
    [{ username: "gym_bro", password: "x".repeat(101) }],
    [{}],
  ])("rejects %j", (input) => {
    expect(LoginSchema.safeParse(input).success).toBe(false);
  });
});

describe("RegisterSchema password policy", () => {
  it("requires uppercase, digit and special character", () => {
    const ok = (password: string) => RegisterSchema.safeParse({ username: "gym_bro", password }).success;
    expect(ok("Test@1234")).toBe(true);
    expect(ok("test@1234")).toBe(false); // no uppercase
    expect(ok("Test@abcd")).toBe(false); // no digit
    expect(ok("Test12345")).toBe(false); // no special
    expect(ok("T@1a")).toBe(false); // too short
  });
});

describe("completion schemas", () => {
  it("coerces numeric strings", () => {
    const r = ExerciseCompletionSchema.parse({ routineId: "5", dayIndex: "2", exerciseIndex: "0", completed: true });
    expect(r).toMatchObject({ routineId: 5, dayIndex: 2, exerciseIndex: 0, completed: true });
  });

  it("bounds day and exercise indices", () => {
    expect(ExerciseCompletionSchema.safeParse({ routineId: 1, dayIndex: 7, exerciseIndex: 0, completed: true }).success).toBe(false);
    expect(ExerciseCompletionSchema.safeParse({ routineId: 1, dayIndex: 0, exerciseIndex: 51, completed: true }).success).toBe(false);
    expect(DayCompletionSchema.safeParse({ routineId: 0, dayIndex: 0, completed: true }).success).toBe(false);
  });

  it("requires a real boolean for completed", () => {
    expect(DayCompletionSchema.safeParse({ routineId: 1, dayIndex: 0, completed: "true" }).success).toBe(false);
  });
});

describe("RoutineGenerateSchema", () => {
  const base = {
    age: 25,
    weight: 70,
    height: 175,
    gender: "Male",
    goal: "General fitness",
    level: "Beginner",
    tenure: "6 months",
    model_provider: "OpenAI",
  };

  it("accepts a minimal valid request", () => {
    expect(RoutineGenerateSchema.safeParse(base).success).toBe(true);
  });

  it("limits rest days to two and validates client_today format", () => {
    expect(RoutineGenerateSchema.safeParse({ ...base, restDays: ["Mon", "Tue", "Wed"] }).success).toBe(false);
    expect(RoutineGenerateSchema.safeParse({ ...base, client_today: "15/11/2026" }).success).toBe(false);
    expect(RoutineGenerateSchema.safeParse({ ...base, client_today: "2026-11-15" }).success).toBe(true);
  });

  it("rejects under-13s", () => {
    expect(RoutineGenerateSchema.safeParse({ ...base, age: 12 }).success).toBe(false);
  });
});

describe("safeParseWithError / parseOrThrow", () => {
  it("formats issues as 'path: message' joined by '; '", () => {
    const r = safeParseWithError(LoginSchema, { username: "ab", password: "1" });
    expect(r).toEqual({
      success: false,
      error: "username: Username must be at least 3 characters; password: Password must be at least 6 characters",
    });
  });

  it("returns parsed data on success", () => {
    expect(safeParseWithError(LoginSchema, { username: "abc", password: "123456" })).toEqual({
      success: true,
      data: { username: "abc", password: "123456" },
    });
  });

  it("parseOrThrow prefixes the context", () => {
    expect(() => parseOrThrow(LoginSchema, {}, "login")).toThrow(/^login: username: /);
  });
});
