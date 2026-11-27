import { useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'

export const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000 // 5 دقائق (300,000 مللي ثانية)

export function useAutoSave() {
  const autoSaveEnabled = useDesignStore((s) => s.autoSaveEnabled)

  useEffect(() => {
    if (!autoSaveEnabled) return

    const timerId = window.setInterval(() => {
      useDesignStore.getState().performAutoSave()
    }, AUTO_SAVE_INTERVAL_MS)

    return () => {
      window.clearInterval(timerId)
    }
  }, [autoSaveEnabled])
}
