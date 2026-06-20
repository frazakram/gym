'use client'

import { useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, Sparkles } from 'lucide-react'
import { SheetModal } from './SheetModal'
import { compressImage } from '@/lib/image-utils'
import type { DraftFoodItem, PhotoRecognitionResult } from '@/types'

interface PhotoLogModalProps {
  open: boolean
  onClose: () => void
  recognize: (dataUrl: string) => Promise<PhotoRecognitionResult>
  /** Recognition succeeded — hand the editable draft to the parent. */
  onRecognized: (items: DraftFoodItem[]) => void
  /** Recognition unavailable/failed — parent should open manual search. */
  onFallback: (reason?: string) => void
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const REASON_COPY: Record<string, string> = {
  not_configured: 'Photo recognition isn’t set up. Search for your food instead.',
  no_match: 'Couldn’t identify the meal. Try manual search.',
  low: 'Low confidence — switching to manual search.',
  error: 'Recognition failed. Try manual search.',
  invalid_image: 'That image couldn’t be read. Try another photo or search.',
}

export function PhotoLogModal({ open, onClose, recognize, onRecognized, onFallback }: PhotoLogModalProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      setStage('Optimizing photo…')
      const compressed = await compressImage(file)
      const dataUrl = await fileToDataUrl(compressed)
      setPreview(dataUrl)
      setStage('Analyzing your meal…')
      const result = await recognize(dataUrl)
      if (result.ok && result.items.length > 0) {
        onRecognized(result.items)
      } else {
        onFallback(result.reason)
      }
    } catch {
      onFallback('error')
    } finally {
      setBusy(false)
      setStage('')
      setPreview(null)
    }
  }

  return (
    <SheetModal
      open={open}
      onClose={onClose}
      title="Log by photo"
      subtitle="Snap your meal — you’ll review and edit before it’s logged."
    >
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {busy ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-28 h-28 rounded-2xl object-cover border border-white/10" />
          )}
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-muted">{stage}</p>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/25 hover:bg-primary/15 transition-colors"
          >
            <span className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary-light" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-white">Take a photo</span>
              <span className="block text-xs text-muted">Use your camera</span>
            </span>
          </button>
          <button
            onClick={() => libraryRef.current?.click()}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
          >
            <span className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-white/80" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-white">Choose from library</span>
              <span className="block text-xs text-muted">Upload an existing photo</span>
            </span>
          </button>
          <p className="flex items-center gap-1.5 text-[11px] text-muted pt-1">
            <Sparkles className="w-3.5 h-3.5 text-primary-light" />
            Nothing is logged until you confirm. Photos aren’t stored.
          </p>
        </div>
      )}
    </SheetModal>
  )
}

/** Exposed for tests / reuse if a reason needs human-readable copy. */
export function photoFallbackCopy(reason?: string): string {
  return (reason && REASON_COPY[reason]) || 'Switching to manual search.'
}
