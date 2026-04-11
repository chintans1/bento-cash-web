"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "lm_token"

export function useToken() {
  const [token, setTokenState] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read; must run in effect to avoid hydration mismatch
    setTokenState(localStorage.getItem(STORAGE_KEY))
  }, [])

  function setToken(value: string) {
    localStorage.setItem(STORAGE_KEY, value)
    setTokenState(value)
  }

  function clearToken() {
    localStorage.removeItem(STORAGE_KEY)
    setTokenState(null)
  }

  return { token, setToken, clearToken }
}
