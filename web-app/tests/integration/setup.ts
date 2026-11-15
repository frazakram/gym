import { vi } from "vitest";

// Route handlers read the session via next/headers cookies(), which only works
// inside a Next request scope. Back it with an in-memory jar the helpers control.
vi.mock("next/headers", async () => {
  const { cookieJar } = await import("./jar");
  return {
    cookies: async () => ({
      get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
      getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
      has: (name: string) => cookieJar.has(name),
      set: (name: string, value: string) => void cookieJar.set(name, value),
      delete: (name: string) => void cookieJar.delete(name),
    }),
    headers: async () => new Headers(),
  };
});

// unstable_cache/revalidateTag need Next's incremental cache. Pass through so
// every read hits the database (caching behaviour is out of scope here).
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));
