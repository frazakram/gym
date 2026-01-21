'use client'

import { useState, ReactNode } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'

interface SwipeableExerciseWrapperProps {
    children: ReactNode
    isCompleted: boolean
    onComplete: () => void
    onSkip: () => void
    disabled?: boolean
}

export function SwipeableExerciseWrapper({
    children,
    isCompleted,
    onComplete,
    onSkip,
    disabled = false,
}: SwipeableExerciseWrapperProps) {
    const [isDragging, setIsDragging] = useState(false)
    const x = useMotionValue(0)

    // Color transforms based on drag direction
    const background = useTransform(
        x,
        [-150, 0, 150],
        [
            'rgba(244, 63, 94, 0.15)', // Rose/skip color (left)
            'rgba(0, 0, 0, 0)',        // Neutral
            'rgba(16, 185, 129, 0.15)' // Green/complete color (right)
        ]
    )

    const rightIconOpacity = useTransform(x, [0, 80], [0, 1])
    const leftIconOpacity = useTransform(x, [-80, 0], [1, 0])
    const scale = useTransform(x, [-150, 0, 150], [0.97, 1, 0.97])

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false)

        if (disabled) return

        const threshold = 100

        if (info.offset.x > threshold) {
            // Swiped right - Complete
            onComplete()
        } else if (info.offset.x < -threshold) {
            // Swiped left - Skip (optional)
            onSkip()
        }
    }

    if (isCompleted) {
        // Already completed - show static card with checkmark
        return (
            <div className="relative">
                {/* Completed overlay */}
                <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/30 flex items-center justify-center z-10 pointer-events-none">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="opacity-50">{children}</div>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Background indicators */}
            <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                {/* Left - Skip indicator */}
                <motion.div
                    className="flex items-center gap-2 text-rose-400"
                    style={{ opacity: leftIconOpacity }}
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm font-semibold">Skip</span>
                </motion.div>

                {/* Right - Complete indicator */}
                <motion.div
                    className="flex items-center gap-2 text-emerald-400"
                    style={{ opacity: rightIconOpacity }}
                >
                    <span className="text-sm font-semibold">Done</span>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </motion.div>
            </div>

            {/* Draggable card */}
            <motion.div
                drag={disabled ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                style={{ x, background, scale }}
                className={`relative rounded-2xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                whileTap={{ cursor: 'grabbing' }}
            >
                {children}

                {/* Swipe hint for first-time users */}
                {!disabled && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 flex items-center gap-1 opacity-60">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Swipe to complete
                    </div>
                )}
            </motion.div>
        </div>
    )
}
