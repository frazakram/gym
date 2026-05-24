export type MuscleGroup =
  | 'chest'
  | 'upper_back'
  | 'lower_back'
  | 'lats'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'adductors'
  | 'traps'
  | 'neck'
  | 'cardio'

export type BodyRegion = 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs' | 'full_body' | 'cardio'

export interface ExerciseMuscleInfo {
  primary: MuscleGroup[]
  secondary: MuscleGroup[]
  region: BodyRegion
  benefits: string[]
}

// Keyword-based rules. Order matters: more specific patterns first.
const RULES: Array<{ match: RegExp; info: ExerciseMuscleInfo }> = [
  // ---------- CHEST ----------
  {
    match: /(incline\s+(dumbbell|barbell|machine)?\s*(bench\s*press|press|fly|flye))/i,
    info: {
      primary: ['chest', 'shoulders'],
      secondary: ['triceps'],
      region: 'chest',
      benefits: [
        'Builds upper chest mass and a fuller shelf look',
        'Strengthens shoulders for overhead pressing',
        'Improves pressing power off the chest',
      ],
    },
  },
  {
    match: /(decline\s+(dumbbell|barbell|machine)?\s*(bench\s*press|press|fly|flye))/i,
    info: {
      primary: ['chest'],
      secondary: ['triceps', 'shoulders'],
      region: 'chest',
      benefits: [
        'Targets the lower chest for a more defined chest line',
        'Reduces shoulder strain compared to flat pressing',
      ],
    },
  },
  {
    match: /(bench\s*press|chest\s*press|push\s*up|push-up|pushup|dumbbell\s*press|barbell\s*press|chest\s*fly|chest\s*flye|pec\s*deck|cable\s*crossover|dips?\b)/i,
    info: {
      primary: ['chest'],
      secondary: ['triceps', 'shoulders'],
      region: 'chest',
      benefits: [
        'Builds chest size and pressing strength',
        'Develops triceps and front shoulders as supporting muscles',
        'Improves everyday pushing movements',
      ],
    },
  },

  // ---------- BACK / LATS ----------
  {
    match: /(pull[\s-]*up|chin[\s-]*up|lat\s*pull[\s-]*down|pull[\s-]*down)/i,
    info: {
      primary: ['lats'],
      secondary: ['biceps', 'upper_back', 'forearms'],
      region: 'back',
      benefits: [
        'Builds a wider back (V-taper)',
        'Strengthens biceps and grip',
        'Improves posture and shoulder stability',
      ],
    },
  },
  {
    match: /(barbell\s*row|bent[\s-]*over\s*row|dumbbell\s*row|t[\s-]*bar\s*row|seated\s*row|cable\s*row|inverted\s*row|\brow\b)/i,
    info: {
      primary: ['upper_back', 'lats'],
      secondary: ['biceps', 'traps', 'forearms'],
      region: 'back',
      benefits: [
        'Builds back thickness',
        'Corrects rounded-shoulder posture',
        'Strengthens the entire pulling chain',
      ],
    },
  },
  {
    match: /(deadlift|romanian\s*deadlift|rdl|sumo\s*deadlift|stiff[\s-]*leg)/i,
    info: {
      primary: ['hamstrings', 'glutes', 'lower_back'],
      secondary: ['traps', 'forearms', 'upper_back', 'quads'],
      region: 'back',
      benefits: [
        'Builds total-body strength — the king of compound lifts',
        'Strengthens lower back and core for injury prevention',
        'Improves hip hinge — useful for daily lifting',
      ],
    },
  },
  {
    match: /(hyperextension|back\s*extension|good\s*morning|superman)/i,
    info: {
      primary: ['lower_back'],
      secondary: ['glutes', 'hamstrings'],
      region: 'back',
      benefits: [
        'Strengthens the lower back to prevent injury',
        'Reduces lower-back pain from sitting',
      ],
    },
  },

  // ---------- SHOULDERS ----------
  {
    match: /(overhead\s*press|ohp|shoulder\s*press|military\s*press|arnold\s*press|seated\s*press)/i,
    info: {
      primary: ['shoulders'],
      secondary: ['triceps', 'upper_back'],
      region: 'shoulders',
      benefits: [
        'Builds rounded, capped shoulders',
        'Improves overhead strength for sports and daily tasks',
        'Strengthens core stability',
      ],
    },
  },
  {
    match: /(lateral\s*raise|side\s*raise|side\s*lateral)/i,
    info: {
      primary: ['shoulders'],
      secondary: [],
      region: 'shoulders',
      benefits: [
        'Widens shoulders for a broader-looking frame',
        'Isolates the side delt — hard to hit with compound lifts',
      ],
    },
  },
  {
    match: /(front\s*raise)/i,
    info: {
      primary: ['shoulders'],
      secondary: [],
      region: 'shoulders',
      benefits: [
        'Strengthens the front of the shoulder',
        'Improves overhead pressing strength',
      ],
    },
  },
  {
    match: /(rear\s*delt|reverse\s*fly|reverse\s*flye|face\s*pull|bent[\s-]*over\s*fly)/i,
    info: {
      primary: ['shoulders', 'upper_back'],
      secondary: ['traps'],
      region: 'shoulders',
      benefits: [
        'Builds rear delts — fixes the most-neglected muscle',
        'Improves posture and shoulder health',
        'Counters hours of desk work',
      ],
    },
  },
  {
    match: /(shrug)/i,
    info: {
      primary: ['traps'],
      secondary: ['forearms'],
      region: 'shoulders',
      benefits: [
        'Builds upper traps for a fuller upper-body look',
        'Strengthens grip and neck stability',
      ],
    },
  },

  // ---------- ARMS ----------
  {
    match: /(bicep|curl|preacher|hammer\s*curl|concentration)/i,
    info: {
      primary: ['biceps'],
      secondary: ['forearms'],
      region: 'arms',
      benefits: [
        'Builds bigger, more defined biceps',
        'Strengthens grip and forearms',
        'Improves pulling strength',
      ],
    },
  },
  {
    match: /(tricep|pushdown|push[\s-]*down|skull\s*crusher|skullcrusher|kickback|overhead\s*extension|close[\s-]*grip\s*bench)/i,
    info: {
      primary: ['triceps'],
      secondary: [],
      region: 'arms',
      benefits: [
        'Builds bigger arms — triceps are 2/3 of arm size',
        'Improves all pressing strength (bench, overhead)',
      ],
    },
  },
  {
    match: /(wrist\s*curl|forearm|reverse\s*curl)/i,
    info: {
      primary: ['forearms'],
      secondary: [],
      region: 'arms',
      benefits: [
        'Builds forearm size and grip strength',
        'Prevents wrist injuries from heavy lifts',
      ],
    },
  },

  // ---------- CORE ----------
  {
    match: /(plank|hollow\s*hold|dead\s*bug|deadbug|bird\s*dog)/i,
    info: {
      primary: ['abs'],
      secondary: ['obliques', 'lower_back'],
      region: 'core',
      benefits: [
        'Builds core stability for every other lift',
        'Improves posture',
        'Reduces lower-back pain',
      ],
    },
  },
  {
    match: /(crunch|sit[\s-]*up|leg\s*raise|knee\s*raise|toes[\s-]*to[\s-]*bar|hanging\s*leg|ab\s*roll|cable\s*crunch)/i,
    info: {
      primary: ['abs'],
      secondary: ['obliques'],
      region: 'core',
      benefits: [
        'Builds visible abs (combined with low body fat)',
        'Strengthens the front core',
      ],
    },
  },
  {
    match: /(russian\s*twist|side\s*plank|woodchopper|oblique|side\s*bend)/i,
    info: {
      primary: ['obliques'],
      secondary: ['abs'],
      region: 'core',
      benefits: [
        'Builds defined obliques (side abs)',
        'Improves rotational strength for sports',
      ],
    },
  },

  // ---------- LEGS ----------
  {
    match: /(back\s*squat|front\s*squat|squat|goblet|bulgarian\s*split|split\s*squat)/i,
    info: {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings', 'lower_back', 'abs', 'calves'],
      region: 'legs',
      benefits: [
        'Builds total lower-body strength and size',
        'Boosts hormones that grow muscle everywhere',
        'Improves athletic performance',
      ],
    },
  },
  {
    match: /(lunge|step[\s-]*up|reverse\s*lunge|walking\s*lunge)/i,
    info: {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings', 'calves'],
      region: 'legs',
      benefits: [
        'Builds single-leg strength and balance',
        'Corrects strength imbalances between legs',
      ],
    },
  },
  {
    match: /(leg\s*press)/i,
    info: {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings'],
      region: 'legs',
      benefits: [
        'Builds leg size with less lower-back stress than squats',
        'Lets you push heavier weight safely',
      ],
    },
  },
  {
    match: /(leg\s*extension)/i,
    info: {
      primary: ['quads'],
      secondary: [],
      region: 'legs',
      benefits: [
        'Isolates and grows the quads',
        'Builds the teardrop above the knee',
      ],
    },
  },
  {
    match: /(leg\s*curl|hamstring\s*curl|nordic)/i,
    info: {
      primary: ['hamstrings'],
      secondary: ['glutes'],
      region: 'legs',
      benefits: [
        'Isolates the hamstrings',
        'Protects knees by balancing quad strength',
      ],
    },
  },
  {
    match: /(hip\s*thrust|glute\s*bridge|cable\s*pull[\s-]*through)/i,
    info: {
      primary: ['glutes'],
      secondary: ['hamstrings'],
      region: 'legs',
      benefits: [
        'Builds glutes more directly than squats',
        'Improves hip extension power for sprinting and jumping',
      ],
    },
  },
  {
    match: /(calf\s*raise|calf\s*press)/i,
    info: {
      primary: ['calves'],
      secondary: [],
      region: 'legs',
      benefits: [
        'Builds calf size — often the hardest muscle to grow',
        'Strengthens ankles for running and jumping',
      ],
    },
  },
  {
    match: /(adductor|abductor|hip\s*abduction|hip\s*adduction)/i,
    info: {
      primary: ['adductors', 'glutes'],
      secondary: [],
      region: 'legs',
      benefits: [
        'Strengthens inner and outer thighs',
        'Improves hip stability',
      ],
    },
  },

  // ---------- CARDIO ----------
  {
    match: /(run|jog|treadmill|elliptical|cycling|bike|rowing\s*machine|jump\s*rope|hiit|cardio|burpee|mountain\s*climber|jumping\s*jack)/i,
    info: {
      primary: ['cardio'],
      secondary: ['quads', 'calves'],
      region: 'cardio',
      benefits: [
        'Improves heart health and stamina',
        'Burns calories for fat loss',
        'Boosts mood and energy',
      ],
    },
  },
]

const FALLBACK: ExerciseMuscleInfo = {
  primary: [],
  secondary: [],
  region: 'full_body',
  benefits: [
    'Adds variety to your routine',
    'Builds general strength and fitness',
  ],
}

export function getExerciseMuscleInfo(exerciseName: string): ExerciseMuscleInfo {
  if (!exerciseName) return FALLBACK
  for (const rule of RULES) {
    if (rule.match.test(exerciseName)) return rule.info
  }
  return FALLBACK
}

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  upper_back: 'Upper back',
  lower_back: 'Lower back',
  lats: 'Lats',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  glutes: 'Glutes',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  adductors: 'Inner thighs',
  traps: 'Traps',
  neck: 'Neck',
  cardio: 'Cardiovascular',
}

export function muscleLabel(m: MuscleGroup): string {
  return MUSCLE_LABELS[m] ?? m
}

const REGION_LABELS: Record<BodyRegion, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  legs: 'Legs',
  full_body: 'Full body',
  cardio: 'Cardio',
}

export function regionLabel(r: BodyRegion): string {
  return REGION_LABELS[r] ?? r
}

// Match an exercise's region/muscles against the user's AI-detected focus_areas (free-text).
// Returns matching focus areas the exercise helps with.
export function matchFocusAreas(info: ExerciseMuscleInfo, focusAreas: string[] | undefined | null): string[] {
  if (!focusAreas || focusAreas.length === 0) return []
  const allMuscles = [...info.primary, ...info.secondary].map((m) => muscleLabel(m).toLowerCase())
  const regionWord = regionLabel(info.region).toLowerCase()
  const matched: string[] = []
  for (const fa of focusAreas) {
    const lower = fa.toLowerCase()
    if (lower.includes(regionWord)) {
      matched.push(fa)
      continue
    }
    if (allMuscles.some((m) => lower.includes(m) || lower.includes(m.replace(/s$/, '')))) {
      matched.push(fa)
    }
  }
  return matched
}
