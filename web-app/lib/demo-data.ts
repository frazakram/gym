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

// ── Weekly Diet (varied meals each day, North Indian cuisine) ──
export const DEMO_DIET: WeeklyDiet = {
  days: [
    {
      day: 'Day 1',
      meals: [
        { name: 'Breakfast — Paneer Paratha', calories: 520, protein: 28, carbs: 45, fats: 24, ingredients: '2 whole wheat parathas stuffed with 100g paneer, 1 tbsp ghee, 100ml curd, green chutney' },
        { name: 'Lunch — Chicken Curry & Rice', calories: 680, protein: 45, carbs: 65, fats: 22, ingredients: '200g chicken breast curry with tomato-onion gravy, 150g basmati rice, 1 roti, salad' },
        { name: 'Protein Shake (Post-Workout)', calories: 250, protein: 35, carbs: 20, fats: 5, ingredients: '1 scoop whey protein (30g), 1 banana, 200ml milk, 1 tbsp peanut butter' },
        { name: 'Dinner — Dal Tadka & Roti', calories: 580, protein: 32, carbs: 62, fats: 18, ingredients: '1 bowl masoor dal with ghee tadka, 2 rotis, 100g mixed vegetables, raita' },
      ],
      total_calories: 2530,
      total_protein: 152,
    },
    {
      day: 'Day 2',
      meals: [
        { name: 'Breakfast — Egg Bhurji & Toast', calories: 480, protein: 32, carbs: 35, fats: 22, ingredients: '4 whole eggs scrambled with onion, tomato, green chili, 2 multigrain toast, 1 glass milk' },
        { name: 'Lunch — Rajma Chawal', calories: 620, protein: 28, carbs: 82, fats: 16, ingredients: '1.5 bowls rajma curry, 150g steamed rice, 1 roti, cucumber raita, pickle' },
        { name: 'Protein Shake (Post-Workout)', calories: 250, protein: 35, carbs: 20, fats: 5, ingredients: '1 scoop whey protein (30g), 1 banana, 200ml milk, 1 tbsp peanut butter' },
        { name: 'Dinner — Grilled Chicken Tikka', calories: 640, protein: 52, carbs: 40, fats: 24, ingredients: '250g chicken tikka (grilled), 2 roomali roti, mint chutney, onion salad, 100g paneer salad' },
      ],
      total_calories: 2490,
      total_protein: 147,
    },
    {
      day: 'Day 3',
      meals: [
        { name: 'Breakfast — Moong Dal Chilla', calories: 440, protein: 26, carbs: 48, fats: 16, ingredients: '3 moong dal chillas with paneer stuffing, green chutney, 1 glass buttermilk, 5 almonds' },
        { name: 'Lunch — Mutton Keema & Roti', calories: 720, protein: 48, carbs: 52, fats: 32, ingredients: '200g mutton keema with peas, 2 tandoori rotis, 1 bowl mixed veg, raita' },
        { name: 'Protein Shake (Post-Workout)', calories: 250, protein: 35, carbs: 20, fats: 5, ingredients: '1 scoop whey protein (30g), 1 banana, 200ml milk, 1 tbsp peanut butter' },
        { name: 'Dinner — Palak Paneer & Rice', calories: 600, protein: 30, carbs: 58, fats: 26, ingredients: '150g palak paneer, 120g basmati rice, 1 roti, 1 bowl dal, salad' },
      ],
      total_calories: 2510,
      total_protein: 149,
    },
    {
      day: 'Day 4',
      meals: [
        { name: 'Breakfast — Oats Upma & Eggs', calories: 490, protein: 30, carbs: 50, fats: 18, ingredients: '1 bowl masala oats upma with vegetables, 3 boiled eggs, 1 glass orange juice' },
        { name: 'Lunch — Fish Curry & Rice', calories: 650, protein: 44, carbs: 62, fats: 20, ingredients: '200g rohu fish curry, 150g steamed rice, 1 roti, spinach sabzi, lemon wedge' },
        { name: 'Protein Shake (Post-Workout)', calories: 250, protein: 35, carbs: 20, fats: 5, ingredients: '1 scoop whey protein (30g), 1 banana, 200ml milk, 1 tbsp peanut butter' },
        { name: 'Dinner — Chole & Bhature (Baked)', calories: 610, protein: 26, carbs: 72, fats: 22, ingredients: '1.5 bowls chole curry, 2 baked bhature, onion-tomato salad, green chutney' },
      ],
      total_calories: 2500,
      total_protein: 145,
    },
    {
      day: 'Day 5',
      meals: [
        { name: 'Breakfast — Aloo Paratha & Curd', calories: 540, protein: 18, carbs: 58, fats: 26, ingredients: '2 aloo parathas with 1 tbsp butter, 150ml dahi, pickle, 1 glass lassi' },
        { name: 'Lunch — Tandoori Chicken & Naan', calories: 700, protein: 50, carbs: 55, fats: 28, ingredients: '250g tandoori chicken leg, 1 butter naan, dal makhani, green salad, mint raita' },
        { name: 'Protein Shake (Post-Workout)', calories: 250, protein: 35, carbs: 20, fats: 5, ingredients: '1 scoop whey protein (30g), 1 banana, 200ml milk, 1 tbsp peanut butter' },
        { name: 'Dinner — Egg Curry & Jeera Rice', calories: 560, protein: 34, carbs: 55, fats: 20, ingredients: '4 egg curry (boiled eggs in onion-tomato gravy), 120g jeera rice, 1 roti, salad' },
      ],
      total_calories: 2550,
      total_protein: 147,
    },
    {
      day: 'Day 6',
      meals: [
        { name: 'Breakfast — Poha & Sprouts', calories: 420, protein: 20, carbs: 55, fats: 14, ingredients: '1.5 bowls kanda poha with peanuts, 1 bowl moong sprouts chaat, 1 glass milk' },
        { name: 'Lunch — Butter Chicken & Rice', calories: 720, protein: 48, carbs: 60, fats: 30, ingredients: '200g butter chicken (less cream), 150g basmati rice, 1 roti, onion rings, raita' },
        { name: 'Protein Shake (Post-Workout)', calories: 250, protein: 35, carbs: 20, fats: 5, ingredients: '1 scoop whey protein (30g), 1 banana, 200ml milk, 1 tbsp peanut butter' },
        { name: 'Dinner — Mixed Dal & Roti', calories: 560, protein: 30, carbs: 65, fats: 18, ingredients: 'Panchmel dal (5 dals), 2 rotis, baingan bharta, cucumber-tomato salad' },
      ],
      total_calories: 2450,
      total_protein: 143,
    },
    {
      day: 'Day 7',
      meals: [
        { name: 'Breakfast — Stuffed Besan Chilla', calories: 460, protein: 24, carbs: 40, fats: 22, ingredients: '3 besan chillas stuffed with paneer-veg mix, green chutney, 1 glass milk, 4 walnuts' },
        { name: 'Lunch — Chicken Biryani', calories: 700, protein: 42, carbs: 75, fats: 24, ingredients: '1 plate chicken dum biryani (200g chicken, 180g rice), raita, boiled egg, salad' },
        { name: 'Snack — Peanut Butter Toast', calories: 320, protein: 14, carbs: 30, fats: 16, ingredients: '2 multigrain toast, 2 tbsp peanut butter, 1 banana, 1 cup green tea' },
        { name: 'Dinner — Paneer Tikka & Roti', calories: 560, protein: 34, carbs: 42, fats: 26, ingredients: '200g paneer tikka (grilled), 2 rotis, mixed veg raita, mint chutney, salad' },
      ],
      total_calories: 2440,
      total_protein: 124,
    },
  ],
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

// ── Analytics (full AnalyticsPayload for /api/analytics) ──
const ROUTINE_DAY_NAMES = [
  'Monday - Push (Chest, Shoulders, Triceps)',
  'Tuesday - Pull (Back, Biceps)',
  'Wednesday - Legs & Core',
  'Thursday - Push (Variation)',
  'Friday - Pull (Variation)',
  'Saturday - Legs (Variation) & Abs',
  'Sunday - Rest / Active Recovery',
]

export const DEMO_ANALYTICS = (() => {
  // Generate 90 days of calendar data
  const calendar: Array<{ date: string; workouts: number; completion_percentage: number | null }> = []
  for (let i = 89; i >= 0; i--) {
    const d = daysAgo(i)
    const dow = d.getDay() // 0=Sun
    const isTrainingDay = dow >= 1 && dow <= 6 // Mon-Sat
    const isSunday = dow === 0
    const isRecent = i < 30

    let workouts = 0
    let pct: number | null = null

    if (isSunday) {
      // Rest day — no workout
      workouts = 0
      pct = null
    } else if (isTrainingDay) {
      // More consistent recently, some misses earlier
      const didWorkout = isRecent ? (Math.random() > 0.15) : (Math.random() > 0.35)
      if (didWorkout) {
        workouts = 1
        pct = isRecent
          ? Math.round(75 + Math.random() * 25) // 75-100% recent
          : Math.round(50 + Math.random() * 45) // 50-95% older
      }
    }

    calendar.push({ date: fmt(d), workouts, completion_percentage: pct })
  }

  // Weekly trends (last 12 weeks)
  const weekly: Array<{ week: string; completion_percentage: number; workouts: number }> = []
  for (let w = 11; w >= 0; w--) {
    const weekStart = daysAgo(w * 7 + ((today.getDay() + 6) % 7))
    const yr = weekStart.getFullYear()
    const weekNum = Math.ceil(((weekStart.getTime() - new Date(yr, 0, 1).getTime()) / 86400000 + 1) / 7)
    const wk = w < 4 ? Math.round(4 + Math.random() * 2) : Math.round(2 + Math.random() * 3)
    const pct = w < 4 ? Math.round(78 + Math.random() * 20) : Math.round(55 + Math.random() * 30)
    weekly.push({ week: `${yr}-W${String(weekNum).padStart(2, '0')}`, completion_percentage: pct, workouts: wk })
  }

  // Monthly trends (last 6 months)
  const monthly: Array<{ month: string; completion_percentage: number; workouts: number }> = []
  for (let m = 5; m >= 0; m--) {
    const dt = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    const wk = m < 2 ? Math.round(18 + Math.random() * 6) : Math.round(10 + Math.random() * 10)
    const pct = m < 2 ? Math.round(80 + Math.random() * 15) : Math.round(55 + Math.random() * 30)
    monthly.push({ month: key, completion_percentage: pct, workouts: wk })
  }

  // Daily trends (same as calendar last 30 days)
  const daily = calendar.slice(-30).map(d => ({
    date: d.date,
    completion_percentage: d.completion_percentage ?? 0,
    workouts: d.workouts,
  }))

  // Workout history (last 10 workouts)
  const workoutHistory: Array<{
    workout_at: string; date: string; routine_id: number; week_number: number | null;
    day_index: number; day_name: string; completed_exercises: number; total_exercises: number;
    completion_percentage: number;
  }> = []
  let histCount = 0
  for (let i = 0; i < 90 && histCount < 10; i++) {
    const d = daysAgo(i)
    const dow = d.getDay()
    if (dow === 0) continue // Sunday rest
    const dayIdx = (dow + 6) % 7 // Mon=0, Tue=1, ...
    if (dayIdx > 5) continue
    const didWorkout = i < 14 ? (Math.random() > 0.1) : (Math.random() > 0.3)
    if (!didWorkout) continue

    const total = 6
    const completed = Math.round(4 + Math.random() * 2) // 4-6
    workoutHistory.push({
      workout_at: d.toISOString(),
      date: fmt(d),
      routine_id: 999,
      week_number: 3 - Math.floor(i / 7),
      day_index: dayIdx,
      day_name: ROUTINE_DAY_NAMES[dayIdx],
      completed_exercises: Math.min(completed, total),
      total_exercises: total,
      completion_percentage: Math.round((Math.min(completed, total) / total) * 100),
    })
    histCount++
  }

  return {
    range_days: 90,
    generated_at: today.toISOString(),
    trends: { daily, weekly, monthly },
    streak: { current: 5, longest: 12, last_workout_date: fmt(today) },
    calendar,
    workout_history: workoutHistory,
  }
})()

// ── URL Router ──
export function getDemoResponse(url: string, method: string): { status: number; body: any } | null {
  const path = url.split('?')[0]  // strip query params
  const m = method.toUpperCase()

  // GET endpoints
  if (m === 'GET') {
    if (path.endsWith('/api/profile'))          return { status: 200, body: { profile: DEMO_PROFILE, username: 'alex_fit' } }
    if (path.includes('/api/routines') && (path.includes('all=true') || path.includes('includeArchived'))) {
      const mon = getMonday(new Date())
      const prevMon = new Date(mon); prevMon.setDate(mon.getDate() - 7)
      return { status: 200, body: { routines: [
        { id: 999, routine_json: DEMO_ROUTINE, week_number: 3, week_start_date: fmt(mon), created_at: fmt(mon), archived: false },
        { id: 998, routine_json: DEMO_ROUTINE, week_number: 2, week_start_date: fmt(prevMon), created_at: fmt(prevMon), archived: false },
      ] } }
    }
    if (path.includes('/api/routines'))          return { status: 200, body: { routine: { id: 999, routine_json: DEMO_ROUTINE, week_number: 3, week_start_date: fmt(getMonday(new Date())), created_at: fmt(getMonday(new Date())) } } }
    if (path.includes('/api/completions'))       return { status: 200, body: { completions: DEMO_COMPLETIONS } }
    if (path.includes('/api/day-completions'))   return { status: 200, body: { days: DEMO_DAY_COMPLETIONS } }
    if (path.endsWith('/api/diet'))              return { status: 200, body: { diet: { diet_json: DEMO_DIET } } }
    if (path.includes('/api/heatmap'))           return { status: 200, body: { heatmap: DEMO_HEATMAP } }
    if (path.endsWith('/api/streak'))            return { status: 200, body: DEMO_STREAK }
    if (path.includes('/api/billing/status'))    return { status: 200, body: DEMO_PREMIUM }
    if (path.endsWith('/api/csrf'))              return { status: 200, body: { token: 'demo-csrf-token' } }
    if (path.includes('/api/analytics'))          return { status: 200, body: DEMO_ANALYTICS }
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
