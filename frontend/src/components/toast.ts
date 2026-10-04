import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error'

export const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {})

/** Returns a function that shows a short message in the corner of the screen. */
export const useToast = () => useContext(ToastContext)
