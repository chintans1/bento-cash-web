"use client";

import { useId, useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConnectAccountForm({
  onConnected,
  buttonLabel = "Connect account",
}: {
  onConnected?: () => void;
  buttonLabel?: string;
}) {
  const { connectWithApiKey } = useAuth();
  const inputId = useId();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(event: React.SubmitEvent) {
    event.preventDefault();
    const token = input.trim();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await connectWithApiKey(token);
      setInput("");
      onConnected?.();
    } catch {
      setError("Couldn't connect — check your token and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleConnect}
      className="flex w-full flex-col gap-3 text-left"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          Lunch Money API token
        </label>
        <p className="text-xs leading-5 text-bento-subtle">
          Find this in Lunch Money under Settings → Developers.
        </p>
      </div>
      <Input
        id={inputId}
        type="password"
        placeholder="Paste your token"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        autoComplete="new-password"
        spellCheck={false}
        disabled={loading}
        className="h-11 font-mono"
      />
      {error && <p className="text-sm text-bento-danger">{error}</p>}
      <Button type="submit" size="lg" disabled={loading || !input.trim()}>
        <KeyRound data-icon="inline-start" />
        {loading ? "Connecting…" : buttonLabel}
      </Button>
      <p className="flex items-center gap-1.5 text-xs leading-5 text-bento-subtle">
        <LockKeyhole className="size-3.5 shrink-0" />
        Encrypted before storage and never shown again.
      </p>
    </form>
  );
}
