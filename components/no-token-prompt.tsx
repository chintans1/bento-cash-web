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
    <div className="mx-auto flex max-w-sm animate-in flex-col items-center gap-8 px-6 pt-32 text-center duration-500 fill-mode-both fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-5xl font-bold tracking-tight">
          Bento Cash
        </h1>
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
          Your token is stored only in your browser&apos;s{" "}
          <span className="font-medium text-bento-default">localStorage</span>.
          There is no backend — all API calls go directly from your browser to
          Lunch Money.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleConnect} className="flex w-full flex-col gap-3">
        <div className="relative">
          <Input
            type="password"
            placeholder="Lunch Money API token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            disabled={loading}
            className="h-10 pr-16"
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
