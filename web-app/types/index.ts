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
    notes?: string;
    updated_at?: Date;
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
    notes?: string;
    model_provider: 'Anthropic' | 'OpenAI';
    apiKey?: string;
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
