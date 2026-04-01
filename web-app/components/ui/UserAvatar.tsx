'use client'

import { useMemo } from 'react'

const GRADIENT_PAIRS = [
  ['#8B5CF6', '#06B6D4'],
  ['#F43F5E', '#F59E0B'],
  ['#10B981', '#22D3EE'],
  ['#EC4899', '#8B5CF6'],
  ['#F59E0B', '#EF4444'],
  ['#06B6D4', '#8B5CF6'],
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
