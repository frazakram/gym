'use client'

import { useMemo } from 'react'

const GRADIENT_PAIRS = [
  ['var(--primary)', 'var(--cyan-dark)'],
  ['var(--error)', 'var(--gold)'],
  ['var(--accent)', 'var(--cyan)'],
  ['#EC4899', 'var(--primary)'],
  ['var(--gold)', '#EF4444'],
  ['var(--cyan-dark)', 'var(--primary)'],
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

interface UserAvatarProps {
  name?: string | null
  username?: string | null
  size?: number
  className?: string
}

export function UserAvatar({ name, username, size = 44, className = '' }: UserAvatarProps) {
  const displayName = name || username || 'U'
  const initials = getInitials(displayName)

  const gradientPair = useMemo(() => {
    const idx = hashString(displayName) % GRADIENT_PAIRS.length
    return GRADIENT_PAIRS[idx]
  }, [displayName])

  const fontSize = Math.max(10, size * 0.38)

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${gradientPair[0]}, ${gradientPair[1]})`,
      }}
      aria-label={`Avatar for ${displayName}`}
      role="img"
    >
      <span
        className="font-bold text-white drop-shadow-sm select-none"
        style={{ fontSize }}
      >
        {initials}
      </span>
    </div>
  )
}
