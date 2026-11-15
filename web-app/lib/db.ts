// Data access layer. Split by domain into lib/db/*; this file re-exports the
// public API so callers keep importing from '@/lib/db'. Internal helpers
// (pool, mock stores, row mappers) are deliberately not re-exported.
export { initializeDatabase } from './db/core';
export { authenticateUser, createUser, createUserWithRandomPassword, getSessionVersion, getUser, getUserIdByUsername, revokeAllSessions } from './db/users';
export { getBodyPhotos, getProfile, getUserGym, hasBodyPhotos, hasGymPhotos, hasSignificantProfileChange, saveProfile, saveUserGym } from './db/profiles';
export type { UserGym } from './db/profiles';
export { deleteAllUserRoutines, deleteRoutineById, getCompletionStats, getDayCompletions, getLatestRoutine, getPersonalRecords, getRoutineById, getRoutineByWeek, getRoutinesByUser, saveRoutine, setRoutineArchived, toggleDayCompletion, toggleExerciseCompletion } from './db/routines';
export type { ExerciseSetDetails, PersonalRecord } from './db/routines';
export { getHeatmapData, getStreak, getUserAnalytics } from './db/analytics';
export type { HeatmapData, StreakData } from './db/analytics';
export { addBodyMeasurement, deleteBodyMeasurement, getBodyMeasurements } from './db/measurements';
export type { BodyMeasurement } from './db/measurements';
export { addFavoriteFood, addFoodEntry, deleteFavoriteFood, deleteFoodEntry, getDailyTotals, getFavoriteFoods, getFoodEntries, getFoodEntriesRange, getNutritionGoals, getRecentFoods, saveActivityLevel, saveNutritionGoals, updateFoodEntry } from './db/nutrition';
export type { FoodEntryInput } from './db/nutrition';
export { getDietByWeek, getLatestDiet, saveDiet } from './db/diets';
export { getPremiumStatus, hasProcessedRazorpayEvent, recordProcessedRazorpayEvent, upsertSubscriptionFromRazorpay } from './db/billing';
export type { PremiumStatus } from './db/billing';
export { createCoachApplication, createCoachBooking, deleteCoachBookingForUser, getActiveCoachBookingForUser, getApprovedCoachIdByUserId, getApprovedCoachPublicById, getCoachApplicationByUserId, getCoachBookingByIdAdmin, getCoachBookingByIdForUser, getCoachProfileByCoachId, listAllCoachBookingsAdmin, listApprovedCoachesPublic, listAssignedCoachBookings, listCoachApplicationsAdmin, listCoachBookings, setCoachApplicationStatusAdmin, updateCoachBookingStatusAdmin, updateCoachBookingStatusForUser, updateCoachProfileByUser } from './db/coach';
export type { AdminCoachBookingRow, CoachApplication, CoachBooking, CoachProfile, CoachPublic, CoachStatus } from './db/coach';
export { countryToRegion, saveNationality } from './db/regions';
export { XP_VALUES, awardStreakXpIfFirstToday, awardXp, getUserXp } from './db/xp';
export type { UserXp } from './db/xp';
export { createCustomCommunity, getCommunityById, getCommunityByJoinCode, getCommunityLeaderboard, getMyCommunity, getOrCreateRegionalCommunityId, getRejoinCooldownExpiry, joinCommunity, leaveCommunity, listWorldwideCommunities } from './db/communities';
export type { Community, CommunityMember, CommunityType, Region } from './db/communities';
