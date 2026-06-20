'use client'

import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { Loader2, Keyboard, ScanLine } from 'lucide-react'
import { SheetModal } from './SheetModal'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  /** Called once a barcode is read or typed. */
  onDetected: (barcode: string) => void
}

/**
 * Camera barcode scanner (@zxing/browser). Acquires the rear camera explicitly
 * via getUserMedia (clear permission/secure-context errors), then decodes from
 * the live <video>. Falls back to manual entry whenever the camera is
 * unavailable, blocked, or the page isn't a secure context (http over LAN).
 */
export function BarcodeScannerModal({ open, onClose, onDetected }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [manual, setManual] = useState(false)
  const [manualValue, setManualValue] = useState('')

  useEffect(() => {
    if (!open || manual) return
    let cancelled = false
    let stream: MediaStream | null = null
    const videoEl = videoRef.current
    setStatus('starting')
    setErrorMsg('')

    const fail = (msg: string) => {
      if (cancelled) return
      setStatus('error')
      setErrorMsg(msg)
    }

    const start = async () => {
      // getUserMedia only exists in a secure context (HTTPS or localhost).
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        fail('Camera needs HTTPS or localhost. Use “Enter barcode manually” below.')
        return
      }
      try {
        // Prefer the rear camera, but don't hard-require it (desktops only have a
        // front camera). `ideal` lets the browser fall back gracefully.
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        video.srcObject = stream
        await video.play().catch(() => {})
        setStatus('scanning')

        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        controlsRef.current = await reader.decodeFromVideoElement(video, (result) => {
          if (cancelled || !result) return
          const text = result.getText().replace(/\D/g, '')
          if (text.length >= 6) {
            cancelled = true
            onDetected(text)
          }
        })
      } catch (err) {
        const name = (err as { name?: string } | null)?.name
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          fail('Camera permission was blocked. Allow camera access, or enter the barcode manually.')
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          fail('No camera available. Enter the barcode manually below.')
        } else {
          fail('Could not start the camera. Enter the barcode manually below.')
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      stream?.getTracks().forEach((t) => t.stop())
      if (videoEl) videoEl.srcObject = null
    }
  }, [open, manual, onDetected])

  // Reset to camera mode whenever reopened.
  useEffect(() => {
    if (open) {
      setManual(false)
      setManualValue('')
    }
  }, [open])

  const submitManual = () => {
    const code = manualValue.replace(/\D/g, '')
    if (code.length >= 6) onDetected(code)
  }

  return (
    <SheetModal
      open={open}
      onClose={onClose}
      title="Scan barcode"
      subtitle={manual ? 'Type the number under the barcode' : 'Point your camera at a product barcode'}
      footer={
        manual ? (
          <button
            onClick={submitManual}
            disabled={manualValue.replace(/\D/g, '').length < 6}
            className="w-full py-3 rounded-xl text-sm font-semibold text-accent-ink bg-gradient-to-r from-primary to-primary-light disabled:opacity-50"
          >
            Look up barcode
          </button>
        ) : (
          <button
            onClick={() => setManual(true)}
            className="w-full py-3 rounded-xl text-sm font-medium text-muted border border-white/12 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2"
          >
            <Keyboard className="w-4 h-4" /> Enter barcode manually
          </button>
        )
      }
    >
      {manual ? (
        <input
          autoFocus
          inputMode="numeric"
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitManual()}
          placeholder="e.g. 3017620422003"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-primary/15 text-white text-center tracking-widest focus:outline-none focus:border-primary/40"
        />
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
          {/* Video is always mounted while scanning so the ref is ready before getUserMedia resolves */}
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
          {/* Reticle */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-24 border-2 border-primary/70 rounded-xl shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
              <ScanLine className="absolute w-10 h-10 text-primary/80 animate-pulse" />
            </div>
          )}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Starting camera…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90 px-6 text-center">
              <p className="text-sm font-medium">Camera unavailable</p>
              <p className="text-xs text-white/60">{errorMsg}</p>
            </div>
          )}
        </div>
      )}
    </SheetModal>
  )
}
