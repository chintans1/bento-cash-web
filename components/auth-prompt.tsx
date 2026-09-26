"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-token";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthPrompt() {
  const { enterDemo } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.SubmitEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await authClient.signIn.email({ email: email.trim(), password });
    if (result.error) {
      setError(result.error.message || "Couldn't authenticate");
      setLoading(false);
    }
  }

  function changeMode(next: "sign-in" | "sign-up") {
    setMode(next);
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-7 px-6 pt-12 pb-10 text-center sm:pt-20">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-5xl font-bold">Bento Cash</h1>
        <p className="text-bento-subtle">
          Your account keeps Lunch Money connections and preferences together.
        </p>
      </div>

      <div className="grid w-full grid-cols-2 rounded-4xl bg-bento-raised p-1 shadow-[inset_0_0_0_1px_var(--surface-hairline)]">
        <Button
          type="button"
          variant={mode === "sign-in" ? "secondary" : "ghost"}
          className="h-10 rounded-3xl"
          onClick={() => changeMode("sign-in")}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "sign-up" ? "secondary" : "ghost"}
          className="h-10 rounded-3xl"
          onClick={() => changeMode("sign-up")}
        >
          Create account
        </Button>
      </div>

      <form onSubmit={submit} className="flex w-full flex-col gap-3 text-left">
        {mode === "sign-up" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="auth-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
            minLength={8}
            required
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={loading}>
          {loading
            ? mode === "sign-up"
              ? "Creating account…"
              : "Signing in…"
            : mode === "sign-up"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <div className="flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-bento-hairline" />
        <span className="text-xs text-bento-subtle">or</span>
        <div className="h-px flex-1 bg-bento-hairline" />
      </div>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={enterDemo}
      >
        Try Demo
      </Button>
    </div>
  );
}
