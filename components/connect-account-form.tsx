"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConnectAccountForm({
  onConnected,
  buttonLabel = "Connect account",
}: {
  onConnected?: () => void;
  buttonLabel?: string;
}) {
  const { connectAccount } = useAuth();
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
      await connectAccount(token);
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
      <label htmlFor="api-token" className="text-sm font-medium">
        Lunch Money API token
      </label>
      <Input
        id="api-token"
        type="password"
        placeholder="Lunch Money API token"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        autoComplete="off"
        disabled={loading}
        className="h-10"
      />
      {error && <p className="text-sm text-bento-danger">{error}</p>}
      <Button
        type="submit"
        variant="secondary"
        disabled={loading || !input.trim()}
      >
        {loading ? "Connecting…" : buttonLabel}
      </Button>
    </form>
  );
}
