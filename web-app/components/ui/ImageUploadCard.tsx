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
    await handleFiles(files)
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    await handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    // Validate file types and sizes
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
      await onUpload(validFiles)
    }
  }

  const hasCapacity = images.length < maxImages

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      {hasCapacity && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${
            dragActive
              ? 'border-emerald-400 bg-emerald-400/5'
              : 'border-white/20 hover:border-white/30'
          } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="text-center">
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
              {loading ? 'Uploading...' : 'Drop gym photos here'}
            </p>
            <p className="text-xs text-slate-300/60 mb-3">
              or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-400 hover:text-emerald-300 font-medium underline"
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-slate-400/70">
              {images.length}/{maxImages} images • Max {maxSizeMB}MB each • JPG, PNG, WEBP
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Image Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5"
            >
              <img
                src={photo.base64}
                alt="Gym photo"
                className="w-full aspect-square object-cover"
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
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-xs text-white/90">
                {(photo.size_bytes / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasCapacity && (
        <p className="text-xs text-slate-400 text-center">
          Maximum {maxImages} photos reached. Delete some to upload more.
        </p>
      )}
    </div>
  )
}
