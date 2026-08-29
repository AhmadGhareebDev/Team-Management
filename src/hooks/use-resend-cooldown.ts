"use client"

import { useSyncExternalStore, useCallback } from "react"

function computeRemaining(storageKey: string): number {
  if (typeof window === "undefined") return 0
  const stored = localStorage.getItem(storageKey)
  if (!stored) return 0
  const remaining = Math.ceil((Number(stored) - Date.now()) / 1000)
  if (remaining <= 0) {
    localStorage.removeItem(storageKey)
    return 0
  }
  return remaining
}

export function useResendCooldown(key: string, cooldownSeconds = 60) {
  const storageKey = `resend-cooldown:${key}`

  // server snapshot = 0 (matches SSR); client snapshot = live remaining seconds
  const secondsLeft = useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 1000) // re-check every second
      return () => clearInterval(id)
    },
    () => computeRemaining(storageKey),
    () => 0
  )

  const startCooldown = useCallback(() => {
    const expiry = Date.now() + cooldownSeconds * 1000
    localStorage.setItem(storageKey, String(expiry))
  }, [storageKey, cooldownSeconds])

  return { secondsLeft, isActive: secondsLeft > 0, startCooldown }
}