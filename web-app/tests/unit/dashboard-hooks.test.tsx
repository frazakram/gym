// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_SETTINGS_STORAGE_KEY, useAiSettings } from "@/hooks/useAiSettings";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

/**
 * In-memory Storage. Node >= 25 defines its own global localStorage (unusable
 * without --localstorage-file) that shadows jsdom's, so tests install this one
 * to behave the same on every Node version.
 */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(key: string) { return this.items.get(key) ?? null; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string) { this.items.delete(key); }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Renders a hook inside a throwaway component and returns its latest value. */
function renderHook<T>(useHook: () => T): { current: T } {
  const result = {} as { current: T };
  const report = (value: T) => {
    result.current = value;
  };
  function Probe({ onRender }: { onRender: (value: T) => void }) {
    onRender(useHook());
    return null;
  }
  act(() => root.render(<Probe onRender={report} />));
  return result;
}

describe("useAiSettings", () => {
  it("reads the settings the sidebar saved", () => {
    localStorage.setItem(
      AI_SETTINGS_STORAGE_KEY,
      JSON.stringify({ apiKey: "sk-user", modelProvider: "Anthropic", model: "claude-x" }),
    );
    const settings = renderHook(useAiSettings).current;
    expect([settings.userApiKey, settings.userModelProvider, settings.userModel]).toEqual(["sk-user", "Anthropic", "claude-x"]);
  });

  it("falls back to defaults when nothing or invalid JSON is stored", () => {
    expect(renderHook(useAiSettings).current).toMatchObject({ userApiKey: "", userModelProvider: "OpenAI", userModel: "" });
    act(() => root.unmount());
    root = createRoot(container);
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, "{not json");
    expect(renderHook(useAiSettings).current).toMatchObject({ userApiKey: "", userModelProvider: "OpenAI", userModel: "" });
  });

  it("exposes setters that update the values", () => {
    const settings = renderHook(useAiSettings);
    act(() => settings.current.setUserModelProvider("Anthropic"));
    expect(settings.current.userModelProvider).toBe("Anthropic");
  });
});

describe("usePremiumStatus", () => {
  it("loads the billing status and keeps it in state", async () => {
    const status = { premium: false, access: true, trial_active: true };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(status), { status: 200 }));
    const premium = renderHook(usePremiumStatus);

    let returned: unknown;
    await act(async () => {
      returned = await premium.current.fetchPremiumStatus();
    });

    expect(returned).toEqual(status);
    expect(premium.current.premiumStatus).toEqual(status);
  });

  it("returns null and keeps the previous status when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
    const premium = renderHook(usePremiumStatus);
    let returned: unknown = "unset";
    await act(async () => {
      returned = await premium.current.fetchPremiumStatus();
    });
    expect(returned).toBeNull();
    expect(premium.current.premiumStatus).toBeNull();
  });
});
