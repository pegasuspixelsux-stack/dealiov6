"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { auth } from "@/lib/firebase/client";
import type { Role } from "@/types";

const STUB_ROLES: { role: Role; label: string }[] = [
  { role: "owner", label: "Sign in as Owner" },
  { role: "manager", label: "Sign in as Manager" },
  { role: "salesperson", label: "Sign in as Salesperson" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function completeLogin(body: Record<string, string>) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Sign in failed.");
      setPending(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleEmailSignIn(event: FormEvent) {
    event.preventDefault();
    if (!auth) {
      setError("Firebase is not configured.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      await completeLogin({ idToken });
    } catch {
      setError("Invalid email or password.");
      setPending(false);
    }
  }

  if (isFirebaseConfigured) {
    return (
      <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Firebase isn&apos;t configured yet. Sign in with a development stub
        account:
      </p>
      {STUB_ROLES.map(({ role, label }) => (
        <Button
          key={role}
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => completeLogin({ stubRole: role })}
        >
          {label}
        </Button>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
