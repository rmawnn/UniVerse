"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { resetPasswordApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#$...)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(p) },
];

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordChecks = PASSWORD_RULES.map((r) => ({
    label: r.label,
    met: r.test(password),
  }));
  const allRulesMet = passwordChecks.every((r) => r.met);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = !!token && allRulesMet && passwordsMatch;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
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

  // No token in URL
  if (!token) {
    return (
      <>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <h2 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-tightest">
          Invalid reset link
        </h2>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-fg-2">
          This password reset link is missing a token. Please request a new
          reset link from the forgot password page.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/forgot-password">
            <Button size="lg" full>
              Request new link
            </Button>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 text-[13.5px] font-medium text-brand-blue hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </>
    );
  }

  // Success state
  if (success) {
    return (
      <>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-tightest">
          Password reset!
        </h2>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-fg-2">
          Your password has been updated successfully. You can now sign in with
          your new password.
        </p>
        <div className="mt-8">
          <Link href="/login">
            <Button size="lg" full>
              Sign in
            </Button>
          </Link>
        </div>
      </>
    );
  }

  // Form state
  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand-purple">
        Account recovery
      </div>
      <h2 className="mt-2.5 text-[34px] font-bold leading-[1.1] tracking-tightest">
        Set a new password
      </h2>
      <p className="mt-2 text-[14.5px] text-fg-2">
        Choose a strong password for your account.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <form className="mt-8 flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <div>
          <Field
            label="New password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
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
          {password && (
            <div className="mt-2 rounded-lg border border-line-2 bg-bg-2 px-3.5 py-3">
              <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-fg-3">
                Password requirements
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {passwordChecks.map((rule) => (
                  <div
                    key={rule.label}
                    className="flex items-center gap-2 text-[12.5px]"
                  >
                    {rule.met ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-fg-4" />
                    )}
                    <span className={rule.met ? "text-success" : "text-fg-3"}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Field
          label="Confirm password"
          type={showConfirm ? "text" : "password"}
          name="confirmPassword"
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          icon={<Lock className="h-4 w-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="text-fg-3 hover:text-fg-1"
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />
        {confirmPassword.length > 0 && (
          <div
            className={cn(
              "flex items-center gap-2 text-[12.5px]",
              passwordsMatch ? "text-success" : "text-danger",
            )}
          >
            {passwordsMatch ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {passwordsMatch ? "Passwords match" : "Passwords do not match"}
          </div>
        )}

        <Button
          size="lg"
          full
          type="submit"
          className="mt-2"
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-[13.5px] text-fg-2">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-blue hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-fg-3" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
