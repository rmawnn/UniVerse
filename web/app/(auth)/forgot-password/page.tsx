"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { forgotPasswordApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPasswordApi(trimmed);
      setSubmitted(true);
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

  // Success state
  if (submitted) {
    return (
      <>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-tightest">
          Check your email
        </h2>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-fg-2">
          If an account exists for <strong className="text-fg-1">{email}</strong>,
          we&rsquo;ve sent a password reset link. It expires in 30 minutes.
        </p>
        <p className="mt-4 text-[13px] text-fg-3">
          Don&rsquo;t see it? Check your spam folder, or try again.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            size="lg"
            full
            variant="ghost"
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
          >
            Try a different email
          </Button>
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

  // Form state
  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand-purple">
        Account recovery
      </div>
      <h2 className="mt-2.5 text-[34px] font-bold leading-[1.1] tracking-tightest">
        Forgot your password?
      </h2>
      <p className="mt-2 text-[14.5px] text-fg-2">
        Enter the email you used to register and we&rsquo;ll send you a reset
        link.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <form className="mt-8 flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <Field
          label="Email address"
          type="email"
          name="email"
          placeholder="you@university.edu"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button
          size="lg"
          full
          type="submit"
          className="mt-2"
          disabled={loading || !email.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send reset link"
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
