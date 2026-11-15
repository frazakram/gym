// Profiles, gym/body photos and gym selection.
import { Profile } from '@/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { encryptRnd, decrypt } from '@/lib/fieldEncryption';
import { decodeBodyPhotos, encodeBodyPhotos, isPlaintextBodyPhotos } from '@/lib/body-photos';
import { MOCK_PROFILE, MOCK_USER_ID, allowMockAuth, mockProfileStore, pool } from './core';

/**
 * Profiles are returned without body_photos: the photos are sensitive and large,
 * so they are served only by getBodyPhotos() (GET /api/body/photos).
 */
function withoutBodyPhotos<T extends object>(profile: T): T {
  const { body_photos: _omitted, ...rest } = profile as T & { body_photos?: unknown };
  void _omitted;
  return rest as T;
}

const getProfileCached = unstable_cache(
  async (userId: number) => {
    try {
      const result = await pool.query<Profile>(
        'SELECT * FROM profiles WHERE user_id = $1',
        [userId]
      );
      const profile = result.rows[0] || null;
      if (profile?.name) profile.name = decrypt(profile.name);
      return profile ? withoutBodyPhotos(profile) : null;
    } catch (error) {
      console.error("getProfile DB failed:", error);
      throw error;
    }
  },
  ['user-profile'],
  { tags: ['user-profile'] }
);

export async function getProfile(userId: number): Promise<Profile | null> {
  try {
    return await getProfileCached(userId);
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getProfile DB failed, using mock:", error);
      // FALLBACK PROFILE (per-user)
      return withoutBodyPhotos(mockProfileStore.get(userId) || { ...MOCK_PROFILE, user_id: userId });
    }
    throw error;
  }
}

export async function saveProfile(
  userId: number,
  age: number,
  weight: number,
  height: number,
  gender: Profile['gender'],
  goal: Profile['goal'],
  level: string,
  tenure: string,
  goal_weight?: number,
  notes?: string,
  goal_duration?: string,
  session_duration?: number,
  diet_type?: string[],
  cuisine?: Profile['cuisine'],
  protein_powder?: 'Yes' | 'No',
  protein_powder_amount?: number,
  meals_per_day?: number,
  allergies?: string[],
  specific_food_preferences?: string,
  cooking_level?: Profile['cooking_level'],

  budget?: Profile['budget'],
  name?: string,
  gym_photos?: any,
  gym_equipment_analysis?: any,
  body_photos?: any,
  body_composition_analysis?: any,
  preferred_rest_days?: string[]
): Promise<Profile | null> {
  // Safe cast since we handle string to strict union transition
  const validLevel = level as Profile['level'];

  try {
    // Optimistic fallback first: just mock return
    const mockReturn: Profile = {
      ...MOCK_PROFILE,
      age,
      weight,
      height,
      gender,
      goal,
      level: validLevel, // Use the casted level
      tenure,
      goal_weight: typeof goal_weight === 'number' && Number.isFinite(goal_weight) ? goal_weight : undefined,
      notes: notes?.trim() ? notes.trim() : undefined,
      goal_duration: goal_duration?.trim() ? goal_duration.trim() : undefined,
      session_duration: typeof session_duration === 'number' && Number.isFinite(session_duration) ? session_duration : undefined,
      diet_type: diet_type || [],
      cuisine: cuisine,
      protein_powder,
      protein_powder_amount,
      meals_per_day,
      allergies: allergies || [],
      specific_food_preferences: specific_food_preferences?.trim() ? specific_food_preferences.trim() : undefined,
      cooking_level: cooking_level,

      budget: budget,
      name: name?.trim() ? name.trim() : undefined
    };

    // Try Real DB
    const existing = await getProfile(userId);

    // Fallback trigger if user is the mock user
    if (userId === MOCK_USER_ID && allowMockAuth()) {
      mockProfileStore.set(userId, { ...mockReturn, updated_at: new Date() });
      return withoutBodyPhotos(mockReturn);
    }

    if (existing) {
      // Partial-update safety: if a caller omits a field (undefined), keep the
      // existing DB value. Without this, a partial PUT (e.g., the photo-upload
      // handler sending only body_photos) would NULL every other column.
      // `null` is still respected as "explicitly clear" — only undefined falls back.
      const keep = <T>(input: T | null | undefined, current: T | null | undefined): T | null =>
        input !== undefined ? (input as T | null) : ((current ?? null) as T | null);

      const effAge = keep(age, existing.age);
      const effWeight = keep(weight, existing.weight);
      const effHeight = keep(height, existing.height);
      const effGender = keep(gender, existing.gender);
      const effGoal = keep(goal, existing.goal);
      const effLevel = keep(level, existing.level);
      const effTenure = keep(tenure, existing.tenure);
      const effGoalWeight = keep(goal_weight, existing.goal_weight);
      const effNotes = keep(notes, existing.notes);
      const effGoalDuration = keep(goal_duration, existing.goal_duration);
      const effSessionDuration = keep(session_duration, existing.session_duration);
      const effDietType = keep(diet_type, existing.diet_type);
      const effCuisine = keep(cuisine, existing.cuisine);
      const effProteinPowder = keep(protein_powder, existing.protein_powder);
      const effMealsPerDay = keep(meals_per_day, existing.meals_per_day);
      const effAllergies = keep(allergies, existing.allergies);
      const effCookingLevel = keep(cooking_level, existing.cooking_level);
      const effBudget = keep(budget, existing.budget);
      const effProteinPowderAmount = keep(protein_powder_amount, existing.protein_powder_amount);
      const effSpecificFood = keep(specific_food_preferences, existing.specific_food_preferences);
      // name needs encrypt-on-set; on preserve, re-use the already-decrypted existing value (re-encrypted below)
      const effNameRaw = keep(name, existing.name);
      const effGymPhotos = keep(gym_photos, existing.gym_photos as any);
      const effGymEquipmentAnalysis = keep(gym_equipment_analysis, existing.gym_equipment_analysis as any);
      const effBodyCompositionAnalysis = keep(body_composition_analysis, existing.body_composition_analysis as any);
      const effPreferredRestDays = keep(preferred_rest_days, existing.preferred_rest_days as any);

      const result = await pool.query<Profile>(
        `UPDATE profiles
         SET age = $2, weight = $3, height = $4, gender = $5,
             goal = $6, level = $7, tenure = $8, goal_weight = $9, notes = $10,
             goal_duration = $11, session_duration = $12,
             diet_type = $13, cuisine = $14, protein_powder = $15, meals_per_day = $16, allergies = $17,
             cooking_level = $18, budget = $19, protein_powder_amount = $20, specific_food_preferences = $21,
             name = $22, gym_photos = $23, gym_equipment_analysis = $24,
             body_photos = CASE WHEN $28::boolean THEN $25::jsonb ELSE body_photos END,
             body_composition_analysis = $26,
             preferred_rest_days = $27,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          typeof effAge === 'number' && Number.isFinite(effAge) ? effAge : null,
          typeof effWeight === 'number' && Number.isFinite(effWeight) ? effWeight : null,
          typeof effHeight === 'number' && Number.isFinite(effHeight) ? effHeight : null,
          effGender || null,
          effGoal || null,
          effLevel || null,
          effTenure || null,
          typeof effGoalWeight === 'number' && Number.isFinite(effGoalWeight) ? effGoalWeight : null,
          typeof effNotes === 'string' && effNotes.trim() ? effNotes.trim() : null,
          typeof effGoalDuration === 'string' && effGoalDuration.trim() ? effGoalDuration.trim() : null,
          typeof effSessionDuration === 'number' && Number.isFinite(effSessionDuration) ? effSessionDuration : null,
          effDietType || null,
          effCuisine || null,
          effProteinPowder || null,
          effMealsPerDay || null,
          effAllergies || null,
          effCookingLevel || null,
          effBudget || null,
          effProteinPowderAmount || null,
          typeof effSpecificFood === 'string' && effSpecificFood.trim() ? effSpecificFood.trim() : null,
          typeof effNameRaw === 'string' && effNameRaw.trim() ? encryptRnd(effNameRaw.trim()) : null,
          // JSONB columns must be JSON-stringified — pg/Neon would otherwise try
          // to encode JS arrays as Postgres array literals and reject the insert
          // with "invalid input syntax for type json".
          effGymPhotos != null ? JSON.stringify(effGymPhotos) : null,
          effGymEquipmentAnalysis != null ? JSON.stringify(effGymEquipmentAnalysis) : null,
          // Written only when the caller sent body_photos (null = clear); otherwise
          // left untouched: profiles are read without photos, so there is no 'existing' value.
          body_photos !== undefined ? encodeBodyPhotos(body_photos ?? null) : null,
          effBodyCompositionAnalysis != null ? JSON.stringify(effBodyCompositionAnalysis) : null,
          Array.isArray(effPreferredRestDays) && effPreferredRestDays.length > 0 ? effPreferredRestDays : null,
          body_photos !== undefined,
        ]
      );
      revalidateTag('user-profile', undefined as any);
      return withoutBodyPhotos(result.rows[0]);
    } else {
      const result = await pool.query<Profile>(
        `INSERT INTO profiles (
           user_id, age, weight, height, gender, goal, level, tenure, goal_weight, notes, goal_duration, session_duration,
           diet_type, cuisine, protein_powder, meals_per_day, allergies, cooking_level, budget, protein_powder_amount, specific_food_preferences, name,
           gym_photos, gym_equipment_analysis, body_photos, body_composition_analysis, preferred_rest_days
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
         RETURNING *`,
        [
          userId,
          age,
          weight,
          height,
          gender,
          goal,
          validLevel,
          tenure,
          typeof goal_weight === 'number' && Number.isFinite(goal_weight) ? goal_weight : null,
          notes?.trim() ? notes.trim() : null,
          goal_duration?.trim() ? goal_duration.trim() : null,
          typeof session_duration === 'number' && Number.isFinite(session_duration) ? session_duration : null,
          diet_type || null,
          cuisine || null,
          protein_powder || null,
          meals_per_day || null,
          allergies || null,
          cooking_level || null,
          budget || null,
          protein_powder_amount || null,
          specific_food_preferences?.trim() ? specific_food_preferences.trim() : null,
          name?.trim() ? encryptRnd(name.trim()) : null,
          // See UPDATE path above: JSONB columns must be JSON-stringified.
          gym_photos != null ? JSON.stringify(gym_photos) : null,
          gym_equipment_analysis != null ? JSON.stringify(gym_equipment_analysis) : null,
          encodeBodyPhotos(body_photos ?? null),
          body_composition_analysis != null ? JSON.stringify(body_composition_analysis) : null,
          preferred_rest_days && preferred_rest_days.length > 0 ? preferred_rest_days : null
        ]
      );
      revalidateTag('user-profile', undefined as any);
      return withoutBodyPhotos(result.rows[0]);
    }
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("saveProfile DB failed, using mock:", error);
      // Return mock with the requested data
      const fallback: Profile = {
        ...MOCK_PROFILE,
        age,
        weight,
        height,
        gender,
        goal,
        level: validLevel,
        tenure,
        goal_weight: typeof goal_weight === 'number' && Number.isFinite(goal_weight) ? goal_weight : undefined,
        notes: notes?.trim() ? notes.trim() : undefined,
        goal_duration: goal_duration?.trim() ? goal_duration.trim() : undefined,
        session_duration: typeof session_duration === 'number' && Number.isFinite(session_duration) ? session_duration : undefined,
        diet_type,
        cuisine,
        protein_powder,
        meals_per_day,
        allergies,
        cooking_level: cooking_level,
        budget: budget
      };
      mockProfileStore.set(userId, { ...fallback, user_id: userId, updated_at: new Date() });
      return withoutBodyPhotos({ ...fallback, user_id: userId });
    }
    console.error("saveProfile DB failed:", error);
    throw error;
  }
}

// ============= PROFILE COMPARISON HELPER =============

/**
 * Checks if there are significant changes between two profiles that would require regenerating a routine.
 * Returns true if the profiles are significantly different, false otherwise.
 */
export function hasSignificantProfileChange(oldProfile: any, newProfile: any): boolean {
  if (!oldProfile || !newProfile) return true; // If no comparison possible, assume changed

  // Check gender change (always significant)
  if (oldProfile.gender !== newProfile.gender) return true;

  // Check goal change (always significant)
  if (oldProfile.goal !== newProfile.goal) return true;

  // Check level change (always significant)
  if (oldProfile.level !== newProfile.level) return true;

  // Check age change (±1 year is significant)
  const ageDiff = Math.abs((newProfile.age || 0) - (oldProfile.age || 0));
  if (ageDiff >= 1) return true;

  // Check weight change (±3kg is significant)
  const weightDiff = Math.abs((newProfile.weight || 0) - (oldProfile.weight || 0));
  if (weightDiff >= 3) return true;

  // Check height change (±2cm is significant)
  const heightDiff = Math.abs((newProfile.height || 0) - (oldProfile.height || 0));
  if (heightDiff >= 2) return true;

  // Check goal_weight change if both are set (±3kg is significant)
  if (oldProfile.goal_weight && newProfile.goal_weight) {
    const goalWeightDiff = Math.abs(newProfile.goal_weight - oldProfile.goal_weight);
    if (goalWeightDiff >= 3) return true;
  } else if ((oldProfile.goal_weight || null) !== (newProfile.goal_weight || null)) {
    // If one was set and now isn't (or vice versa), that's significant
    return true;
  }

  // No significant changes detected
  return false;
}

/**
 * Lightweight existence checks — returns true if the user has at least one
 * gym/body photo stored (does NOT load the actual base64 data).
 */
export async function hasGymPhotos(userId: number): Promise<boolean> {
  try {
    const res = await pool.query(
      `SELECT 1 FROM profiles
       WHERE user_id = $1
         AND gym_photos IS NOT NULL
         AND jsonb_array_length(gym_photos) > 0
       LIMIT 1`,
      [userId],
    );
    return (res.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * The user's body photos, decrypted. Legacy plaintext rows are re-encrypted on
 * read when an encryption key is configured.
 */
export async function getBodyPhotos(userId: number): Promise<unknown[]> {
  if (allowMockAuth() && userId === MOCK_USER_ID) {
    const photos = (mockProfileStore.get(userId) as { body_photos?: unknown } | undefined)?.body_photos;
    return Array.isArray(photos) ? photos : [];
  }
  const result = await pool.query<{ body_photos: unknown }>(
    'SELECT body_photos FROM profiles WHERE user_id = $1',
    [userId]
  );
  const stored = result.rows[0]?.body_photos ?? null;
  const photos = decodeBodyPhotos(stored);
  if (isPlaintextBodyPhotos(stored)) {
    const encoded = encodeBodyPhotos(photos);
    if (encoded !== JSON.stringify(stored)) {
      await pool
        .query('UPDATE profiles SET body_photos = $2::jsonb WHERE user_id = $1', [userId, encoded])
        .catch((error) => console.error('[body-photos] re-encryption failed:', error));
    }
  }
  return photos;
}

export async function hasBodyPhotos(userId: number): Promise<boolean> {
  try {
    const res = await pool.query(
      `SELECT 1 FROM profiles
       WHERE user_id = $1
         AND CASE jsonb_typeof(body_photos)
               WHEN 'array' THEN jsonb_array_length(body_photos) > 0
               WHEN 'string' THEN true -- encrypted list (never stored when empty)
               ELSE false
             END
       LIMIT 1`,
      [userId],
    );
    return (res.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

// ============= GYM SELECTION =============

export interface UserGym {
  gymName: string;
  placeId?: string;
  imageUrl?: string;
  equipment: string[];
  location?: string;
}

export async function saveUserGym(userId: number, gym: UserGym): Promise<void> {
  try {
    await pool.query(
      `UPDATE profiles
         SET selected_gym_name = $1,
             selected_gym_place_id = $2,
             selected_gym_image_url = $3,
             selected_gym_equipment = $4,
             selected_gym_location = $5
       WHERE user_id = $6`,
      [
        gym.gymName,
        gym.placeId ?? null,
        gym.imageUrl ?? null,
        JSON.stringify(gym.equipment),
        gym.location ?? null,
        userId,
      ],
    );
  } catch (error) {
    console.error('saveUserGym failed:', error);
    throw error;
  }
}

export async function getUserGym(userId: number): Promise<UserGym | null> {
  try {
    const res = await pool.query<{
      selected_gym_name: string | null;
      selected_gym_place_id: string | null;
      selected_gym_image_url: string | null;
      selected_gym_equipment: string[] | null;
      selected_gym_location: string | null;
    }>(
      `SELECT selected_gym_name, selected_gym_place_id, selected_gym_image_url,
              selected_gym_equipment, selected_gym_location
       FROM profiles WHERE user_id = $1`,
      [userId],
    );
    const row = res.rows[0];
    if (!row?.selected_gym_name) return null;
    return {
      gymName: row.selected_gym_name,
      placeId: row.selected_gym_place_id ?? undefined,
      imageUrl: row.selected_gym_image_url ?? undefined,
      equipment: Array.isArray(row.selected_gym_equipment) ? row.selected_gym_equipment : [],
      location: row.selected_gym_location ?? undefined,
    };
  } catch {
    return null;
  }
}
