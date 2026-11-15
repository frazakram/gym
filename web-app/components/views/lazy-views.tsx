'use client'

import dynamic from 'next/dynamic'
import { CardSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Dashboard views other than Home, each in its own chunk: the dashboard opens
 * on Home, so the code for the other nine views is downloaded the first time
 * the user opens each one instead of with the first page load.
 */
const loading = () => <CardSkeleton />

export const RoutineView = dynamic(() => import('./RoutineView').then((m) => m.RoutineView), { loading })
export const WorkoutView = dynamic(() => import('./WorkoutView').then((m) => m.WorkoutView), { loading })
export const ProfileView = dynamic(() => import('./ProfileView').then((m) => m.ProfileView), { loading })
export const DietView = dynamic(() => import('./DietView').then((m) => m.DietView), { loading })
export const AnalyticsView = dynamic(() => import('./AnalyticsView').then((m) => m.AnalyticsView), { loading })
export const CoachView = dynamic(() => import('./CoachView').then((m) => m.CoachView), { loading })
export const BodyView = dynamic(() => import('./BodyView').then((m) => m.BodyView), { loading })
export const CommunitiesView = dynamic(() => import('./CommunitiesView').then((m) => m.CommunitiesView), { loading })
export const NutritionView = dynamic(() => import('./NutritionView').then((m) => m.NutritionView), { loading })
