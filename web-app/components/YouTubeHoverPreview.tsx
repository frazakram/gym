"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { youTubeThumbnailUrl } from "@/lib/youtube";

type Props = {
  videoId: string;
  title?: string;
  className?: string;
  heightClassName?: string; // e.g. "h-36"
};

export default function YouTubeHoverPreview({
  videoId,
  title = "YouTube preview",
  className = "",
  heightClassName = "h-36",
}: Props) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  const thumb = useMemo(() => youTubeThumbnailUrl(videoId, "hqdefault"), [videoId]);
  const embedSrc = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      iv_load_policy: "3",
    });
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  }, [videoId]);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`mb-3 overflow-hidden rounded-xl ring-1 ring-white/10 bg-black relative ${heightClassName} ${className}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onTouchStart={() => {
        clearTimer();
        timerRef.current = window.setTimeout(() => setActive(true), 350);
      }}
      onTouchEnd={() => {
        clearTimer();
        setActive(false);
      }}
      onTouchCancel={() => {
        clearTimer();
        setActive(false);
      }}
      role="group"
      aria-label={`${title} preview`}
    >
      {active ? (
        <iframe
          className="w-full h-full"
          src={embedSrc}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt={`${title} thumbnail`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-semibold flex items-center gap-2">
              <span>Hover / Hold to preview</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .61-.03 1.3-.1 2.1-.06.8-.15 1.43-.28 1.9-.13.47-.38.85-.73 1.14-.35.29-.85.46-1.5.53-.65.07-1.46.12-2.43.15-1 .03-1.92.05-2.75.05L12 18c-.83 0-1.75-.02-2.75-.05-.97-.03-1.78-.08-2.43-.15-.65-.07-1.15-.24-1.5-.53-.35-.29-.6-.67-.73-1.14-.13-.47-.22-1.1-.28-1.9-.06-.8-.09-1.49-.09-2.09L4 12c0-.61.03-1.3.09-2.1.06-.8.15-1.43.28-1.9.13-.47.38-.85.73-1.14.35-.29.85-.46 1.5-.53.65-.07 1.46-.12 2.43-.15 1-.03 1.92-.05 2.75-.05L12 6c.83 0 1.75.02 2.75.05.97.03 1.78.08 2.43.15.65.07 1.15.24 1.5.53.35.29.6.67.73 1.14z" />
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


