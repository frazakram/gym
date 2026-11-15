import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as createSubscription } from "@/app/api/billing/subscription/create/route";
import { PATCH as setCoachStatus } from "@/app/api/admin/coaches/[id]/route";
import { asHandler, call, newUser } from "./helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API error responses", () => {
  it("does not reveal internal configuration details on unexpected errors", async () => {
    const { id } = await newUser("err");
    const response = await call(asHandler(createSubscription), {
      method: "POST",
      path: "/api/billing/subscription/create",
      userId: id,
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(response.body)).not.toMatch(/RAZORPAY|configuration/i);
  });

  it("answers invalid admin input with 400 and a readable message, not a 500", async () => {
    const admin = await newUser("admin");
    vi.stubEnv("ADMIN_USER_IDS", String(admin.id));

    const response = await call(asHandler(setCoachStatus), {
      method: "PATCH",
      path: "/api/admin/coaches/1",
      userId: admin.id,
      params: { id: "1" },
      body: { status: "promoted" },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/^status: /);
  });
});
