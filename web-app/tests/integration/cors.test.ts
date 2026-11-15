import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as getProfile } from "@/app/api/profile/route";
import { GET as billingStatus } from "@/app/api/billing/status/route";
import { asHandler, call, newUser } from "./helpers";

// The app (and its Android TWA) is same-origin; no cross-origin access is granted.
const CORS_HEADERS = ["access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers"];

function corsHeadersOf(response: Response) {
  return CORS_HEADERS.filter((name) => response.headers.has(name));
}

describe("API responses grant no cross-origin access", () => {
  it("on success, client error and auth error responses", async () => {
    const { id, username } = await newUser("cors");
    const responses = await Promise.all([
      call(asHandler(getProfile), { path: "/api/profile", userId: id }),
      call(asHandler(getProfile), { path: "/api/profile" }),
      call(asHandler(billingStatus), { path: "/api/billing/status", userId: id }),
      call(asHandler(login), { method: "POST", path: "/api/auth/login", body: { username, password: "Wrong@1234" }, csrf: false }),
    ]);

    expect(responses.map((r) => r.status)).toEqual([200, 401, 200, 401]);
    for (const { res } of responses) {
      expect(corsHeadersOf(res)).toEqual([]);
    }
  });
});
