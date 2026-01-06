'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type GlassSelectOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  label: string
  value: T
  options: GlassSelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}

export function GlassSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  className = '',
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const selected = useMemo(
    () => options.find((o) => o.value === value) || options[0],
    [options, value]
  )

  useEffect(() => {
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
    setActiveIndex(idx)
  }, [options, value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(options.length - 1, i + 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = options[activeIndex]
      if (opt) onChange(opt.value)
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <div
      ref={rootRef}
      className={`relative ${open ? 'z-[9999] isolate' : 'z-0'} ${className}`}
    >
      <label className="block text-sm font-medium text-slate-200/90 mb-2">{label}</label>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={onKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full px-4 py-3 glass-soft rounded-xl text-left text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{selected?.label ?? ''}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-80">
              <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {open && (
          <div
            role="listbox"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className="absolute z-[9999] mt-2 w-full overflow-hidden rounded-2xl glass-menu shadow-2xl"
          >
            <div className="max-h-64 overflow-auto p-1">
              {options.map((opt, idx) => {
                const isSelected = opt.value === value
                const isActive = idx === activeIndex
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                      buttonRef.current?.focus()
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                        : isActive
                          ? 'bg-white/10 text-slate-100'
                          : 'text-slate-200/85 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


