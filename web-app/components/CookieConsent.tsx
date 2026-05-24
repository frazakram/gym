"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "gymbro-cookie-consent-v1";

type ConsentValue = "accepted" | "rejected";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== "accepted" && stored !== "rejected") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function record(value: ConsentValue) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[60] md:inset-x-auto md:right-4 md:bottom-4 md:max-w-md"
    >
      <div className="glass rounded-2xl border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-white">We use cookies</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          We use essential cookies to keep you signed in and to remember your
          preferences. We also send AI prompts and responses to LangSmith for
          quality monitoring. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => record("rejected")}
            className="flex-1 rounded-xl border border-white/20 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/5"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={() => record("accepted")}
            className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-accent-ink transition hover:bg-primary-dark"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
