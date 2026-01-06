'use client'

import { useState } from 'react'

type Props = {
  /** Public path, e.g. "/logo.png". If omitted, we try common filenames automatically. */
  src?: string
  alt?: string
  size?: number
  className?: string
}

export function BrandLogo({
  src,
  alt = 'GymBro AI logo',
  size = 44,
  className = '',
}: Props) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [srcIndex, setSrcIndex] = useState(0)

  const candidates = src
    ? [src]
    : ['/logo.png', '/logo.webp', '/logo.jpg', '/logo.jpeg', '/logo.svg']

  const activeSrc = candidates[Math.min(srcIndex, candidates.length - 1)]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-lg shadow-cyan-500/10 ${className}`}
      style={{ width: size, height: size }}
      aria-label={alt}
      role="img"
    >
      {/* Fallback badge sits behind the image (prevents “broken image” icon from showing). */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
        <span className="text-white font-extrabold tracking-tight">G</span>
      </div>

      {!broken && (
        <img
          key={activeSrc}
          src={activeSrc}
          alt="" // avoid alt text wrapping when image can't load
          width={size}
          height={size}
          draggable={false}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 200ms ease' }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            // Helpful debug for local dev (won't crash prod)
            // eslint-disable-next-line no-console
            console.warn('[BrandLogo] failed to load:', activeSrc)
            // Try next candidate (e.g., user placed logo.webp instead of logo.png)
            if (srcIndex < candidates.length - 1) {
              setSrcIndex(srcIndex + 1)
              setLoaded(false)
              return
            }
            setBroken(true)
            setLoaded(false)
          }}
        />
      )}
    </div>
  )
}


