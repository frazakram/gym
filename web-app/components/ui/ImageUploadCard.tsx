'use client'

import { useState, useRef, DragEvent } from 'react'
import type { GymPhoto } from '@/types'

interface ImageUploadCardProps {
  images: GymPhoto[]
  maxImages: number
  maxSizeMB: number
  onUpload: (files: File[]) => Promise<void>
  onDelete: (id: string) => void
  loading?: boolean
  error?: string
}

export function ImageUploadCard({
  images,
  maxImages,
  maxSizeMB,
  onUpload,
  onDelete,
  loading = false,
  error,
}: ImageUploadCardProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showImages, setShowImages] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    handleFiles(files)
    // Reset the input so the same file can be selected again
    e.target.value = ''
  }

  const handleFiles = (files: File[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxBytes = maxSizeMB * 1024 * 1024

    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        console.warn(`Invalid file type: ${file.type}`)
        return false
      }
      if (file.size > maxBytes) {
        console.warn(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return
    await onUpload(pendingFiles)
    setPendingFiles([])
  }

  const removePending = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const hasCapacity = images.length + pendingFiles.length < maxImages

  return (
    <div className="space-y-4">
      {/* Hidden file input - at top level for reliable access */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Existing Images Control */}
      {images.length > 0 && (
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
            <span className="text-sm text-white/90 font-medium">
              {images.length} photo{images.length !== 1 ? 's' : ''} uploaded
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowImages(!showImages)}
            className="text-xs text-emerald-300 hover:text-emerald-200 font-medium flex items-center gap-1 transition-colors"
          >
            {showImages ? 'Hide photos' : 'View photos'}
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showImages ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {hasCapacity ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer ${dragActive
              ? 'border-emerald-400 bg-emerald-400/5'
              : 'border-white/20 hover:border-white/30'
            } ${loading ? 'opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFilePicker}
        >
          <div className="text-center pointer-events-none">
            <div className="mx-auto w-12 h-12 mb-3 rounded-full bg-white/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <p className="text-sm font-medium text-white/90 mb-1">
              Drop photos here or click to browse
            </p>
            <p className="text-xs text-slate-400/70">
              {images.length + pendingFiles.length}/{maxImages} images • Max {maxSizeMB}MB each
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-2">
          Maximum limit reached. Remove images to add new ones.
        </p>
      )}

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <p className="text-xs text-slate-400 font-medium ml-1">Ready to upload:</p>
          <div className="grid grid-cols-2 gap-2">
            {pendingFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-lg">
                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)}KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Security Note & Upload Button */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-2">
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                <span className="font-bold block mb-1">Security Verification</span>
                By clicking "Confirm Upload", you agree to process these images. Photos are analyzed securely and not shared with third parties.
              </p>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                'Confirm Upload'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Image Thumbnails (Hidden by default) */}
      {images.length > 0 && showImages && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in zoom-in-95 duration-200">
          {images.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-square"
            >
              <img
                src={photo.base64}
                alt="Gym photo"
                className="w-full h-full object-cover"
              />

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => onDelete(photo.id)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete photo"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* File Size */}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] text-white/90">
                {(photo.size_bytes / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
