import { describe, expect, it, vi } from "vitest";

describe("toast bus", () => {
  it("delivers a toast raised before the provider subscribes (page mount effects run first)", async () => {
    vi.resetModules();
    const { toastError, subscribeToasts } = await import("@/lib/toast");
    toastError("Google sign-in failed", "Please try again.");

    const received = vi.fn();
    const unsubscribe = subscribeToasts(received);
    expect(received).toHaveBeenCalledTimes(1);
    expect(received.mock.calls[0][0]).toMatchObject({ type: "error", title: "Google sign-in failed" });
    unsubscribe();
  });

  it("delivers live toasts to subscribers and does not replay them to later ones", async () => {
    vi.resetModules();
    const { toastInfo, subscribeToasts } = await import("@/lib/toast");
    const first = vi.fn();
    const unsubscribeFirst = subscribeToasts(first);
    toastInfo("Saved");
    expect(first).toHaveBeenCalledTimes(1);

    const second = vi.fn();
    const unsubscribeSecond = subscribeToasts(second);
    expect(second).not.toHaveBeenCalled();
    unsubscribeFirst();
    unsubscribeSecond();
  });
});
