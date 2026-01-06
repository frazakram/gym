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
