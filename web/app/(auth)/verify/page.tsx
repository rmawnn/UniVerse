"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  FileText,
  Loader2,
  Mail,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getMe } from "@/lib/api/auth";
import api from "@/lib/api/client";

type VerifyMethod = "email" | "document" | null;
type Step = "choose" | "email-input" | "email-otp" | "doc-upload" | "doc-pending" | "success";

/** Wrapper to satisfy Next.js Suspense requirement for useSearchParams. */
export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    }>
      <VerifyPageInner />
    </Suspense>
  );
}

function VerifyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<VerifyMethod>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email verification state — prefill from query param or auth store email
  const emailFromParam = searchParams.get("email");
  const [uniEmail, setUniEmail] = useState(
    emailFromParam ?? user?.email ?? "",
  );
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill email when user loads (if not already set)
  useEffect(() => {
    if (user?.email && !uniEmail) {
      setUniEmail(user.email);
    }
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if already verified
  useEffect(() => {
    if (user?.is_verified_student) {
      setStep("success");
    }
  }, [user?.is_verified_student]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  /* ── Email verification ────────────────────────────── */

  const handleSendCode = async () => {
    setError(null);
    if (!uniEmail.trim()) {
      setError("Please enter your university email.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/verification/email/send", {
        university_email: uniEmail.trim(),
      });
      setVerificationId(res.data.verification_id);
      setResendCooldown(60);
      setStep("email-otp");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to send verification code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/verification/email/send", {
        university_email: uniEmail.trim(),
      });
      setVerificationId(res.data.verification_id);
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to resend code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    setError(null);
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    if (!verificationId) {
      setError("Verification session expired. Please resend the code.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/verification/email/confirm", {
        verification_id: verificationId,
        code: otpCode,
      });
      // Refresh user from backend to get updated verification status
      try {
        const freshUser = await getMe();
        setUser(freshUser);
      } catch {
        // Fallback: patch locally if refresh fails
        if (user) {
          setUser({ ...user, is_verified_student: true });
        }
      }
      setStep("success");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Invalid or expired code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Document verification ─────────────────────────── */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a PDF, JPG, or PNG file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDocSubmit = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      // Use a placeholder university_id — backend will map from user context
      formData.append("university_id", user?.university_id ?? "00000000-0000-0000-0000-000000000000");
      formData.append("document", selectedFile);
      await api.post("/verification/document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStep("doc-pending");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to upload document. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Stepper ───────────────────────────────────────── */

  const stepIndex =
    step === "choose"
      ? 0
      : step === "success"
        ? 2
        : 1;

  const STEPS = ["Choose method", "Verify", "Complete"] as const;

  return (
    <>
      {/* Stepper */}
      <div className="mb-7 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isDone = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2",
                  isCurrent ? "text-fg-1" : isDone ? "text-success" : "text-fg-3",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                    isCurrent && "bg-acc-gradient text-white",
                    isDone && "bg-success/20 text-success",
                    !isCurrent && !isDone && "bg-bg-3 text-fg-3",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[12px]",
                    isCurrent ? "font-semibold" : "font-medium",
                  )}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    isDone ? "bg-success" : "bg-line-2",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </div>
      )}

      {/* ── Step: Choose method ──────────────────────── */}
      {step === "choose" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-brand-purple/40 bg-[linear-gradient(180deg,#2A1F4A,#1A1530)] shadow-[0_16px_40px_rgba(124,82,255,0.25)]">
            <ShieldCheck className="h-9 w-9 text-[#C7B0FF]" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Verify your identity
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Choose how you&rsquo;d like to verify your student status.
          </p>

          {user?.email && (
            <p className="mt-1 text-[12.5px] text-fg-3">
              Signed in as <span className="font-medium text-fg-2">{user.email}</span>
            </p>
          )}

          <div className="mt-7 flex flex-col gap-3">
            <button
              onClick={() => {
                setMethod("email");
                setStep("email-input");
                setError(null);
              }}
              className="flex items-center gap-4 rounded-lg border border-line-2 bg-bg-2 p-4 text-left transition-colors hover:border-brand-purple/40 hover:bg-bg-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-brand-purple/15 text-brand-purple">
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold">University email</div>
                <div className="mt-0.5 text-[12.5px] text-fg-3">
                  Verify with a .edu or university email address
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setMethod("document");
                setStep("doc-upload");
                setError(null);
              }}
              className="flex items-center gap-4 rounded-lg border border-line-2 bg-bg-2 p-4 text-left transition-colors hover:border-brand-purple/40 hover:bg-bg-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-brand-blue/15 text-brand-blue">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold">Student document</div>
                <div className="mt-0.5 text-[12.5px] text-fg-3">
                  Upload your student ID card or enrollment document
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 flex gap-3 rounded-md border border-brand-blue/18 bg-brand-blue/[0.07] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
            <p className="text-[12.5px] leading-[1.5] text-fg-2">
              Only verified students can post on UniVerse. Your documents stay
              private and are never visible to other students.
            </p>
          </div>
        </>
      )}

      {/* ── Step: Email input ────────────────────────── */}
      {step === "email-input" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-brand-purple/40 bg-[linear-gradient(180deg,#2A1F4A,#1A1530)] shadow-[0_16px_40px_rgba(124,82,255,0.25)]">
            <Mail className="h-9 w-9 text-[#C7B0FF]" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            University email
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Enter your university email to receive a verification code.
          </p>

          <div className="mt-6">
            <label className="block">
              <div className="mb-1.5 text-[12px] font-medium text-fg-2">
                University email address
              </div>
              <input
                type="email"
                value={uniEmail}
                onChange={(e) => setUniEmail(e.target.value)}
                placeholder="you@stanford.edu"
                className="w-full rounded-md border border-line-2 bg-bg-2 px-3.5 py-3 text-[14.5px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
                autoFocus
              />
            </label>
          </div>

          <Button
            size="lg"
            full
            className="mt-6"
            onClick={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {loading ? "Sending..." : "Send verification code"}
          </Button>

          <button
            onClick={() => {
              setStep("choose");
              setError(null);
            }}
            className="mt-4 text-center text-[13px] text-fg-3 hover:text-fg-1"
          >
            ← Back to method selection
          </button>
        </>
      )}

      {/* ── Step: Email OTP ──────────────────────────── */}
      {step === "email-otp" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-brand-purple/40 bg-[linear-gradient(180deg,#2A1F4A,#1A1530)] shadow-[0_16px_40px_rgba(124,82,255,0.25)]">
            <Mail className="h-9 w-9 text-[#C7B0FF]" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Check your inbox
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-fg-1">{uniEmail}</span>.
          </p>

          <div className="mt-7">
            <OtpInput onChange={(val) => setOtpCode(val)} />
          </div>

          <div className="mt-4 flex items-center justify-between text-[13px] text-fg-3">
            <span>
              {resendCooldown > 0 ? (
                <>Resend in <b className="text-fg-1">{resendCooldown}s</b></>
              ) : (
                "Didn't receive the code?"
              )}
            </span>
            <button
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || loading}
              className="font-semibold text-brand-blue hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>

          <Button
            size="lg"
            full
            icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
            className="mt-6"
            onClick={handleConfirmCode}
            disabled={loading || otpCode.length !== 6}
          >
            {loading ? "Verifying..." : "Verify & continue"}
          </Button>

          <p className="mt-4 text-center text-[13px] text-fg-3">
            Wrong email?{" "}
            <button
              onClick={() => {
                setStep("email-input");
                setOtpCode("");
                setError(null);
              }}
              className="font-semibold text-brand-blue hover:underline"
            >
              Change email
            </button>
          </p>
        </>
      )}

      {/* ── Step: Document upload ────────────────────── */}
      {step === "doc-upload" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-brand-blue/40 bg-[linear-gradient(180deg,#1A2540,#151A30)] shadow-[0_16px_40px_rgba(79,143,247,0.25)]">
            <Upload className="h-9 w-9 text-brand-blue" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Upload document
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Upload your student ID card or enrollment document for manual review.
          </p>

          <div className="mt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-success/28 bg-success/[0.06] p-4">
                <FileText className="h-8 w-8 text-success" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11.5px] text-fg-3">
                    {(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type.split("/")[1]?.toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-[12px] font-medium text-fg-3 hover:text-fg-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-line-2 bg-bg-2/50 py-10 text-center transition-colors hover:border-brand-blue/40 hover:bg-bg-3"
              >
                <Upload className="h-8 w-8 text-fg-3" />
                <div>
                  <div className="text-[14px] font-medium">
                    Click to upload your document
                  </div>
                  <div className="mt-1 text-[12px] text-fg-3">
                    PDF, JPG, or PNG · Max 10 MB
                  </div>
                </div>
              </button>
            )}
          </div>

          <Button
            size="lg"
            full
            className="mt-6"
            onClick={handleDocSubmit}
            disabled={loading || !selectedFile}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {loading ? "Uploading..." : "Submit for review"}
          </Button>

          <button
            onClick={() => {
              setStep("choose");
              setSelectedFile(null);
              setError(null);
            }}
            className="mt-4 text-center text-[13px] text-fg-3 hover:text-fg-1"
          >
            ← Back to method selection
          </button>
        </>
      )}

      {/* ── Step: Document pending ───────────────────── */}
      {step === "doc-pending" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-warn/40 bg-[linear-gradient(180deg,#2A2520,#1A1520)] shadow-[0_16px_40px_rgba(255,181,71,0.15)]">
            <FileText className="h-9 w-9 text-warn" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Under review
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Your document has been submitted. An admin will review it shortly — this
            usually takes a few hours.
          </p>

          <div className="mt-6 flex gap-3 rounded-md border border-warn/18 bg-warn/[0.07] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <p className="text-[12.5px] leading-[1.5] text-fg-2">
              You&rsquo;ll receive a notification once your document is reviewed.
              You can continue using UniVerse in the meantime.
            </p>
          </div>

          <Button
            size="lg"
            full
            className="mt-6"
            onClick={() => router.push("/")}
          >
            Go to feed
          </Button>
        </>
      )}

      {/* ── Step: Success ────────────────────────────── */}
      {step === "success" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-success/40 bg-success/10 shadow-[0_16px_40px_rgba(52,168,83,0.20)]">
            <Check className="h-9 w-9 text-success" strokeWidth={2} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            You&rsquo;re verified!
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Your student status has been confirmed. You now have full access to
            UniVerse.
          </p>

          <div className="mt-6 flex gap-3 rounded-md border border-success/18 bg-success/[0.07] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p className="text-[12.5px] leading-[1.5] text-fg-2">
              Your verified badge will appear on your profile and next to your
              posts across all communities.
            </p>
          </div>

          <Button
            size="lg"
            full
            className="mt-6"
            onClick={() => router.push("/")}
          >
            Go to feed
          </Button>

          <Link
            href="/settings"
            className="mt-3 block text-center text-[13px] font-medium text-brand-blue hover:underline"
          >
            Go to settings
          </Link>
        </>
      )}
    </>
  );
}
