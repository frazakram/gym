'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react'

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

    const getTypeStyles = () => {
        switch (type) {
            case 'error':
                return {
                    iconBg: 'bg-red-500/15 text-red-400',
                    accent: 'from-red-500 to-rose-600',
                    ring: 'ring-red-500/20',
                    defaultIcon: <AlertTriangle className="w-7 h-7" />,
                    defaultConfirmLabel: 'Dismiss',
                }
            case 'warning':
                return {
                    iconBg: 'bg-[#8B5CF6]/15 text-[#A78BFA]',
                    accent: 'from-[#8B5CF6] to-[#7C3AED]',
                    ring: 'ring-[#8B5CF6]/20',
                    defaultIcon: <Info className="w-7 h-7" />,
                    defaultConfirmLabel: 'Continue',
                }
            case 'success':
                return {
                    iconBg: 'bg-emerald-500/15 text-emerald-400',
                    accent: 'from-emerald-500 to-teal-600',
                    ring: 'ring-emerald-500/20',
                    defaultIcon: <CheckCircle className="w-7 h-7" />,
                    defaultConfirmLabel: 'Got it',
                }
            case 'info':
            default:
                return {
                    iconBg: 'bg-[#22D3EE]/15 text-[#22D3EE]',
                    accent: 'from-[#22D3EE] to-[#06B6D4]',
                    ring: 'ring-[#22D3EE]/20',
                    defaultIcon: <Info className="w-7 h-7" />,
                    defaultConfirmLabel: 'Okay',
                }
        }
    }

    const styles = getTypeStyles()
    const finalConfirmLabel = confirmLabel || styles.defaultConfirmLabel
    const displayIcon = icon || styles.defaultIcon

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0A14]/85 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className={`
                            w-full max-w-sm
                            bg-[#12121E]/95 border border-[#8B5CF6]/15 rounded-3xl
                            shadow-2xl shadow-[#8B5CF6]/5 overflow-hidden
                            ring-1 ${styles.ring}
                        `}
                    >
                        <div className="p-6 sm:p-8">
                            <div className="flex justify-center mb-5">
                                <div className={`w-16 h-16 rounded-2xl ${styles.iconBg} flex items-center justify-center`}>
                                    {displayIcon}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white text-center mb-2 tracking-tight font-[family-name:var(--font-display)]">
                                {title}
                            </h3>

                            <p className="text-slate-300/90 text-center leading-relaxed text-sm mb-8">
                                {message}
                            </p>

                            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
                                {onCancel && (
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={onCancel}
                                        disabled={loading}
                                        className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                                    >
                                        {cancelLabel}
                                    </motion.button>
                                )}
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={onConfirm || onCancel}
                                    disabled={loading}
                                    className={`
                                        px-6 py-2.5 rounded-xl font-semibold text-sm
                                        bg-gradient-to-r ${styles.accent} text-white
                                        shadow-lg transition-all
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        flex items-center justify-center gap-2
                                    `}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        finalConfirmLabel
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
