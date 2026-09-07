"use client";

import { useState } from "react";
import { useToken } from "@/hooks/use-token";
import { createRealClient } from "@/lib/lunchmoney/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Kbd } from "./ui/kbd";

export function NoTokenPrompt() {
  const { setToken, enterDemo } = useToken();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.SubmitEvent) {
    e.preventDefault();
    const token = input.trim();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await createRealClient(token).getMe();
      setToken(token);
    } catch {
      setError("Couldn't connect — check your token and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-8 px-6 pt-12 pb-10 text-center sm:pt-20">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-5xl font-bold">Bento Cash</h1>
        <p className="text-bento-subtle">
          Richer analytics for your Lunch Money finances.
        </p>
      </div>

      <Button size="lg" className="w-full" onClick={enterDemo}>
        Try Demo
      </Button>

      <div className="flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-bento-hairline" />
        <span className="text-xs text-bento-subtle">
          or connect your account
        </span>
        <div className="h-px flex-1 bg-bento-hairline" />
      </div>

      <Alert className="text-left">
        <AlertDescription>
          Your API token stays in this browser. Bento Cash connects directly to
          Lunch Money to read your finances and save your edits.
        </AlertDescription>
      </Alert>

      <form
        onSubmit={handleConnect}
        className="flex w-full flex-col gap-3 text-left"
      >
        <label htmlFor="api-token" className="text-sm font-medium">
          Lunch Money API token
        </label>
        <Input
          id="api-token"
          type="password"
          placeholder="Lunch Money API token"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          disabled={loading}
          className="h-10"
        />
        {error && (
          <p className="text-left text-sm text-bento-danger">{error}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          disabled={loading || !input.trim()}
        >
          {loading ? "Connecting…" : "Connect"}
        </Button>
      </form>

      <p className="font-mono text-sm text-bento-subtle">
        Press <Kbd>d</Kbd> to toggle dark mode
      </p>
    </div>
  );
}
