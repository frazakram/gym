export interface User {
    id: number;
    username: string;
    password_hash: string;
    created_at?: Date;
}

export interface Profile {
    id: number;
    user_id: number;
    age: number;
    weight: number;
    height: number;
    gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
    goal: 'Fat loss' | 'Muscle gain' | 'Strength' | 'Recomposition' | 'Endurance' | 'General fitness';
    level: 'Beginner' | 'Regular' | 'Expert';
    tenure: string;
    goal_weight?: number;
    notes?: string;
    updated_at?: Date;
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
