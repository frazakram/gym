import { describe, expect, it } from "vitest";
import { parseThemeChoice, resolveTheme, themeInitScript, toggledChoice } from "@/lib/theme";

describe("resolveTheme", () => {
  it("is always light when dark mode is switched off", () => {
    for (const choice of ["light", "dark", "system"] as const) {
      for (const systemPrefersDark of [true, false]) {
        expect(resolveTheme({ choice, systemPrefersDark, darkModeAvailable: false })).toBe("light");
      }
    }
  });

  it("uses an explicit choice once dark mode is available", () => {
    expect(resolveTheme({ choice: "dark", systemPrefersDark: false, darkModeAvailable: true })).toBe("dark");
    expect(resolveTheme({ choice: "light", systemPrefersDark: true, darkModeAvailable: true })).toBe("light");
  });

  it("follows the phone setting for 'system'", () => {
    expect(resolveTheme({ choice: "system", systemPrefersDark: true, darkModeAvailable: true })).toBe("dark");
    expect(resolveTheme({ choice: "system", systemPrefersDark: false, darkModeAvailable: true })).toBe("light");
  });
});

describe("parseThemeChoice", () => {
  it("accepts the three choices and falls back to 'system' for anything else", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("system")).toBe("system");
    for (const junk of [null, "", "DARK", "blue", "<script>"]) expect(parseThemeChoice(junk)).toBe("system");
  });
});

describe("themeInitScript (runs before first paint, so there is no flash of the wrong theme)", () => {
  function runScript(stored: string | null, prefersDark: boolean): string | null {
    const attributes: Record<string, string> = {};
    const fakeWindow = {
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: prefersDark }),
    };
    const fakeDocument = { documentElement: { setAttribute: (k: string, v: string) => { attributes[k] = v; } } };
    new Function("window", "document", "localStorage", themeInitScript)(fakeWindow, fakeDocument, fakeWindow.localStorage);
    return attributes["data-theme"] ?? null;
  }

  it("sets data-theme from the same rules as resolveTheme", () => {
    expect(runScript(null, true)).toBe(resolveTheme({ choice: "system", systemPrefersDark: true }));
    expect(runScript("dark", false)).toBe(resolveTheme({ choice: "dark", systemPrefersDark: false }));
  });

  it("never throws when storage is unavailable", () => {
    const fakeDocument = { documentElement: { setAttribute: () => {} } };
    const brokenStorage = { getItem: () => { throw new Error("blocked"); } };
    expect(() => new Function("window", "document", "localStorage", themeInitScript)({ localStorage: brokenStorage, matchMedia: () => ({ matches: false }) }, fakeDocument, brokenStorage)).not.toThrow();
  });
});

describe("toggledChoice (the sun/moon button)", () => {
  it("switches to the opposite of what is on screen, as an explicit choice", () => {
    expect(toggledChoice("light")).toBe("dark");
    expect(toggledChoice("dark")).toBe("light");
  });
});
