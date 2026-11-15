import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getCoach } from "@/app/api/coach/route";
import { POST as bookCoach } from "@/app/api/coach/book/route";
import { asHandler, call, newUser } from "./helpers";

const BOOKING_REQUEST = {
  userName: "Asha Rao",
  userEmail: "asha@example.com",
  userPhone: "+919800000000",
  message: "Form check please",
};

function bookDefaultCoach(userId: number) {
  return call(asHandler(bookCoach), { method: "POST", path: "/api/coach/book", userId, body: BOOKING_REQUEST });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("default coach contact details", () => {
  it("has no built-in phone/email when DEFAULT_COACH_* is not configured", async () => {
    vi.stubEnv("DEFAULT_COACH_PHONE", "");
    vi.stubEnv("DEFAULT_COACH_EMAIL", "");
    const { id } = await newUser("coach");

    const response = await call(asHandler(getCoach), { path: "/api/coach", userId: id });

    expect(response.status).toBe(200);
    expect(response.body.coach).toMatchObject({ phone: "", email: "" });
  });

  it("refuses a booking it could not deliver instead of silently dropping it", async () => {
    vi.stubEnv("DEFAULT_COACH_PHONE", "");
    vi.stubEnv("DEFAULT_COACH_EMAIL", "");
    const { id } = await newUser("coach");

    const response = await bookDefaultCoach(id);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Coach booking is temporarily unavailable. Please try again later.");
  });

  it("uses the configured contact details", async () => {
    vi.stubEnv("DEFAULT_COACH_PHONE", "+910000000001");
    vi.stubEnv("DEFAULT_COACH_EMAIL", "coach@example.com");
    const { id } = await newUser("coach");

    const coach = await call(asHandler(getCoach), { path: "/api/coach", userId: id });
    expect(coach.body.coach).toMatchObject({ phone: "+910000000001", email: "coach@example.com" });

    const booking = await bookDefaultCoach(id);
    expect(booking.status).toBe(200);
    expect(booking.body.coach).toMatchObject({ phone: "+910000000001", email: "coach@example.com" });
  });
});
