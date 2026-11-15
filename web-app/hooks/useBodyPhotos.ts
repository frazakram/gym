'use client'

import { useEffect, useRef, useState } from 'react'
import { csrfFetch } from '@/lib/useCsrf'
import { preparePhotoRecords } from '@/lib/image-utils'
import { loadBodyPhotos } from '@/lib/body-photos-client'
import type { BodyCompositionAnalysis } from '@/types'

/**
 * Body photos and their AI body composition analysis (upload, delete, clear all).
 * `userApiKey` is the user's own AI key (empty = server key); `onSuccess`
 * shows a success message.
 *
 * Photos are downloaded once, the first time `isBodyViewOpen` is true: they are
 * the largest data a user has and only the Body view shows them, so loading
 * them with the dashboard made every visit pay for them.
 */
export function useBodyPhotos(userApiKey: string, onSuccess: (message: string) => void, isBodyViewOpen: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- photo/analysis shapes come from loosely typed JSON
  const [bodyPhotos, setBodyPhotos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- photo/analysis shapes come from loosely typed JSON
  const [bodyAnalysis, setBodyAnalysis] = useState<any>(null)
  const [analyzingBody, setAnalyzingBody] = useState(false)
  const [bodyError, setBodyError] = useState('')
  const photosRequestedRef = useRef(false)

  useEffect(() => {
    if (!isBodyViewOpen || photosRequestedRef.current) return
    photosRequestedRef.current = true
    loadBodyPhotos().then(setBodyPhotos)
  }, [isBodyViewOpen])

  const handleBodyPhotoClearAll = async () => {
    setBodyPhotos([])
    setBodyAnalysis(null)
    try {
      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_photos: [], body_composition_analysis: null }),
      })
    } catch (err) {
      console.error('Body photos clear-all failed:', err)
    }
  }

  const handleBodyPhotoUpload = async (files: File[]) => {
    try {
      setAnalyzingBody(true)
      setBodyError('')

      const newPhotos = await preparePhotoRecords(files)
      // Limit to max 2 photos
      const updatedPhotos = [...bodyPhotos, ...newPhotos].slice(0, 2)
      setBodyPhotos(updatedPhotos)

      const response = await csrfFetch('/api/body/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
      })

      const payload = await response.json().catch(() => null) as { analysis?: BodyCompositionAnalysis; error?: string } | null
      if (!response.ok || !payload?.analysis) {
        throw new Error(payload?.error || 'Failed to analyze body composition')
      }

      const { analysis } = payload
      setBodyAnalysis(analysis)
      onSuccess('Body composition analyzed successfully!')

      const saveRes = await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body_photos: updatedPhotos,
          body_composition_analysis: analysis,
        }),
      });
      if (!saveRes.ok) {
        const errPayload = await saveRes.json().catch(() => null) as { error?: string } | null
        throw new Error(errPayload?.error || `Failed to save body photos (HTTP ${saveRes.status})`)
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to analyze body composition. Please try again.'
      setBodyError(msg)
      console.error('Body analysis error:', error)
    } finally {
      setAnalyzingBody(false)
    }
  }

  const handleBodyPhotoDelete = async (id: string) => {
    const updatedPhotos = bodyPhotos.filter(p => p.id !== id)
    setBodyPhotos(updatedPhotos)

    if (updatedPhotos.length === 0) {
      setBodyAnalysis(null)
      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_photos: [], body_composition_analysis: null }),
      });
    } else {
      try {
        setAnalyzingBody(true)
        const response = await csrfFetch('/api/body/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
        })
        const payload = await response.json().catch(() => null) as { analysis?: BodyCompositionAnalysis; error?: string } | null
        if (!response.ok || !payload?.analysis) {
          throw new Error(payload?.error || 'Failed to re-analyze body composition')
        }
        const { analysis } = payload
        setBodyAnalysis(analysis)
        await csrfFetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body_photos: updatedPhotos, body_composition_analysis: analysis }),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Re-analysis failed.'
        setBodyError(msg)
        console.error('Re-analysis error:', error)
      } finally {
        setAnalyzingBody(false)
      }
    }
  }

  return { bodyPhotos, setBodyPhotos, bodyAnalysis, setBodyAnalysis, analyzingBody, bodyError, handleBodyPhotoUpload, handleBodyPhotoDelete, handleBodyPhotoClearAll }
}
