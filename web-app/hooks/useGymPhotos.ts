'use client'

import { useState } from 'react'
import { csrfFetch } from '@/lib/useCsrf'
import { preparePhotoRecords } from '@/lib/image-utils'

/**
 * Gym equipment photos and their AI equipment analysis (upload, delete, clear all).
 * `userApiKey` is the user's own AI key (empty = server key); `onSuccess`
 * shows a success message.
 */
export function useGymPhotos(userApiKey: string, onSuccess: (message: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- photo/analysis shapes come from loosely typed JSON
  const [gymPhotos, setGymPhotos] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- photo/analysis shapes come from loosely typed JSON
  const [equipmentAnalysis, setEquipmentAnalysis] = useState<any>(null)
  const [analyzingEquipment, setAnalyzingEquipment] = useState(false)
  const [equipmentError, setEquipmentError] = useState('')

  const handleGymPhotoUpload = async (files: File[]) => {
    try {
      setAnalyzingEquipment(true)
      setEquipmentError('')

      const newPhotos = await preparePhotoRecords(files)
      const updatedPhotos = [...gymPhotos, ...newPhotos]
      setGymPhotos(updatedPhotos)

      const response = await csrfFetch('/api/gym/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
      })

      if (!response.ok) throw new Error('Failed to analyze equipment')

      const { analysis } = await response.json()
      setEquipmentAnalysis(analysis)
      onSuccess('Gym equipment analyzed successfully!')

      const saveRes = await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gym_photos: updatedPhotos,
          gym_equipment_analysis: analysis,
        }),
      });
      if (!saveRes.ok) {
        const errPayload = await saveRes.json().catch(() => null) as { error?: string } | null
        throw new Error(errPayload?.error || `Failed to save gym photos (HTTP ${saveRes.status})`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to analyze gym equipment. Please try again.'
      setEquipmentError(msg)
      console.error('Equipment analysis error:', error)
    } finally {
      setAnalyzingEquipment(false)
    }
  }

  const handleGymPhotoDelete = async (id: string) => {
    const updatedPhotos = gymPhotos.filter(p => p.id !== id)
    setGymPhotos(updatedPhotos)

    if (updatedPhotos.length === 0) {
      setEquipmentAnalysis(null)
      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_photos: [], gym_equipment_analysis: null }),
      });
    } else {
      try {
        setAnalyzingEquipment(true)
        const response = await csrfFetch('/api/gym/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
        })
        const { analysis } = await response.json()
        setEquipmentAnalysis(analysis)
        await csrfFetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gym_photos: updatedPhotos, gym_equipment_analysis: analysis }),
        });
      } catch (error) {
        console.error('Re-analysis error:', error)
      } finally {
        setAnalyzingEquipment(false)
      }
    }
  }

  const handleGymPhotoClearAll = async () => {
    setGymPhotos([])
    setEquipmentAnalysis(null)
    try {
      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_photos: [], gym_equipment_analysis: null }),
      })
    } catch (err) {
      console.error('Gym photos clear-all failed:', err)
    }
  }

  return { gymPhotos, setGymPhotos, equipmentAnalysis, setEquipmentAnalysis, analyzingEquipment, equipmentError, handleGymPhotoUpload, handleGymPhotoDelete, handleGymPhotoClearAll }
}
