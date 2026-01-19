// ============== GYM EQUIPMENT INTEGRATION ==============
// Add these sections to DashboardClient.tsx

// 1. ADD TO IMPORTS (top of file, around line 1-5)
import type { GymPhoto, GymEquipmentAnalysis } from '@/types'

// 2. ALREADY ADDED: State variables (after line 106)
// const [gymPhotos, setGymPhotos] = useState<GymPhoto[]>([])
// const [equipmentAnalysis, setEquipmentAnalysis] = useState<GymEquipmentAnalysis | null>(null)
// const [analyzingEquipment, setAnalyzingEquipment] = useState(false)
// const [equipmentError, setEquipmentError] = useState('')

// 3. ADD TO fetchProfile (around line 177, after setBudget)
setGymPhotos(data.profile.gym_photos || [])
setEquipmentAnalysis(data.profile.gym_equipment_analysis || null)

// 4. ADD HELPER FUNCTION (add after handleFieldUpdate, around line 767)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const handleGymPhotoUpload = async (files: File[]) => {
  try {
    setAnalyzingEquipment(true)
    setEquipmentError('')

    // Convert files to base64
    const photoPromises = files.map(async (file) => ({
      id: crypto.randomUUID(),
      base64: await fileToBase64(file),
      content_type: file.type,
      size_bytes: file.size,
      uploaded_at: new Date().toISOString()
    }))

    const newPhotos = await Promise.all(photoPromises)
    const updatedPhotos = [...gymPhotos, ...newPhotos]
    setGymPhotos(updatedPhotos)

    // Call AI analysis
    const response = await fetch('/api/gym/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: updatedPhotos.map(p => p.base64)
      })
    })

    if (!response.ok) {
      throw new Error('Failed to analyze equipment')
    }

    const { analysis } = await response.json()
    setEquipmentAnalysis(analysis)
    
    setSuccess('Gym equipment analyzed successfully!')
  } catch (error) {
    setEquipmentError('Failed to analyze gym equipment. Please try again.')
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
  } else {
    // Re-analyze with remaining photos
    try {
      setAnalyzingEquipment(true)
      const response = await fetch('/api/gym/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: updatedPhotos.map(p => p.base64)
        })
      })
      const { analysis } = await response.json()
      setEquipmentAnalysis(analysis)
    } catch (error) {
      console.error('Re-analysis error:', error)
    } finally {
      setAnalyzingEquipment(false)
    }
  }
}

// 5. UPDATE handleFieldUpdate (add cases, around line 765)
case 'gymPhotos': setGymPhotos(value); break
case 'gymEquipmentAnalysis': setEquipmentAnalysis(value); break

// 6. UPDATE handleSaveProfile (add to fetch body, around line 694)
// Add these two lines inside the JSON.stringify body:
gym_photos: gymPhotos,
gym_equipment_analysis: equipmentAnalysis,

// 7. UPDATE ProfileView props (around line 860-920, in the JSX return)
// Add these props to the ProfileView component:
gymPhotos={gymPhotos}
equipmentAnalysis={equipmentAnalysis}
analyzingEquipment={analyzingEquipment}
equipmentError={equipmentError}
onGymPhotoUpload={handleGymPhotoUpload}
onGymPhotoDelete={handleGymPhotoDelete}
