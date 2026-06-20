export interface User {
    id: number;
    username: string;
    password_hash: string;
    created_at?: Date;
}

export interface Profile {
    id: number;
    user_id: number;
    name?: string;
    age: number;
    weight: number;
    height: number;
    gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
    goal: 'Fat loss' | 'Muscle gain' | 'Strength' | 'Recomposition' | 'Endurance' | 'General fitness';
    level: 'Beginner' | 'Regular' | 'Expert';
    tenure: string;
    goal_weight?: number;
    goal_duration?: string;
    session_duration?: number; // Workout session duration in minutes (e.g., 30, 45, 60, 90, 120)
    notes?: string;
    updated_at?: Date;
    // Activity level for TDEE — collected once, reused by the nutrition tracker
    activity_level?: ActivityLevel;
    // Diet Preferences
    diet_type?: string[]; // Multi-select
    cuisine?: 'No Preference' | 'North Indian' | 'South Indian' | 'Mediterranean' | 'American' | 'Mexican' | 'Asian' | 'Mughlai';
    protein_powder?: 'Yes' | 'No';
    protein_powder_amount?: number; // Grams of protein from powder
    meals_per_day?: number;
    allergies?: string[]; // Multi-select
    specific_food_preferences?: string; // Users specific inclusions/exclusions
    cooking_level?: 'Beginner' | 'Moderate' | 'Advanced';
    budget?: 'Low' | 'Standard' | 'High';
    // Gym Equipment
    gym_photos?: GymPhoto[];
    gym_equipment_analysis?: GymEquipmentAnalysis;
    // Body Photos (NEW)
    body_photos?: BodyPhoto[];
    body_composition_analysis?: BodyCompositionAnalysis;
    // Rest day preferences (saved to profile, injected into AI)
    preferred_rest_days?: string[]; // e.g. ["Sat", "Sun"] — empty/null means AI decides
    // Nationality / Region (for community auto-assignment)
    nationality?: string;  // ISO 3166-1 alpha-2 country code (e.g. 'IN', 'US')
    region?: 'APAC' | 'EMEA' | 'NA' | 'LATAM';
    // Selected gym (gym selection + equipment auto-detection)
    selected_gym_name?: string;
    selected_gym_place_id?: string;
    selected_gym_image_url?: string;
    selected_gym_equipment?: string[];
    selected_gym_location?: string;
}

export interface GymPhoto {
    id: string;                          // UUID
    base64: string;                      // Image data
    content_type: string;                // 'image/jpeg', 'image/png', 'image/webp'
    size_bytes: number;
    uploaded_at: string;                 // ISO timestamp
}

export interface GymEquipmentAnalysis {
    equipment_detected: string[];        // E.g., ["barbell", "dumbbells", "bench"]
    gym_type: 'home' | 'commercial' | 'specialized';
    space_assessment: 'limited' | 'moderate' | 'spacious';
    unique_features?: string[];          // E.g., ["cable machine", "smith machine"]
    limitations?: string[];              // E.g., ["no squat rack", "light dumbbells only"]
    confidence_score: number;            // 0-1 from AI analysis
    analyzed_at: string;                 // ISO timestamp
}

export interface BodyPhoto {
    id: string;                          // UUID
    base64: string;                      // Image data
    content_type: string;                // 'image/jpeg', 'image/png', 'image/webp'
    size_bytes: number;
    uploaded_at: string;                 // ISO timestamp
}

export interface BodyCompositionAnalysis {
    body_type: 'lean' | 'average' | 'athletic' | 'muscular' | 'endomorph';
    estimated_body_fat_range?: string;   // E.g., "15-18%"
    muscle_development: 'beginner' | 'intermediate' | 'advanced';
    posture_notes?: string[];            // E.g., ["slight forward shoulder", "good spine alignment"]
    focus_areas: string[];               // E.g., ["chest development", "core strength"]
    realistic_timeline?: string;         // E.g., "3-6 months for visible muscle gain"
    exercise_modifications?: string[];   // E.g., ["start with lighter weights", "focus on form"]
    overall_assessment: string;          // Detailed AI summary
    confidence_score: number;            // 0-1 from AI analysis
    analyzed_at: string;                 // ISO timestamp
}


export interface Meal {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    ingredients: string;
}

export interface DailyDiet {
    day: string;
    meals: Meal[];
    total_calories: number;
    total_protein: number;
}

export interface WeeklyDiet {
    days: DailyDiet[];
}

// ============= NUTRITION TRACKING (Cal AI-style food log) =============

/** How a logged/draft food item entered the system. */
export type FoodSource = 'photo' | 'barcode' | 'search' | 'manual';

export type GoalType = 'maintenance' | 'deficit' | 'surplus';

export type ActivityLevel =
    | 'sedentary'
    | 'light'
    | 'moderate'
    | 'active'
    | 'very_active';

/** Per-user daily nutrition targets, stored on the profile. */
export interface NutritionGoals {
    daily_calorie_goal: number | null;
    protein_goal_g: number | null;
    carb_goal_g: number | null;
    fat_goal_g: number | null;
    goal_type: GoalType | null;
}

/** A single logged meal/food row. */
export interface FoodEntry {
    id: number;
    user_id: number;
    entry_date: string; // YYYY-MM-DD
    source: FoodSource;
    name: string;
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    quantity: number;
    unit: string;
    created_at: string;
}

/** A saved food for fast re-logging. */
export interface FavoriteFood {
    id: number;
    user_id: number;
    name: string;
    source: FoodSource;
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    quantity: number;
    unit: string;
    created_at: string;
}

/**
 * A normalized search/barcode result. Macros are expressed per 100 g/ml AND,
 * when the source provides it, per the product's declared serving — so the UI
 * can scale to any quantity the user picks.
 */
export interface FoodSearchResult {
    /** Open Food Facts barcode (`code`), when available. */
    code?: string;
    name: string;
    brand?: string;
    /** Macros per 100 g (or 100 ml). */
    per100g: MacroSet;
    /** Declared serving size string, e.g. "30 g" or "1 cup (240 ml)". */
    serving_size?: string;
    /** Grams (or ml) in one declared serving, parsed from serving_size. */
    serving_grams?: number;
    thumb_url?: string;
    source: FoodSource;
}

export interface MacroSet {
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
}

/**
 * An editable draft item shown before the user confirms a log. Shared across
 * the photo, barcode, and search entry flows. The current displayed macros live
 * on the item (via MacroSet); the optional bases below let the editor recompute
 * macros live as the user changes quantity/unit:
 *  - `per100g` + `servingGrams` for Open Food Facts search/barcode results
 *  - `perServing` for photo recognition and manual entries (scales by quantity)
 */
export interface DraftFoodItem extends MacroSet {
    /** Client-side id for list keys before persistence. */
    tempId: string;
    name: string;
    quantity: number;
    unit: string;
    source: FoodSource;
    /** Recognition confidence (photo flow only), 0–1. */
    confidence?: number;
    /** Macros per 100 g/ml (Open Food Facts results). */
    per100g?: MacroSet;
    /** Grams (or ml) in one declared serving (Open Food Facts results). */
    servingGrams?: number;
    /** Macros for a single serving (photo recognition / manual entries). */
    perServing?: MacroSet;
    /**
     * When true the editor shows editable macro inputs (manual entries, or
     * editing a logged entry whose per-100g base we no longer have). When
     * false, macros are derived from per100g/perServing and shown read-only.
     */
    editableMacros?: boolean;
}

/** Result of running a meal photo through recognition. */
export interface PhotoRecognitionResult {
    ok: boolean;
    /** True when the engine ran but confidence was too low to trust. */
    lowConfidence?: boolean;
    /** Why recognition is unavailable/failed, so the UI can fall back to search. */
    reason?: string;
    items: DraftFoodItem[];
}

/** Dashboard payload: today's totals vs. goals + entries + quick-log lists. */
export interface NutritionDaySummary {
    date: string;
    goals: NutritionGoals;
    totals: MacroSet;
    entries: FoodEntry[];
    recent: FavoriteFood[];
    favorites: FavoriteFood[];
}

export interface Session {
    id: string;
    user_id: number;
    expires_at: Date;
}

export interface Exercise {
    name: string;
    sets_reps: string;
    /**
     * New format (preferred): 3 tutorial video URLs.
     * Kept optional for backward compatibility with saved routines.
     */
    youtube_urls?: string[];
    /** Backward compatibility */
    youtube_url?: string;

    /**
     * New format (preferred): bullet-style form/tutorial points (>= 3).
     * Kept optional for backward compatibility with saved routines.
     */
    tutorial_points?: string[];
    /** Backward compatibility */
    form_tip?: string;
    /** WikiHow tutorial link */
    wikihow_url?: string;
}

export interface DayRoutine {
    day: string;
    exercises: Exercise[];
}

export interface WeeklyRoutine {
    days: DayRoutine[];
}

export interface RoutineGenerationInput {
    age: number;
    weight: number;
    height: number;
    gender: Profile['gender'];
    goal: Profile['goal'];
    level: 'Beginner' | 'Regular' | 'Expert';
    tenure: string;
    goal_weight?: number;
    goal_duration?: string;
    session_duration?: number; // Workout session duration in minutes
    notes?: string;
    model_provider: 'Anthropic' | 'OpenAI';
    apiKey?: string;
    model?: string;
    restDays?: string[]; // e.g. ["Sat", "Sun"]
    isNextWeek?: boolean; // true = generating Week N+1, apply progressive overload
    weekNumber?: number;  // which week number is being generated
}

// Progress Tracking Types
export interface SavedRoutine {
    id: number;
    user_id: number;
    week_number: number;
    routine_json: WeeklyRoutine;
    created_at: Date;
}

export interface ExerciseCompletion {
    id: number;
    routine_id: number;
    day_index: number;
    exercise_index: number;
    completed: boolean;
    actual_weight?: number;
    actual_reps?: number;
    notes?: string;
    completed_at?: Date;
}

export interface PersonalRecord {
    exercise: string;
    weight: number;        // heaviest logged weight (kg)
    reps: number | null;   // reps achieved at that weight
    achieved_at: string | null; // ISO timestamp
}

export interface CompletionStats {
    total_exercises: number;
    completed_exercises: number;
    completion_percentage: number;
    exercises_by_day: {
        day_name: string;
        total: number;
        completed: number;
    }[];
}

// Billing / Premium
export interface PremiumStatus {
    /** Paid subscription active (or cancelled but still within current_end) */
    premium: boolean;
    /** Access to analytics (paid OR trial) */
    access: boolean;
    /** 7-day trial is currently active */
    trial_active: boolean;
    /** Trial end timestamp (ISO string) */
    trial_end: string | null;
    status: string | null;
    subscription_id: string | null;
    current_end: string | null; // serialized from API
}

// ============= Personal Coach (Premium / Trial) =============

export type Coach = {
    id: string;
    name: string;
    phone: string;
    email: string;
};

export type CoachBooking = {
    id: number;
    coach_name: string;
    coach_phone: string;
    coach_email: string;
    preferred_at: string | null; // ISO
    message: string | null;
    status: string;
    created_at: string; // ISO
};

// ============= Analytics (Premium) =============

export type AnalyticsTrendPoint = {
    /** YYYY-MM-DD */
    date: string;
    /** 0..100 */
    completion_percentage: number;
    workouts: number;
};

export type AnalyticsWeekPoint = {
    /** ISO week key like 2026-W03 */
    week: string;
    /** 0..100 */
    completion_percentage: number;
    workouts: number;
};

export type AnalyticsMonthPoint = {
    /** Month key like 2026-01 */
    month: string;
    /** 0..100 */
    completion_percentage: number;
    workouts: number;
};

export type AnalyticsStreak = {
    current: number;
    longest: number;
    /** YYYY-MM-DD or null */
    last_workout_date: string | null;
};

export type AnalyticsCalendarDay = {
    /** YYYY-MM-DD */
    date: string;
    workouts: number;
    /** 0..100 weighted completion, null if no workout that day */
    completion_percentage: number | null;
};

export type AnalyticsWorkout = {
    /** ISO timestamp */
    workout_at: string;
    /** YYYY-MM-DD (derived server-side, UTC) */
    date: string;
    routine_id: number;
    week_number: number | null;
    day_index: number;
    day_name: string;
    completed_exercises: number;
    total_exercises: number;
    /** 0..100 */
    completion_percentage: number;
};

export type AnalyticsPayload = {
    range_days: number;
    generated_at: string;
    trends: {
        daily: AnalyticsTrendPoint[];
        weekly: AnalyticsWeekPoint[];
        monthly: AnalyticsMonthPoint[];
    };
    streak: AnalyticsStreak;
    calendar: AnalyticsCalendarDay[];
    workout_history: AnalyticsWorkout[];
};