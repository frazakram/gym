import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as createSubscription } from "@/app/api/billing/subscription/create/route";
import { POST as analyzeBody } from "@/app/api/body/analyze/route";
import { POST as analyzeGym } from "@/app/api/gym/analyze/route";
import { DELETE as deleteBooking, PATCH as cancelBooking } from "@/app/api/coach/bookings/[id]/route";
import { PATCH as updateCoachProfile } from "@/app/api/coach/me/route";
import { PATCH as setCoachStatus } from "@/app/api/admin/coaches/[id]/route";
import { PATCH as setBookingStatus } from "@/app/api/admin/coach/bookings/[id]/route";
import { DELETE as resetRoutines } from "@/app/api/routines/reset/route";
import { POST as saveUserLocation } from "@/app/api/user-location/route";
import { asHandler, call, newUser } from "./helpers";

type StateChangingRoute = {
  name: string;
  handler: unknown;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  params?: Record<string, string>;
  body?: unknown;
};

const STATE_CHANGING_ROUTES: StateChangingRoute[] = [
  { name: "billing/subscription/create", handler: createSubscription, method: "POST", path: "/api/billing/subscription/create" },
  { name: "body/analyze", handler: analyzeBody, method: "POST", path: "/api/body/analyze", body: { images: ["data:image/png;base64,AA=="] } },
  { name: "gym/analyze", handler: analyzeGym, method: "POST", path: "/api/gym/analyze", body: { images: ["data:image/png;base64,AA=="] } },
  { name: "coach/bookings/[id] PATCH", handler: cancelBooking, method: "PATCH", path: "/api/coach/bookings/1", params: { id: "1" }, body: { action: "cancel" } },
  { name: "coach/bookings/[id] DELETE", handler: deleteBooking, method: "DELETE", path: "/api/coach/bookings/1", params: { id: "1" } },
  { name: "coach/me PATCH", handler: updateCoachProfile, method: "PATCH", path: "/api/coach/me", body: { bio: "x" } },
  { name: "admin/coaches/[id] PATCH", handler: setCoachStatus, method: "PATCH", path: "/api/admin/coaches/1", params: { id: "1" }, body: { status: "approved" } },
  { name: "admin/coach/bookings/[id] PATCH", handler: setBookingStatus, method: "PATCH", path: "/api/admin/coach/bookings/1", params: { id: "1" }, body: { status: "confirmed" } },
  { name: "routines/reset", handler: resetRoutines, method: "DELETE", path: "/api/routines/reset" },
  { name: "user-location", handler: saveUserLocation, method: "POST", path: "/api/user-location", body: { latitude: 12.97, longitude: 77.59 } },
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CSRF is required on every state-changing route", () => {
  it.each(STATE_CHANGING_ROUTES.map((route) => [route.name, route] as const))(
    "%s rejects an authenticated request without a CSRF token",
    async (_name, route) => {
      const { id } = await newUser("csrf");
      vi.stubEnv("ADMIN_USER_IDS", String(id)); // let admin routes get past the admin check

      const response = await call(asHandler(route.handler), {
        method: route.method,
        path: route.path,
        params: route.params,
        body: route.body,
        userId: id,
        csrf: false,
      });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Missing CSRF cookie" });
    },
  );
});
