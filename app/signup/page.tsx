"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  getFriendlyAuthError,
  setAuthCookie,
  signInWithGooglePopup,
  signUpWithEmailPassword,
} from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signUpWithEmailPassword(email.trim(), password);
      setAuthCookie();
      router.replace("/chat");
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsSubmitting(true);

    try {
      await signInWithGooglePopup();
      setAuthCookie();
      router.replace("/chat");
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:opacity-80">
            Nexio AI
          </Link>
          <Link href="/" className="text-sm text-zinc-400 transition hover:text-white">
            Back home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-[0_0_60px_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-8">
            <div className="text-center">
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-zinc-500">
                Create account
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Join Nexio AI</h1>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Create an account to unlock your personal workspace.
              </p>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm text-zinc-400">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm text-zinc-400">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm text-zinc-400">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm text-zinc-400">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  required
                  minLength={6}
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Please wait…" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="mt-6 flex w-full items-center justify-center rounded-full border border-white/15 px-4 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Please wait…" : "Continue with Google"}
            </button>

            <p className="mt-6 text-center text-sm text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-white transition hover:text-zinc-200">
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
