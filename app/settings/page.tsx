"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Kbd } from "@/components/ui/kbd";
import { useToken } from "@/hooks/use-token";
import { getMe, type UserInfo } from "@/lib/lunchmoney/client";

export default function SettingsPage() {
  const { token, setToken, clearToken } = useToken();
  const [input, setInput] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [floorMonths, setFloorMonths] = useState<number>(3);
  const [floorMonthsInput, setFloorMonthsInput] = useState<string>("3");

  useEffect(() => {
    if (token) fetchUser();
    const raw = localStorage.getItem("investable_months");
    const parsed = raw !== null ? parseInt(raw, 10) : NaN;
    const val = Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
    setFloorMonths(val);
    setFloorMonthsInput(String(val));
  }, [token]);

  function handleFloorMonthsChange(raw: string) {
    setFloorMonthsInput(raw);
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) {
      localStorage.setItem("investable_months", String(n));
      setFloorMonths(n);
    }
  }

  async function fetchUser() {
    setLoading(true);
    setError(null);
    try {
      setUser(await getMe());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setToken(input.trim());
    setInput("");
  }

  function handleReset() {
    clearToken();
    setUser(null);
    setError(null);
  }

  const hint = (
    <p className="font-mono text-sm text-bento-subtle">
      Press <Kbd>d</Kbd> to toggle dark mode
    </p>
  );

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
                <dt className="text-bento-subtle">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-bento-subtle">Currency</dt>
                <dd className="font-medium uppercase">
                  {user.primary_currency}
                </dd>
              </div>
              {user.api_key_label && (
                <div className="flex justify-between gap-4">
                  <dt className="text-bento-subtle">API key</dt>
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Investable Cash</CardTitle>
            <CardDescription className="text-base">
              How many months of expenses your savings should cover as an
              emergency fund. Checking always keeps 1 month for cash flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={24}
                step={1}
                value={floorMonthsInput}
                onChange={(e) => handleFloorMonthsChange(e.target.value)}
                className="h-11 w-24 text-center font-mono text-base"
              />
              <span className="text-base text-bento-subtle">
                months savings target
              </span>
            </div>
            <p className="mt-3 text-sm text-bento-subtle">
              Savings target:{" "}
              <span className="font-medium text-bento-default">
                {floorMonths}
              </span>{" "}
              {floorMonths === 1 ? "month" : "months"} of expenses.
            </p>
          </CardContent>
        </Card>
        {hint}
      </div>
    );
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
        <CardContent className="pb-0">
          <Alert>
            <AlertDescription>
              Your token is stored only in your browser&apos;s{" "}
              <span className="font-medium text-bento-default">
                localStorage
              </span>
              . There is no backend — all API calls go directly from your
              browser to Lunch Money. Nothing is sent to any server.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Input
                type="password"
                placeholder="API token"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                disabled={loading}
                className="h-11 pr-16 text-base"
              />
              {!input && !loading && (
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-0.5 text-xs font-medium text-bento-subtle transition-colors hover:bg-bento-muted hover:text-bento-default"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text.trim()) setInput(text.trim());
                    } catch {}
                  }}
                >
                  Paste
                </button>
              )}
            </div>
            {error && <p className="text-base text-bento-danger">{error}</p>}
            <Button type="submit" size="lg" disabled={loading || !input.trim()}>
              {loading ? "Connecting…" : "Connect"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {hint}
    </div>
  );
}
