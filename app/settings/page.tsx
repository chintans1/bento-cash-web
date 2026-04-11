"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { useToken } from "@/hooks/use-token"
import { getMe, type UserInfo } from "@/lib/lunchmoney/client"

export default function SettingsPage() {
  const { token, setToken, clearToken } = useToken()
  const [input, setInput] = useState("")
  const [user, setUser] = useState<UserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) fetchUser(token)
  }, [token])

  async function fetchUser(apiToken: string) {
    setLoading(true)
    setError(null)
    try {
      setUser(await getMe(apiToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setToken(input.trim())
    setInput("")
  }

  function handleReset() {
    clearToken()
    setUser(null)
    setError(null)
  }

  const hint = (
    <p className="font-mono text-sm text-muted-foreground">
      Press <Kbd>d</Kbd> to toggle dark mode
    </p>
  )

  if (user) {
    return (
      <div className="flex flex-col items-center gap-5 p-6 pt-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">{user.name}</CardTitle>
            <CardDescription className="text-base">
              {user.budget_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-base">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-medium uppercase">
                  {user.primary_currency}
                </dd>
              </div>
              {user.api_key_label && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">API key</dt>
                  <dd className="font-medium">{user.api_key_label}</dd>
                </div>
              )}
            </dl>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleReset}>
              Change token
            </Button>
          </CardFooter>
        </Card>
        {hint}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 p-6 pt-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Connect Lunch Money</CardTitle>
          <CardDescription className="text-base">
            Enter your API token to get started. Find it under Settings →
            Developers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              placeholder="API token"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              disabled={loading}
              className="h-11 text-base"
            />
            {error && <p className="text-base text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={loading || !input.trim()}>
              {loading ? "Connecting…" : "Connect"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {hint}
    </div>
  )
}
