'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToasts, type Toast } from '@/lib/toast'

// ─── Style A: Slide & Burn (error / warning — right side, sticky) ───────────

function SlideItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setExiting(true)
    setTimeout(() => onRemove(t.id), 350)
  }, [t.id, onRemove])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    if (t.duration) {
      timerRef.current = setTimeout(dismiss, t.duration)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isError = t.type === 'error'
  const accent = isError ? '#ef4444' : '#f59e0b'
  const iconBg = isError ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'
  const icon = isError ? '🚨' : '⚠️'

  return (
    <div
      className={`toast-a${visible && !exiting ? ' toast-a-show' : ''}${exiting ? ' toast-a-exit' : ''}`}
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px 14px 14px 12px' }}>
        <div style={{ background: iconBg, borderRadius: 8, padding: 6, fontSize: 16, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
            {t.title}
          </div>
          {t.message && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.4 }}>
              {t.message}
            </div>
          )}
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); dismiss() }}
              style={{
                marginTop: 8, fontSize: 11, fontWeight: 600, color: accent,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, textDecoration: 'underline',
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            color: '#475569', background: 'none', border: 'none', cursor: 'pointer',
            padding: 2, fontSize: 15, lineHeight: 1, flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
      {t.duration && (
        <div
          style={{
            height: 3,
            background: accent,
            opacity: 0.55,
            transformOrigin: 'left',
            animation: `toast-progress ${t.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  )
}

// ─── Style B: Glass Drop (success / info — top center, pill, auto-dismiss) ──

function GlassItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const exitingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (exitingRef.current) return
    exitingRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    setExiting(true)
    setTimeout(() => onRemove(t.id), 300)
  }, [t.id, onRemove])

  const startTimer = useCallback(() => {
    if (!t.duration || exitingRef.current) return
    timerRef.current = setTimeout(dismiss, t.duration)
  }, [t.duration, dismiss])

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    startTimer()
    return clearTimer
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isSuccess = t.type === 'success'
  const dotColor = isSuccess ? '#22c55e' : '#7c3aed'
  const icon = isSuccess ? '✅' : 'ℹ️'
  const actionBg = isSuccess ? '#22c55e' : '#7c3aed'

  return (
    <div
      className={`toast-b${visible && !exiting ? ' toast-b-show' : ''}${exiting ? ' toast-b-exit' : ''}`}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      <span
        style={{
          width: 8, height: 8, borderRadius: '50%', background: dotColor,
          flexShrink: 0, display: 'inline-block',
          animation: 'toast-dot-pulse 1.5s ease-in-out infinite',
        }}
      />
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{t.title}</span>
        {t.message && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{t.message}</div>
        )}
      </div>
      {t.action && (
        <button
          onClick={() => { t.action!.onClick(); dismiss() }}
          style={{
            padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600,
            background: actionBg, color: '#fff', border: 'none', cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {t.action.label}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          color: '#475569', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, lineHeight: 1, flexShrink: 0, padding: 2,
        }}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Style D: Glow Card (payment — center overlay, single instance) ──────────

function GlowItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onRemove(t.id), 300)
  }, [t.id, onRemove])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        animation: exiting
          ? 'toast-d-backdrop-out 300ms ease forwards'
          : 'toast-d-backdrop-in 200ms ease forwards',
      }}
      onClick={dismiss}
    >
      <div
        className={`toast-d${visible && !exiting ? ' toast-d-show' : ''}${exiting ? ' toast-d-exit' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 40, animation: 'toast-emoji-bounce 550ms cubic-bezier(.34,1.56,.64,1) forwards' }}>
          💥
        </div>
        <div style={{
          fontSize: 17, fontWeight: 800, color: '#fca5a5',
          textAlign: 'center', marginTop: 10, letterSpacing: '-0.01em',
        }}>
          {t.title}
        </div>
        {t.message && (
          <div style={{
            fontSize: 13, color: '#94a3b8', textAlign: 'center',
            lineHeight: 1.5, marginTop: 6, maxWidth: 220,
          }}>
            {t.message}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, width: '100%' }}>
          <button
            onClick={dismiss}
            style={{
              flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600,
              color: '#94a3b8', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); dismiss() }}
              style={{
                flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600,
                color: '#fff', background: '#ef4444', border: 'none', cursor: 'pointer',
                boxShadow: '0 0 16px rgba(239,68,68,0.4)',
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Root provider ────────────────────────────────────────────────────────────

export function ToastProvider() {
  const [slideToasts, setSlideToasts] = useState<Toast[]>([])
  const [glassToasts, setGlassToasts] = useState<Toast[]>([])
  const [paymentToast, setPaymentToast] = useState<Toast | null>(null)

  const removeSlide = useCallback((id: string) => {
    setSlideToasts(p => p.filter(t => t.id !== id))
  }, [])

  const removeGlass = useCallback((id: string) => {
    setGlassToasts(p => p.filter(t => t.id !== id))
  }, [])

  const removePayment = useCallback((id: string) => {
    setPaymentToast(p => (p?.id === id ? null : p))
  }, [])

  useEffect(() => {
    const unsub = subscribeToasts((t) => {
      if (t.type === 'payment') {
        setPaymentToast(t)
      } else if (t.type === 'error' || t.type === 'warning') {
        setSlideToasts(p => [...p.slice(-2), t])
      } else {
        setGlassToasts(p => [...p.slice(-2), t])
      }
    })
    return unsub
  }, [])

  return (
    <>
      {/* Colocated keyframe definitions — no separate CSS file needed */}
      <style>{`
        /* ── Style A: Slide & Burn ──────────────────────────────── */
        .toast-a {
          width: min(300px, calc(100vw - 32px));
          background: #0d1117;
          border: 1.5px solid #1a2235;
          border-radius: 16px;
          overflow: hidden;
          transform: translateX(110%);
          transition: transform 450ms cubic-bezier(.34,1.56,.64,1);
          will-change: transform;
        }
        .toast-a-show  { transform: translateX(0); }
        .toast-a-exit  {
          transform: translateX(110%) !important;
          transition: transform 350ms ease-in !important;
        }

        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }

        /* ── Style B: Glass Drop ────────────────────────────────── */
        .toast-b {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 50px;
          background: rgba(13,11,32,.88);
          border: 1.5px solid rgba(255,255,255,.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          max-width: min(440px, calc(100vw - 32px));
          white-space: nowrap;
          transform: translateY(-110%);
          opacity: 1;
          transition: transform 500ms cubic-bezier(.34,1.56,.64,1),
                      opacity 300ms ease;
          will-change: transform, opacity;
        }
        .toast-b-show { transform: translateY(0); }
        .toast-b-exit {
          transform: translateY(-80%) !important;
          opacity: 0 !important;
          transition: transform 300ms ease-in !important,
                      opacity 300ms ease !important;
        }

        @keyframes toast-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.75); }
        }

        /* ── Style D: Glow Card ─────────────────────────────────── */
        .toast-d {
          width: 280px;
          background: #0d0a20;
          border: 1.5px solid rgba(239,68,68,.35);
          border-radius: 24px;
          padding: 28px 24px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: scale(0.8);
          opacity: 0;
          will-change: transform, opacity, box-shadow;
        }
        .toast-d-show {
          animation: toast-d-in 550ms cubic-bezier(.34,1.56,.64,1) forwards,
                     toast-glow-pulse 2s ease 550ms infinite;
        }
        .toast-d-exit {
          animation: toast-d-out 300ms ease forwards !important;
        }

        @keyframes toast-d-in {
          0%   { transform: scale(0.8); opacity: 0; }
          70%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes toast-d-out {
          from { transform: scale(1); opacity: 1; }
          to   { transform: scale(0.9); opacity: 0; }
        }
        @keyframes toast-glow-pulse {
          0%, 100% { box-shadow: 0 0 32px 4px rgba(239,68,68,.3); }
          50%       { box-shadow: 0 0 48px 8px rgba(239,68,68,.5); }
        }
        @keyframes toast-emoji-bounce {
          0%   { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(5deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes toast-d-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toast-d-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {/* Style B: top-center stack, newest on top */}
      <div
        style={{
          position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9000, display: 'flex', flexDirection: 'column',
          gap: 8, alignItems: 'center', pointerEvents: 'none',
        }}
      >
        {glassToasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <GlassItem t={t} onRemove={removeGlass} />
          </div>
        ))}
      </div>

      {/* Style A: right-side stack, newest on bottom */}
      <div
        style={{
          position: 'fixed', right: 16, top: 64,
          zIndex: 9000, display: 'flex', flexDirection: 'column',
          gap: 8, pointerEvents: 'none',
        }}
      >
        {slideToasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <SlideItem t={t} onRemove={removeSlide} />
          </div>
        ))}
      </div>

      {/* Style D: center overlay, single instance */}
      {paymentToast && <GlowItem t={paymentToast} onRemove={removePayment} />}
    </>
  )
}
