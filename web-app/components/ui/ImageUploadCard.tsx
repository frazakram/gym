'use client'

import { useState, useRef, DragEvent } from 'react'
import { Camera, CheckCircle, Dumbbell, Upload, X, ImagePlus, AlertCircle } from 'lucide-react'
import type { GymPhoto, BodyPhoto } from '@/types'

type PhotoItem = GymPhoto | BodyPhoto

interface ImageUploadCardProps {
  images: PhotoItem[]
  maxImages: number
  maxSizeMB: number
  onUpload: (files: File[]) => Promise<void>
  onDelete: (id: string) => void
  loading?: boolean
  error?: string
  /** Controls which placeholder icon and copy to use */
  variant?: 'gym' | 'body'
}

export function ImageUploadCard({
  images,
  maxImages,
  maxSizeMB,
  onUpload,
  onDelete,
  loading = false,
  error,
  variant = 'gym',
}: ImageUploadCardProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasUploaded = images.length > 0

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    handleFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleFiles = (files: File[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const maxBytes = maxSizeMB * 1024 * 1024

    const valid = files.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop() || ''
      const validExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
      const typeOk =
        validTypes.includes(file.type) ||
        file.type.startsWith('image/') ||
        validExts.includes(ext)
      return typeOk && file.size <= maxBytes
    })

    if (valid.length > 0) setPendingFiles(prev => [...prev, ...valid])
  }

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return
    await onUpload(pendingFiles)
    setPendingFiles([])
  }

  const openFilePicker = () => fileInputRef.current?.click()

  const handleRemoveAll = async () => {
    setRemoving(true)
    try {
      for (const photo of images) {
        onDelete(photo.id)
      }
    } finally {
      setRemoving(false)
    }
  }

  const PlaceholderIcon = variant === 'body' ? Camera : Dumbbell

  // ─── State 3: Photos uploaded, no pending ─────────────────────────────────
  if (hasUploaded && pendingFiles.length === 0) {
    return (
      <div className="space-y-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
          onChange={handleFileInput}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
          disabled={loading}
        />

        {/* Placeholder card — no actual photo shown */}
        <button
          type="button"
          onClick={openFilePicker}
          disabled={loading}
          className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 flex flex-col items-center gap-3 hover:bg-emerald-500/12 active:scale-[0.98] transition-all disabled:opacity-50 group"
        >
          {/* Generic icon — NOT the actual photo */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <PlaceholderIcon className="w-8 h-8 text-emerald-400/80" />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#12121e] flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              {images.length} photo{images.length !== 1 ? 's' : ''} uploaded ✓
            </p>
            <p className="text-xs text-emerald-300/70 mt-0.5 group-hover:text-emerald-300 transition-colors">
              Tap to replace
            </p>
          </div>
        </button>

        {/* Remove all — subtle text link */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRemoveAll}
            disabled={loading || removing}
            className="text-xs text-muted hover:text-red-300 transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            {removing ? 'Removing…' : 'Remove all photos'}
          </button>
        </div>

        {error && <ErrorBanner message={error} />}
      </div>
    )
  }

  // ─── State 1: No photos, no pending — empty upload zone ───────────────────
  if (!hasUploaded && pendingFiles.length === 0) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
          onChange={handleFileInput}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
          disabled={loading}
        />

        {/* Drag-drop zone (desktop) */}
        <div
          className={`hidden sm:block border-2 border-dashed rounded-2xl p-6 transition-all ${
            dragActive ? 'border-primary bg-primary/5' : 'border-primary/20'
          } ${loading ? 'opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 mb-3 rounded-full bg-white/8 border border-primary/15 flex items-center justify-center">
              <PlaceholderIcon className="w-6 h-6 text-white/50" />
            </div>
            <p className="text-sm font-medium text-white/70 mb-1">
              Drop photos here or choose below
            </p>
            <p className="text-xs text-muted/60">
              0/{maxImages} photos • Max {maxSizeMB}MB each
            </p>
          </div>
        </div>

        {/* Mobile hint */}
        <p className="sm:hidden text-xs text-muted/60 text-center">
          0/{maxImages} photos • Max {maxSizeMB}MB each
        </p>

        {/* Choose photos button */}
        <button
          type="button"
          onClick={openFilePicker}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary/12 border border-dashed border-primary/25 text-sm font-semibold text-primary-light hover:bg-primary/20 active:bg-primary/25 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ImagePlus className="w-4 h-4" />
          Choose Photos
        </button>

        {error && <ErrorBanner message={error} />}
      </div>
    )
  }

  // ─── State 2: Pending files ready to confirm ──────────────────────────────
  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileInput}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
        disabled={loading}
      />

      {/* Already-uploaded badge (when replacing) */}
      {hasUploaded && (
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-primary/10">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs text-white/70">
            {images.length} existing photo{images.length !== 1 ? 's' : ''} will be replaced on upload
          </span>
        </div>
      )}

      {/* Pending files list */}
      <div className="space-y-2">
        <p className="text-xs text-muted font-medium ml-1">
          {pendingFiles.length} photo{pendingFiles.length !== 1 ? 's' : ''} ready to upload:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-white/5 border border-primary/10 p-2 rounded-lg"
            >
              {/* Generic file icon — NOT a preview of the photo */}
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4 text-primary/60" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white truncate">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                className="p-1 hover:bg-white/10 rounded-full text-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add more (if capacity allows) */}
      {images.length + pendingFiles.length < maxImages && (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={loading}
          className="w-full py-2 rounded-xl bg-primary/8 border border-dashed border-primary/20 text-xs font-medium text-primary-light hover:bg-primary/15 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          Add more ({images.length + pendingFiles.length}/{maxImages})
        </button>
      )}

      {/* Security notice + confirm */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            <span className="font-bold block mb-0.5">Secure processing</span>
            Photos are analyzed by AI and stored encrypted. They are never shared with third parties.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Confirm &amp; Analyze
            </>
          )}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  )
}
