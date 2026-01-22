import { z } from "zod";

// ============= AUTH SCHEMAS =============

export const LoginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must contain at least one special character"),
});

// ============= PROFILE SCHEMAS =============

// Must match types/index.ts Profile interface exactly
export const GenderEnum = z.enum(["Male", "Female", "Non-binary", "Prefer not to say"]);
export const GoalEnum = z.enum([
  "Fat loss",
  "Muscle gain", 
  "Strength",
  "Recomposition",
  "Endurance",
  "General fitness"
]);
export const LevelEnum = z.enum(["Beginner", "Regular", "Expert"]);
export const CookingLevelEnum = z.enum(["Beginner", "Moderate", "Advanced"]).optional();
export const BudgetEnum = z.enum(["Low", "Standard", "High"]).optional();
export const CuisineEnum = z.enum([
  "No Preference",
  "North Indian",
  "South Indian", 
  "Mediterranean",
  "American",
  "Mexican",
  "Asian",
  "Mughlai"
]).optional();

export const ProfileUpdateSchema = z.object({
  age: z.coerce.number().int().min(13, "Age must be at least 13").max(120, "Age must be at most 120"),
  weight: z.coerce.number().min(20, "Weight must be at least 20 kg").max(400, "Weight must be at most 400 kg"),
  height: z.coerce.number().min(50, "Height must be at least 50 cm").max(300, "Height must be at most 300 cm"),
  gender: GenderEnum,
  goal: GoalEnum,
  level: z.string().min(1, "Level is required").max(50),
  tenure: z.string().min(1, "Tenure is required").max(100),
  goal_weight: z.coerce.number().min(20).max(400).optional().nullable(),
  notes: z.string().max(2000, "Notes must be at most 2000 characters").optional().nullable(),
  goal_duration: z.string().max(100).optional().nullable(),
  session_duration: z.coerce.number().int().min(15).max(300).optional().nullable(),
  diet_type: z.array(z.string()).optional().nullable(),
  cuisine: CuisineEnum.nullable(),
  protein_powder: z.enum(["Yes", "No"]).optional().nullable(),
  protein_powder_amount: z.coerce.number().int().min(0).max(200).optional().nullable(),
  meals_per_day: z.coerce.number().int().min(1).max(10).optional().nullable(),
  allergies: z.array(z.string()).optional().nullable(),
  specific_food_preferences: z.string().max(1000).optional().nullable(),
  cooking_level: CookingLevelEnum.nullable(),
  budget: BudgetEnum.nullable(),
  name: z.string().max(100).optional().nullable(),
  gym_photos: z.any().optional().nullable(),
  gym_equipment_analysis: z.any().optional().nullable(),
  body_photos: z.any().optional().nullable(),
  body_composition_analysis: z.any().optional().nullable(),
});

// ============= ROUTINE SCHEMAS =============

export const ModelProviderEnum = z.enum(["Anthropic", "OpenAI"]);

export const RoutineGenerateSchema = z.object({
  age: z.coerce.number().int().min(13).max(120),
  weight: z.coerce.number().min(20).max(400),
  height: z.coerce.number().min(50).max(300),
  height_unit: z.enum(["cm", "ftin"]).optional(),
  height_ft: z.coerce.number().int().min(1).max(8).optional(),
  height_in: z.coerce.number().min(0).max(11.9).optional(),
  gender: GenderEnum,
  goal: GoalEnum,
  level: LevelEnum,
  tenure: z.string().min(1).max(100),
  goal_weight: z.coerce.number().min(20).max(400).optional().nullable(),
  goal_duration: z.string().max(100).optional().nullable(),
  session_duration: z.coerce.number().int().min(15).max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  model_provider: ModelProviderEnum,
  api_key: z.string().max(200).optional(),
  apiKey: z.string().max(200).optional(),
  stream: z.boolean().optional(),
  week_number: z.coerce.number().int().min(1).max(52).optional(),
  regenerate: z.boolean().optional(),
});

export const RoutineSaveSchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(52),
  routine: z.object({
    days: z.array(z.object({
      day: z.string(),
      exercises: z.array(z.any()),
    })),
  }),
  weekStartDate: z.string().datetime().optional().nullable(),
});

export const RoutineIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============= COMPLETION SCHEMAS =============

export const ExerciseCompletionSchema = z.object({
  routineId: z.coerce.number().int().positive(),
  dayIndex: z.coerce.number().int().min(0).max(6),
  exerciseIndex: z.coerce.number().int().min(0).max(50),
  completed: z.boolean(),
});

export const DayCompletionSchema = z.object({
  routineId: z.coerce.number().int().positive(),
  dayIndex: z.coerce.number().int().min(0).max(6),
  completed: z.boolean(),
});

// ============= DIET SCHEMAS =============

export const DietGenerateSchema = z.object({
  routine: z.any().optional(),
  model_provider: ModelProviderEnum.optional().default("Anthropic"),
  apiKey: z.string().max(200).optional(),
});

export const DietSaveSchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(52),
  diet: z.object({
    days: z.array(z.any()),
  }),
});

// ============= COACH SCHEMAS =============

export const CoachBookingSchema = z.object({
  userName: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters"),
  userEmail: z.string().email("Invalid email address"),
  userPhone: z.string().min(7, "Phone must be at least 7 characters").max(20, "Phone must be at most 20 characters"),
  coachId: z.coerce.number().int().positive().optional().nullable(),
  preferredAt: z.string().datetime().optional().nullable(),
  message: z.string().max(1000, "Message must be at most 1000 characters").optional().nullable(),
});

export const CoachApplySchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(100),
  bio: z.string().max(2000).optional().nullable(),
  experience_years: z.coerce.number().int().min(0).max(50).optional().nullable(),
  certifications: z.string().max(1000).optional().nullable(),
  specialties: z.array(z.string()).optional().nullable(),
  languages: z.array(z.string()).optional().nullable(),
  timezone: z.string().max(50).optional().default("Asia/Kolkata"),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export const CoachBookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

// ============= BILLING SCHEMAS =============

export const SubscriptionCreateSchema = z.object({
  planId: z.string().min(1).max(100),
});

// ============= ANALYTICS SCHEMAS =============

export const AnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(90),
});

export const HeatmapQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(56),
});

// ============= NOTES SCHEMAS =============

export const NotesImproveSchema = z.object({
  notes: z.string().min(1, "Notes cannot be empty").max(5000, "Notes must be at most 5000 characters"),
  model_provider: ModelProviderEnum.optional().default("Anthropic"),
  apiKey: z.string().max(200).optional(),
});

// ============= ADMIN SCHEMAS =============

export const AdminCoachStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  adminNotes: z.string().max(1000).optional().nullable(),
});

export const AdminBookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

// ============= GYM/BODY ANALYSIS SCHEMAS =============

export const GymAnalyzeSchema = z.object({
  images: z.array(z.string()).min(1, "At least one image is required").max(5, "Maximum 5 images allowed"),
});

export const BodyAnalyzeSchema = z.object({
  images: z.array(z.string()).min(1, "At least one image is required").max(3, "Maximum 3 images allowed"),
});

// ============= HELPER FUNCTIONS =============

/**
 * Safe parse that returns a formatted error message
 */
export function safeParseWithError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Format Zod errors into a readable message
  const errors = result.error.issues.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
    return `${path}${e.message}`;
  });
  
  return { success: false, error: errors.join("; ") };
}

/**
 * Parse or throw with formatted error
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = safeParseWithError(schema, data);
  if (!result.success) {
    throw new Error(context ? `${context}: ${result.error}` : result.error);
  }
  return result.data;
}
