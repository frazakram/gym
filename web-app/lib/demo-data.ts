/**
 * Hardcoded demo data for unauthenticated app exploration.
 * All data is realistic and typed using the app's existing interfaces.
 */

import type { Profile, WeeklyRoutine, WeeklyDiet } from '@/types'

// ── Helpers ──
const today = new Date()
const fmt = (d: Date) => d.toISOString().split('T')[0]
const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }
const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d }
function getMonday(d: Date) { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)) }

// ── Profile ──
export const DEMO_PROFILE: Profile = {
  id: 1,
  user_id: 1,
  name: 'Alex',
  age: 25,
  weight: 75,
  height: 178,
  gender: 'Male',
  goal: 'Muscle gain',
  level: 'Regular',
  tenure: '1 year',
  goal_weight: 82,
  goal_duration: '6 months',
  session_duration: 60,
  notes: 'Focus on chest and back development',
  diet_type: ['No Restrictions'],
  cuisine: 'North Indian',
  protein_powder: 'Yes',
  protein_powder_amount: 30,
  meals_per_day: 4,
  allergies: [],
  specific_food_preferences: '',
  cooking_level: 'Moderate',
  budget: 'Standard',
}

// ── Exercises helper ──
function ex(name: string, setsReps: string, tips: string[]) {
  return {
    name,
    sets_reps: setsReps,
    youtube_urls: [],
    tutorial_points: tips,
    wikihow_url: '',
  }
}

// ── Weekly Routine (PPL Split) ──
export const DEMO_ROUTINE: WeeklyRoutine = {
  days: [
    {
      day: 'Monday - Push (Chest, Shoulders, Triceps)',
      exercises: [
        ex('Barbell Bench Press', '4 sets x 8-10 reps (rest 90s)', ['Retract shoulder blades and arch slightly', 'Lower bar to mid-chest with control', 'Drive feet into floor, press up explosively']),
        ex('Overhead Press', '4 sets x 8-10 reps (rest 90s)', ['Brace core tight throughout', 'Press bar in a slight arc around your face', 'Lock out at the top, squeeze shoulders']),
        ex('Incline Dumbbell Press', '3 sets x 10-12 reps (rest 75s)', ['Set bench to 30-45 degrees', 'Keep elbows at 45° angle, not flared', 'Squeeze chest at the top of each rep']),
        ex('Lateral Raises', '3 sets x 12-15 reps (rest 60s)', ['Slight bend in elbows throughout', 'Raise to shoulder height, not above', 'Control the descent — no swinging']),
        ex('Tricep Pushdowns', '3 sets x 12-15 reps (rest 60s)', ['Keep elbows pinned to your sides', 'Fully extend arms at the bottom', 'Squeeze triceps hard at lockout']),
        ex('Overhead Tricep Extension', '3 sets x 10-12 reps (rest 60s)', ['Keep upper arms close to your head', 'Lower the weight behind your head slowly', 'Extend fully and squeeze at the top']),
      ],
    },
    {
      day: 'Tuesday - Pull (Back, Biceps)',
      exercises: [
        ex('Conventional Deadlift', '4 sets x 5-6 reps (rest 120s)', ['Hip-width stance, grip just outside knees', 'Keep bar close to your body the entire pull', 'Drive through heels, lock hips at the top']),
        ex('Barbell Row', '4 sets x 8-10 reps (rest 90s)', ['Hinge at hips ~45°, keep back flat', 'Pull bar to lower chest/upper belly', 'Squeeze shoulder blades together at top']),
        ex('Lat Pulldown', '3 sets x 10-12 reps (rest 75s)', ['Grip slightly wider than shoulders', 'Pull elbows down and back, lean slightly', 'Control the return — feel the stretch at top']),
        ex('Face Pulls', '3 sets x 15 reps (rest 60s)', ['Set cable at face height, use rope attachment', 'Pull toward forehead, flare elbows high', 'External rotate at end — great for posture']),
        ex('Barbell Curl', '3 sets x 10-12 reps (rest 60s)', ['Keep elbows pinned at your sides', 'Curl with control, squeeze biceps at top', 'Lower slowly — no swinging momentum']),
        ex('Hammer Curl', '3 sets x 10-12 reps (rest 60s)', ['Neutral grip — palms facing each other', 'Targets brachialis for arm thickness', 'Alternate arms or do both simultaneously']),
      ],
    },
    {
      day: 'Wednesday - Legs & Core',
      exercises: [
        ex('Barbell Back Squat', '4 sets x 6-8 reps (rest 120s)', ['Bar on upper traps, feet shoulder-width', 'Break at hips and knees simultaneously', 'Hit parallel or below, drive up through heels']),
        ex('Romanian Deadlift', '4 sets x 8-10 reps (rest 90s)', ['Slight knee bend, hinge at hips', 'Lower bar along legs until deep hamstring stretch', 'Squeeze glutes hard to return to standing']),
        ex('Leg Press', '3 sets x 10-12 reps (rest 90s)', ['Feet shoulder-width, mid-platform', 'Lower until knees reach 90°', 'Press through full foot, don\'t lock knees']),
        ex('Leg Curl', '3 sets x 12 reps (rest 60s)', ['Adjust pad just above ankles', 'Curl smoothly, squeeze hamstrings at top', 'Control the negative — don\'t let it slam']),
        ex('Standing Calf Raises', '4 sets x 15 reps (rest 45s)', ['Full range of motion — stretch at bottom', 'Pause and squeeze at the very top', 'Slow 2-second negative on each rep']),
        ex('Hanging Leg Raises', '3 sets x 12-15 reps (rest 60s)', ['Dead hang, keep legs straight if possible', 'Raise legs to 90° or higher', 'Control descent — don\'t swing']),
      ],
    },
    {
      day: 'Thursday - Push (Variation)',
      exercises: [
        ex('Dumbbell Bench Press', '4 sets x 8-10 reps (rest 90s)', ['Greater range of motion than barbell', 'Keep a slight arch, feet flat on floor', 'Press up and slightly inward at the top']),
        ex('Arnold Press', '3 sets x 10-12 reps (rest 75s)', ['Start palms facing you at chin level', 'Rotate palms outward as you press up', 'Combines front and lateral delt activation']),
        ex('Cable Flyes', '3 sets x 12-15 reps (rest 60s)', ['Set pulleys at chest height', 'Slight forward lean, elbows slightly bent', 'Squeeze chest hard as hands meet in front']),
        ex('Lateral Raises (Drop Set)', '3 sets x 12+8+8 reps (rest 60s)', ['Start heavy for 12, drop weight twice', 'Maintain form even as you fatigue', 'Burns but builds capped delts']),
        ex('Weighted Dips', '3 sets x 8-10 reps (rest 90s)', ['Lean slightly forward for chest emphasis', 'Lower until upper arms are parallel to floor', 'Drive up powerfully, lock out at top']),
        ex('Skull Crushers', '3 sets x 10-12 reps (rest 60s)', ['Lower EZ bar to forehead or just behind', 'Keep upper arms vertical throughout', 'Extend fully, squeeze triceps at lockout']),
      ],
    },
    {
      day: 'Friday - Pull (Variation)',
      exercises: [
        ex('Pull-ups', '4 sets x 6-10 reps (rest 90s)', ['Full dead hang at bottom, chin over bar at top', 'Lead with chest, squeeze lats', 'Use assistance band if needed for full ROM']),
        ex('Seated Cable Row', '4 sets x 10-12 reps (rest 75s)', ['Sit tall, chest up, slight lean forward', 'Pull handle to lower chest/upper belly', 'Squeeze shoulder blades — 1s pause at peak']),
        ex('Single-Arm Dumbbell Row', '3 sets x 10 each arm (rest 60s)', ['One hand and knee on bench for support', 'Pull DB to hip, elbow driving back', 'Keep torso square — no rotation']),
        ex('Rear Delt Fly', '3 sets x 15 reps (rest 60s)', ['Hinge forward, slight bend in elbows', 'Raise arms out to sides, squeeze rear delts', 'Control the weight both up and down']),
        ex('Incline Dumbbell Curl', '3 sets x 10-12 reps (rest 60s)', ['Set bench to 45°, arms hanging straight', 'Long stretch at bottom, full contraction at top', 'Targets the long head of the bicep']),
        ex('Concentration Curl', '3 sets x 12 each arm (rest 45s)', ['Elbow braced against inner thigh', 'Curl with strict form, peak squeeze at top', 'Slow negative for maximum tension']),
      ],
    },
    {
      day: 'Saturday - Legs (Variation) & Abs',
      exercises: [
        ex('Front Squat', '4 sets x 8-10 reps (rest 90s)', ['Clean grip or cross-arm grip on bar', 'Elbows high, stay upright throughout', 'More quad-dominant than back squat']),
        ex('Hip Thrust', '4 sets x 10-12 reps (rest 75s)', ['Upper back on bench, bar over hips', 'Drive hips up, squeeze glutes 2s at top', 'Chin tucked, don\'t hyperextend lower back']),
        ex('Bulgarian Split Squat', '3 sets x 10 each leg (rest 60s)', ['Rear foot on bench, front foot forward', 'Lower until back knee nearly touches floor', 'Drive through front heel to stand up']),
        ex('Leg Extension', '3 sets x 12-15 reps (rest 60s)', ['Adjust pad to sit on lower shins', 'Extend fully, squeeze quads at top', 'Slow 3-second negative for extra burn']),
        ex('Seated Calf Raises', '4 sets x 15-20 reps (rest 45s)', ['Targets soleus muscle specifically', 'Full stretch at bottom, hard squeeze at top', 'Higher rep range for calf growth']),
        ex('Ab Wheel Rollout', '3 sets x 10-12 reps (rest 60s)', ['Start on knees, brace core tight', 'Roll out as far as you can with control', 'Pull back by squeezing abs, not hips']),
      ],
    },
    {
      day: 'Sunday - Rest / Active Recovery',
      exercises: [],
    },
  ],
}

// ── Weekly Diet ──
export const DEMO_DIET: WeeklyDiet = {
  days: Array.from({ length: 7 }, (_, i) => ({
    day: `Day ${i + 1}`,
    meals: [
      { name: 'Breakfast — Paneer Paratha', calories: 520, protein: 28, carbs: 45, fats: 24, ingredients: '2 whole wheat parathas stuffed with 100g paneer, 1 tbsp ghee, 100ml curd, green chutney' },
      { name: 'Lunch — Chicken Curry & Rice', calories: 680, protein: 45, carbs: 65, fats: 22, ingredients: '200g chicken breast curry with tomato-onion gravy, 150g basmati rice, 1 roti, salad' },
      { name: 'Protein Shake (Post-Workout)', calories: 250, protein: 35, carbs: 20, fats: 5, ingredients: '1 scoop whey protein (30g), 1 banana, 200ml milk, 1 tbsp peanut butter' },
      { name: 'Dinner — Dal Tadka & Roti', calories: 580, protein: 32, carbs: 62, fats: 18, ingredients: '1 bowl masoor dal with ghee tadka, 2 rotis, 100g mixed vegetables, raita' },
    ],
    total_calories: i % 2 === 0 ? 2530 : 2480,
    total_protein: i % 2 === 0 ? 152 : 148,
  })),
}

// ── Heatmap (56 days) ──
export const DEMO_HEATMAP = Array.from({ length: 56 }, (_, i) => {
  const d = daysAgo(55 - i)
  const dayOfWeek = d.getDay()
  const isRecent = i > 35
  // Weekdays more active, Sundays off, recent weeks more consistent
  let value = 0
  if (dayOfWeek === 0) value = 0 // Sunday rest
  else if (isRecent) value = Math.random() > 0.2 ? 1 : 0
  else value = Math.random() > 0.4 ? 1 : 0
  return { date: fmt(d), value }
})

// ── Streak ──
export const DEMO_STREAK = {
  current: 5,
  longest: 12,
  last_workout_date: fmt(today),
}

// ── Completions (Mon+Tue fully done, Wed 3/6 done) ──
export const DEMO_COMPLETIONS = (() => {
  const comps: Array<{ day_index: number; exercise_index: number; completed: boolean; routine_id: number }> = []
  // Monday — all 6 done
  for (let e = 0; e < 6; e++) comps.push({ day_index: 0, exercise_index: e, completed: true, routine_id: 999 })
  // Tuesday — all 6 done
  for (let e = 0; e < 6; e++) comps.push({ day_index: 1, exercise_index: e, completed: true, routine_id: 999 })
  // Wednesday — 3/6 done
  for (let e = 0; e < 6; e++) comps.push({ day_index: 2, exercise_index: e, completed: e < 3, routine_id: 999 })
  return comps
})()

// ── Day Completions ──
export const DEMO_DAY_COMPLETIONS = [
  { day_index: 0, completed: true },
  { day_index: 1, completed: true },
  { day_index: 2, completed: false },
  { day_index: 3, completed: false },
  { day_index: 4, completed: false },
  { day_index: 5, completed: false },
  { day_index: 6, completed: false },
]

// ── Premium Status ──
export const DEMO_PREMIUM = {
  premium: false,
  access: true,
  trial_active: true,
  trial_end: daysFromNow(7).toISOString(),
  status: 'trial',
  subscription_id: null,
  current_end: null,
}

// ── Body Measurements ──
export const DEMO_MEASUREMENTS = [
  { id: 5, user_id: 1, measured_at: fmt(daysAgo(0)),  weight: 75.2, waist: 82.0, chest: 99.5, arms: 35.5, hips: 96.0, notes: 'Feeling stronger', created_at: daysAgo(0).toISOString() },
  { id: 4, user_id: 1, measured_at: fmt(daysAgo(3)),  weight: 74.8, waist: 82.5, chest: 99.0, arms: 35.2, hips: 96.0, notes: '', created_at: daysAgo(3).toISOString() },
  { id: 3, user_id: 1, measured_at: fmt(daysAgo(7)),  weight: 74.5, waist: 83.0, chest: 98.5, arms: 35.0, hips: 96.5, notes: 'Started creatine', created_at: daysAgo(7).toISOString() },
  { id: 2, user_id: 1, measured_at: fmt(daysAgo(10)), weight: 74.1, waist: 83.0, chest: 98.0, arms: 34.8, hips: 96.5, notes: '', created_at: daysAgo(10).toISOString() },
  { id: 1, user_id: 1, measured_at: fmt(daysAgo(14)), weight: 73.8, waist: 83.5, chest: 97.5, arms: 34.5, hips: 97.0, notes: 'Starting point', created_at: daysAgo(14).toISOString() },
]

// ── URL Router ──
export function getDemoResponse(url: string, method: string): { status: number; body: any } | null {
  const path = url.split('?')[0]  // strip query params
  const m = method.toUpperCase()

  // GET endpoints
  if (m === 'GET') {
    if (path.endsWith('/api/profile'))          return { status: 200, body: { profile: DEMO_PROFILE, username: 'alex_fit' } }
    if (path.endsWith('/api/routines'))          return { status: 200, body: { routine: { id: 999, routine_json: DEMO_ROUTINE, week_number: 3, week_start_date: fmt(getMonday(new Date())), created_at: fmt(getMonday(new Date())) } } }
    if (path.includes('/api/completions'))       return { status: 200, body: { completions: DEMO_COMPLETIONS } }
    if (path.includes('/api/day-completions'))   return { status: 200, body: { days: DEMO_DAY_COMPLETIONS } }
    if (path.endsWith('/api/diet'))              return { status: 200, body: { diet: { diet_json: DEMO_DIET } } }
    if (path.includes('/api/heatmap'))           return { status: 200, body: { heatmap: DEMO_HEATMAP } }
    if (path.endsWith('/api/streak'))            return { status: 200, body: DEMO_STREAK }
    if (path.includes('/api/billing/status'))    return { status: 200, body: DEMO_PREMIUM }
    if (path.endsWith('/api/csrf'))              return { status: 200, body: { token: 'demo-csrf-token' } }
    if (path.includes('/api/measurements'))      return { status: 200, body: { measurements: DEMO_MEASUREMENTS } }
    if (path.includes('/api/coaches'))           return { status: 200, body: { coaches: [] } }
    if (path.includes('/api/coach/bookings'))    return { status: 200, body: { bookings: [] } }
    if (path.includes('/api/coach'))             return { status: 200, body: { coaches: [] } }
    // Fallback for unknown GET
    if (path.startsWith('/api/'))                return { status: 200, body: {} }
  }

  return null // POST/PUT/DELETE handled separately in provider
}

// Auth-required mutation paths (should trigger login prompt)
export const AUTH_REQUIRED_PATTERNS = [
  '/api/routine/generate',
  '/api/diet/generate',
  '/api/diet/save',
  '/api/profile',        // PUT only
  '/api/routines/reset',
  '/api/coach/book',
]

// Check if a mutation URL requires authentication
export function isMutationAuthRequired(url: string, method: string): boolean {
  const path = url.split('?')[0]
  const m = method.toUpperCase()

  // Profile GET is fine, only PUT needs auth
  if (path.endsWith('/api/profile') && m === 'PUT') return true
  if (path.endsWith('/api/profile') && m === 'GET') return false

  // Saving routines needs auth
  if (path.endsWith('/api/routines') && m === 'POST') return true
  if (path.includes('/api/routines/') && m === 'DELETE') return true
  if (path.includes('/api/routines/reset')) return true

  // Coach booking mutations
  if (path.includes('/api/coach/book')) return true
  if (path.includes('/api/coach/bookings') && (m === 'PATCH' || m === 'DELETE')) return true

  // AI generation
  if (path.includes('/api/routine/generate')) return true
  if (path.includes('/api/diet/generate')) return true
  if (path.includes('/api/diet/save')) return true

  // Logout — special handling (not auth-required, just redirect)
  if (path.includes('/api/auth/logout')) return false

  return false
}
