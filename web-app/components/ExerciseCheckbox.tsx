import React, { useState, useEffect } from 'react';

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
      const res = await fetch('/api/completions', {
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
          : 'bg-slate-800/60 border-slate-600/50 text-slate-300 hover:bg-slate-800 hover:border-slate-500 hover:text-white'
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
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="w-3.5 h-3.5 rounded-sm border border-current opacity-60" />
      )}
      <span>{completed ? 'Completed' : 'Mark Done'}</span>
    </button>
  );
}
