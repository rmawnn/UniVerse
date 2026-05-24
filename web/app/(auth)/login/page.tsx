"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GraduationCap, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand-purple">
        Welcome back
      </div>
      <h2 className="mt-2.5 text-[36px] font-bold leading-[1.1] tracking-tightest">
        Sign in to UniVerse
      </h2>
      <p className="mt-2 text-[14.5px] text-fg-2">
        Pick up where you left off — your feed is waiting.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <form className="mt-8 flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <Field
          label="University email"
          type="email"
          name="email"
          placeholder="you@stanford.edu"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-fg-3 hover:text-fg-1"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <div className="mt-1 flex items-center justify-between text-[13px]">
          <label className="flex cursor-pointer items-center gap-2 text-fg-2">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <span className="flex h-4 w-4 items-center justify-center rounded border border-line-3 bg-acc-gradient text-white peer-checked:opacity-100">
              ✓
            </span>
            Keep me signed in
          </label>
          <Link href="#" className="font-medium text-brand-blue hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button
          size="lg"
          full
          type="submit"
          className="mt-3"
          disabled={loading || !email || !password}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <div className="mt-4 flex items-center gap-3 text-[12px] text-fg-3">
          <span className="h-px flex-1 bg-line-2" />
          or continue with
          <span className="h-px flex-1 bg-line-2" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="ghost"
            type="button"
            icon={<GraduationCap className="h-4 w-4 text-fg-2" />}
          >
            SSO (Shibboleth)
          </Button>
          <Button variant="ghost" type="button">
            Google
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-[13.5px] text-fg-2">
        New to UniVerse?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-blue hover:underline"
        >
          Create account
        </Link>
      </p>
    </>
  );
}
