import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icon'
import { ToastContext } from './toast'
import type { ToastKind } from './toast'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const VISIBLE_MS = 3500
let nextId = 1

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId++
    setToasts((current) => [...current, { id, message, kind }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), VISIBLE_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              layout
              key={toast.id}
              className={`toast ${toast.kind}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            >
              <Icon name={toast.kind === 'success' ? 'check' : 'close'} size={16} />
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
