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
    youtube_url: string;
    form_tip: string;
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
