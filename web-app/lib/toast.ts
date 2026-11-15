export type ToastType = 'error' | 'warning' | 'success' | 'info' | 'payment'

export type Toast = {
  id: string
  type: ToastType
  title: string
  message?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

const listeners: ((t: Toast) => void)[] = []

/**
 * Toasts raised while nothing is subscribed. ToastProvider mounts after the
 * page in the root layout, so a page's mount effects run before it subscribes;
 * without this queue a toast raised on page load was silently dropped.
 */
const undelivered: Toast[] = []

export function toast(opts: Omit<Toast, 'id'>) {
  const t: Toast = { ...opts, id: crypto.randomUUID() }
  if (listeners.length === 0) {
    undelivered.push(t)
    return
  }
  listeners.forEach(fn => fn(t))
}

export function subscribeToasts(fn: (t: Toast) => void) {
  listeners.push(fn)
  undelivered.splice(0).forEach(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i > -1) listeners.splice(i, 1)
  }
}

export const toastError = (title: string, message?: string, action?: Toast['action']) =>
  toast({ type: 'error', title, message, action })

export const toastWarning = (title: string, message?: string) =>
  toast({ type: 'warning', title, message })

export const toastSuccess = (title: string, message?: string, duration = 3500) =>
  toast({ type: 'success', title, message, duration })

export const toastInfo = (title: string, message?: string, duration = 3500) =>
  toast({ type: 'info', title, message, duration })

export const toastPayment = (title: string, message?: string, action?: Toast['action']) =>
  toast({ type: 'payment', title, message, action, duration: undefined })
