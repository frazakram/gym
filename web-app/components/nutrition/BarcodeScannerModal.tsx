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
 * Camera barcode scanner (@zxing/browser), preferring the rear camera. Falls
 * back to manual entry when the camera is unavailable or permission is denied.
 */
export function BarcodeScannerModal({ open, onClose, onDetected }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [manual, setManual] = useState(false)
  const [manualValue, setManualValue] = useState('')

  useEffect(() => {
    if (!open || manual) return
    let cancelled = false
    setStatus('starting')

    // Dynamic import keeps the browser-only @zxing module out of SSR.
    import('@zxing/browser')
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        return reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result, _err, controls) => {
            controlsRef.current = controls
            if (cancelled) {
              controls.stop()
              return
            }
            setStatus('scanning')
            if (result) {
              const text = result.getText().replace(/\D/g, '')
              if (text.length >= 6) {
                controls.stop()
                onDetected(text)
              }
            }
          }
        )
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
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
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {/* Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-24 border-2 border-primary/70 rounded-xl shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
            <ScanLine className="absolute w-10 h-10 text-primary/80 animate-pulse" />
          </div>
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Starting camera…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90 px-6 text-center">
              <p className="text-sm font-medium">Camera unavailable</p>
              <p className="text-xs text-white/60">Grant camera permission, or enter the barcode manually below.</p>
            </div>
          )}
        </div>
      )}
    </SheetModal>
  )
}
