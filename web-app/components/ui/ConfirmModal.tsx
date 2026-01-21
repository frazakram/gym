'use client'

import { ReactNode } from 'react'

interface ConfirmModalProps {
    open: boolean
    type?: 'warning' | 'error' | 'info' | 'success'
    title: string
    message: string
    icon?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    onConfirm?: () => void
    onCancel?: () => void
    loading?: boolean
}

export function ConfirmModal({
    open,
    type = 'warning',
    title,
    message,
    icon,
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    loading = false,
}: ConfirmModalProps) {
    if (!open) return null

    const getTypeStyles = () => {
        switch (type) {
            case 'error':
                return {
                    iconBg: 'bg-red-500/15 text-red-400',
                    accent: 'from-red-500 to-rose-600',
                    ring: 'ring-red-500/20',
                    defaultIcon: (
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    defaultConfirmLabel: 'Dismiss',
                }
            case 'warning':
                return {
                    iconBg: 'bg-teal-500/15 text-teal-400',
                    accent: 'from-teal-500 to-emerald-600',
                    ring: 'ring-teal-500/20',
                    defaultIcon: (
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    defaultConfirmLabel: 'Continue',
                }
            case 'success':
                return {
                    iconBg: 'bg-emerald-500/15 text-emerald-400',
                    accent: 'from-emerald-500 to-teal-600',
                    ring: 'ring-emerald-500/20',
                    defaultIcon: (
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    defaultConfirmLabel: 'Got it',
                }
            case 'info':
            default:
                return {
                    iconBg: 'bg-cyan-500/15 text-cyan-400',
                    accent: 'from-cyan-500 to-blue-600',
                    ring: 'ring-cyan-500/20',
                    defaultIcon: (
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    defaultConfirmLabel: 'Okay',
                }
        }
    }

    const styles = getTypeStyles()
    const finalConfirmLabel = confirmLabel || styles.defaultConfirmLabel
    const displayIcon = icon || styles.defaultIcon

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`
          w-full max-w-sm 
          bg-slate-900/95 border border-white/10 rounded-3xl 
          shadow-2xl overflow-hidden 
          ring-1 ${styles.ring}
          animate-scale-bounce
        `}
            >
                <div className="p-6 sm:p-8">
                    {/* Icon */}
                    <div className="flex justify-center mb-5">
                        <div className={`w-16 h-16 rounded-2xl ${styles.iconBg} flex items-center justify-center`}>
                            {displayIcon}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white text-center mb-2 tracking-tight">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-slate-300/90 text-center leading-relaxed text-sm mb-8">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                disabled={loading}
                                className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                        )}
                        <button
                            onClick={onConfirm || onCancel}
                            disabled={loading}
                            className={`
                px-6 py-2.5 rounded-xl font-semibold text-sm 
                bg-gradient-to-r ${styles.accent} text-white
                shadow-lg transform transition-all active:scale-95 
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              `}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                finalConfirmLabel
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
