import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { csrfFetch } from '@/lib/useCsrf';

interface ExerciseCheckboxProps {
  routineId: number | null;
  dayIndex: number;
  exerciseIndex: number;
  exerciseName: string;
  initialCompleted?: boolean;
  onToggle?: (completed: boolean) => void;
  onEnsureRoutineSaved?: () => Promise<number | null>;
}

export function ExerciseCheckbox({
  routineId,
  dayIndex,
  exerciseIndex,
  exerciseName,
  initialCompleted = false,
  onToggle,
  onEnsureRoutineSaved,
}: ExerciseCheckboxProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCompleted(initialCompleted);
  }, [initialCompleted]);

  const handleToggle = async () => {
    let activeRoutineId = routineId;
    
    if (!activeRoutineId) {
      if (onEnsureRoutineSaved) {
        setLoading(true);
        try {
          activeRoutineId = await onEnsureRoutineSaved();
        } catch (e) {
          console.error("Failed to ensure routine saved:", e);
        }
      }
      
      if (!activeRoutineId) {
        setLoading(false); // CRITICAL FIX: reset loading if we still don't have an ID
        return; 
      }
    }
    
    const newState = !completed;
    setCompleted(newState); // Optimistic update
    setLoading(true);

    try {
      const res = await csrfFetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routineId: activeRoutineId,
          dayIndex,
          exerciseIndex,
          completed: newState,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update completion');
      }

      onToggle?.(newState);
    } catch (error) {
      console.error('Error toggling exercise:', error);
      // Revert on error
      setCompleted(!newState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading || (!routineId && !onEnsureRoutineSaved)}
      className={`
        shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold
        transition-all duration-200 border
        flex items-center gap-2
        ${completed 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20'
          : 'bg-[#8B5CF6]/5 border-[#8B5CF6]/20 text-slate-300 hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/30 hover:text-white'
        }
        ${loading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
        ${(!routineId && !onEnsureRoutineSaved) ? 'cursor-not-allowed opacity-50' : ''}
      `}
      aria-label={`Mark ${exerciseName} as ${completed ? 'incomplete' : 'complete'}`}
      title={(!routineId && !onEnsureRoutineSaved) ? 'Save routine first to track progress' : undefined}
    >
      {loading ? (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : completed ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <span className="w-3.5 h-3.5 rounded-sm border border-current opacity-60" />
      )}
      <span>{completed ? 'Completed' : 'Mark Done'}</span>
    </button>
  );
}
