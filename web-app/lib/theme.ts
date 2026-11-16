/**
 * Light / dark theme for the Navy and Pink design.
 *
 * The theme is applied as data-theme="light" | "dark" on <html>; colour
 * tokens live in app/design-tokens.css. A small inline script
 * (themeInitScript) sets the attribute before first paint, so a page never
 * flashes the wrong theme.
 *
 * Dark mode stays unavailable until every screen is migrated to the new
 * tokens; until then everyone sees light, whatever they or their phone prefer.
 */

/** Flip to true once every screen uses the design tokens (end of the redesign). */
export const DARK_MODE_AVAILABLE = false;

export const THEME_STORAGE_KEY = "gymbro-theme";

export type ThemeChoice = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveTheme({
  choice,
  systemPrefersDark,
  darkModeAvailable = DARK_MODE_AVAILABLE,
}: {
  choice: ThemeChoice;
  systemPrefersDark: boolean;
  darkModeAvailable?: boolean;
}): Theme {
  if (!darkModeAvailable) return "light";
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

/**
 * Runs in <head> before React. Plain ES5, no imports; mirrors resolveTheme
 * (tests/unit/theme.test.ts runs both against the same inputs).
 */
export const themeInitScript = `(function () {
  var choice = "system";
  try { choice = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "system"; } catch (e) {}
  if (choice !== "light" && choice !== "dark") choice = "system";
  var prefersDark = false;
  try { prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
  var available = ${DARK_MODE_AVAILABLE ? "true" : "false"};
  var theme = !available ? "light" : choice === "system" ? (prefersDark ? "dark" : "light") : choice;
  document.documentElement.setAttribute("data-theme", theme);
})();`;
