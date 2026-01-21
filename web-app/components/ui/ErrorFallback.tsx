'use client'

import { AnimatedButton } from './AnimatedButton'

interface ErrorFallbackProps {
    title?: string
    message?: string
    onRetry?: () => void
    className?: string
}

export function ErrorFallback({
    title = 'Something went wrong',
    message = 'We encountered an error while loading this content. Please try again.',
    onRetry,
    className = '',
}: ErrorFallbackProps) {
    return (
        <div className={`glass rounded-2xl p-8 text-center animate-in fade-in duration-300 ${className}`}>
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/15 flex items-center justify-center">
                <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>

            {/* Message */}
            <p className="text-sm text-slate-300/80 mb-6 max-w-sm mx-auto leading-relaxed">
                {message}
            </p>

            {/* Retry Button */}
            {onRetry && (
                <AnimatedButton onClick={onRetry} variant="secondary">
                    Try again
                </AnimatedButton>
            )}
        </div>
    )
}

interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description?: string
    action?: React.ReactNode
    className?: string
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`glass rounded-2xl p-8 text-center animate-in fade-in duration-300 ${className}`}>
            {/* Icon */}
            {icon && (
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-500/15 flex items-center justify-center text-slate-400">
                    {icon}
                </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>

            {/* Description */}
            {description && (
                <p className="text-sm text-slate-300/80 mb-6 max-w-sm mx-auto leading-relaxed">
                    {description}
                </p>
            )}

            {/* Action */}
            {action && <div>{action}</div>}
        </div>
    )
}
