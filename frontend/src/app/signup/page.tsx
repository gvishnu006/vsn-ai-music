"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { AuthShell, AuthError } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { useAuth } from "@/lib/auth-context";

export default function SignUpPage() {
  const router = useRouter();
  const { signUpEmail, signInGoogle, demoMode } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy("email");
    try {
      await signUpEmail(email, password, name);
      router.push("/studio");
    } catch (err) {
      setError((err as Error).message ?? "Sign-up failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInGoogle();
      router.push("/studio");
    } catch (err) {
      setError((err as Error).message ?? "Google sign-in failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthShell
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">Create your studio</h1>
        <p className="mt-1.5 text-sm text-muted">
          Free forever. 10 AI generations every single day.
        </p>

        <div className="mt-8 space-y-4">
          {demoMode ? (
            <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-3 text-xs text-foreground">
              Firebase isn&apos;t configured yet — this form saves a <b>local demo account</b>. Add your
              Firebase keys to enable real sign-ups.
            </div>
          ) : null}

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleGoogle}
            loading={busy === "google"}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a7.23 7.23 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Display name" htmlFor="name">
              <Input
                id="name"
                required
                autoComplete="name"
                placeholder="Your artist name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm password" htmlFor="confirm">
              <Input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <AuthError message={error} />
            <Button type="submit" size="lg" className="w-full" loading={busy === "email"}>
              <UserPlus className="h-4 w-4" /> Create account
            </Button>
          </form>
        </div>
      </motion.div>
    </AuthShell>
  );
}
