"use client";

import { useCallback, useEffect, useState } from "react";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Get CSRF token from cookies
 */
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Custom hook to manage CSRF tokens in React components
 * 
 * Usage:
 * ```tsx
 * const { csrfToken, csrfHeaders, refreshCsrfToken, isLoading } = useCsrf();
 * 
 * // Use csrfHeaders in fetch requests
 * fetch('/api/profile', {
 *   method: 'PUT',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...csrfHeaders,
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from cookie on mount
  useEffect(() => {
    const token = getCsrfTokenFromCookie();
    if (token) {
      setCsrfToken(token);
    } else {
      // If no token in cookie, fetch one
      refreshCsrfToken();
    }
  }, []);

  // Function to refresh CSRF token from server
  const refreshCsrfToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/csrf", {
        method: "GET",
        credentials: "include", // Important for cookies
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch CSRF token: ${res.status}`);
      }

      const data = await res.json();
      setCsrfToken(data.token);
      return data.token;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch CSRF token";
      setError(message);
      console.error("CSRF token fetch error:", message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Headers object to include in fetch requests
  const csrfHeaders: Record<string, string> = csrfToken
    ? { [CSRF_HEADER_NAME]: csrfToken }
    : {};

  return {
    csrfToken,
    csrfHeaders,
    refreshCsrfToken,
    isLoading,
    error,
  };
}

/**
 * Standalone function to get CSRF headers for fetch requests
 * Use this when you can't use hooks (e.g., in utility functions)
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfTokenFromCookie();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}

/**
 * Enhanced fetch function that automatically includes CSRF headers
 * 
 * Usage:
 * ```ts
 * const response = await csrfFetch('/api/profile', {
 *   method: 'PUT',
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  
  // Skip CSRF for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return fetch(url, options);
  }

  const csrfToken = getCsrfTokenFromCookie();
  
  // If no token, try to get one first
  if (!csrfToken) {
    try {
      const res = await fetch("/api/csrf", { credentials: "include" });
      if (res.ok) {
        // Token should now be in cookie, retry
        const newToken = getCsrfTokenFromCookie();
        if (newToken) {
          return fetch(url, {
            ...options,
            credentials: "include",
            headers: {
              ...options.headers,
              [CSRF_HEADER_NAME]: newToken,
            },
          });
        }
      }
    } catch {
      // Continue without CSRF if we can't get a token
    }
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
    },
  });
}

/**
 * Check if a response indicates CSRF failure
 */
export function isCsrfError(response: Response): boolean {
  return (
    response.status === 403 &&
    response.headers.get("content-type")?.includes("application/json") === true
  );
}

/**
 * Retry a request after refreshing CSRF token
 */
export async function retryWithNewCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Fetch new CSRF token
  const csrfRes = await fetch("/api/csrf", { credentials: "include" });
  if (!csrfRes.ok) {
    throw new Error("Failed to refresh CSRF token");
  }

  const newToken = getCsrfTokenFromCookie();
  if (!newToken) {
    throw new Error("No CSRF token after refresh");
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      [CSRF_HEADER_NAME]: newToken,
    },
  });
}
