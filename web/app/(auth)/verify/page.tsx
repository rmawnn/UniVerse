"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  FileText,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getMe } from "@/lib/api/auth";
import api, { ApiError } from "@/lib/api/client";

/**
 * Verification flow — sequential:
 *   Step 1: Email OTP verification (mandatory)
 *   Step 2: Student document upload (mandatory)
 *   Step 3: Waiting for admin approval / auto-verified / success
 *
 * Users cannot access the platform until at least email is verified.
 */

type Step =
  | "email-input"
  | "email-otp"
  | "doc-upload"
  | "doc-pending"
  | "doc-auto-verified"
  | "doc-suspicious"
  | "doc-rejected"
  | "success";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      }
    >
      <VerifyPageInner />
    </Suspense>
  );
}

interface DocResult {
  status: string;
  confidence: number | null;
  flags: string[];
  message: string;
}

function VerifyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<Step>("email-input");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email verification state
  const emailFromParam = searchParams.get("email");
  const [uniEmail, setUniEmail] = useState(emailFromParam ?? user?.email ?? "");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Navigate to feed after refreshing user state so AuthGuard sees updated fields
  const goToFeed = async () => {
    try {
      const freshUser = await getMe();
      setUser(freshUser);
    } catch {
      // proceed even if refresh fails — store may already be up to date
    }
    router.push("/");
  };

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docResult, setDocResult] = useState<DocResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Determine initial step based on user state
  useEffect(() => {
    if (!user) return;

    if (user.is_verified_student) {
      setStep("success");
    } else if (user.email_verified) {
      // Email already verified — skip to document upload
      setStep("doc-upload");
    }
  }, [user?.is_verified_student, user?.email_verified]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill email when user loads
  useEffect(() => {
    if (user?.email && !uniEmail) {
      setUniEmail(user.email);
    }
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setError(null);
      setStep("email-otp");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to send verification code.");
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
      setError(err instanceof ApiError ? err.message : "Failed to resend code.");
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
      // Refresh user to get email_verified = true
      try {
        const freshUser = await getMe();
        setUser(freshUser);
      } catch {
        if (user) {
          setUser({ ...user, email_verified: true });
        }
      }
      // Move to document upload step
      setStep("doc-upload");
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Document verification ─────────────────────────── */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];
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
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append(
        "university_id",
        user?.university_id ?? "00000000-0000-0000-0000-000000000000",
      );
      formData.append("document", selectedFile);
      const res = await api.post("/verification/document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      const result: DocResult = {
        status: res.data.status,
        confidence: res.data.ai_confidence ?? null,
        flags: res.data.ai_flags ?? [],
        message: res.data.message ?? "",
      };
      setDocResult(result);

      if (result.status === "verified") {
        try {
          const freshUser = await getMe();
          setUser(freshUser);
        } catch {
          if (user) {
            setUser({ ...user, is_verified_student: true });
          }
        }
        setStep("doc-auto-verified");
      } else if (result.status === "suspicious") {
        setStep("doc-suspicious");
      } else if (result.status === "rejected") {
        setStep("doc-rejected");
      } else {
        // under_review / pending
        setStep("doc-pending");
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to upload document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Stepper ───────────────────────────────────────── */

  const stepIndex =
    step === "email-input" || step === "email-otp"
      ? 0
      : step === "doc-upload"
        ? 1
        : 2;

  const STEPS_LABELS = ["Verify email", "Upload document", "Complete"] as const;

  return (
    <>
      {/* Stepper */}
      <div className="mb-7 flex items-center gap-2">
        {STEPS_LABELS.map((s, i) => {
          const isDone = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2",
                  isCurrent
                    ? "text-fg-1"
                    : isDone
                      ? "text-success"
                      : "text-fg-3",
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
                  {isDone ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
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
              {i < STEPS_LABELS.length - 1 && (
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

      {/* ── Step 1a: Email input ────────────────────────── */}
      {step === "email-input" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-brand-purple/40 bg-[linear-gradient(180deg,#2A1F4A,#1A1530)] shadow-[0_16px_40px_rgba(124,82,255,0.25)]">
            <Mail className="h-9 w-9 text-[#C7B0FF]" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Verify your email
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            We&rsquo;ll send a 6-digit code to your university email to confirm
            it belongs to you.
          </p>

          {user?.email && (
            <p className="mt-1 text-[12.5px] text-fg-3">
              Signed in as{" "}
              <span className="font-medium text-fg-2">{user.email}</span>
            </p>
          )}

          <div className="mt-6">
            <label className="block">
              <div className="mb-1.5 text-[12px] font-medium text-fg-2">
                University email address
              </div>
              <input
                type="email"
                value={uniEmail}
                onChange={(e) => setUniEmail(e.target.value)}
                placeholder="you@university.edu.tr"
                className="w-full rounded-md border border-line-2 bg-bg-2 px-3.5 py-3 text-[14.5px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
                autoFocus
              />
            </label>
            <p className="mt-1.5 text-[11.5px] text-fg-3">
              Supports .edu, .edu.tr, .ac.*, stu.*, ogr.*, and registered
              university domains
            </p>
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

          <div className="mt-6 flex gap-3 rounded-md border border-brand-blue/18 bg-brand-blue/[0.07] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
            <p className="text-[12.5px] leading-[1.5] text-fg-2">
              Email verification is required to access UniVerse. After email
              verification, you&rsquo;ll upload a student document for full
              verified status.
            </p>
          </div>
        </>
      )}

      {/* ── Step 1b: Email OTP ──────────────────────────── */}
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
                <>
                  Resend in <b className="text-fg-1">{resendCooldown}s</b>
                </>
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
            icon={
              loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              )
            }
            className="mt-6"
            onClick={handleConfirmCode}
            disabled={loading || otpCode.length !== 6}
          >
            {loading ? "Verifying..." : "Verify & continue"}
          </Button>

          <p className="mt-3 text-center text-[12px] text-fg-4">
            Can&rsquo;t find the email? Check your spam or junk folder.
          </p>

          <p className="mt-2 text-center text-[13px] text-fg-3">
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

      {/* ── Step 2: Document upload ────────────────────── */}
      {step === "doc-upload" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-brand-blue/40 bg-[linear-gradient(180deg,#1A2540,#151A30)] shadow-[0_16px_40px_rgba(79,143,247,0.25)]">
            <Upload className="h-9 w-9 text-brand-blue" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Upload student document
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Upload your student ID card or enrollment document to verify your
            student status. Our AI will review it automatically.
          </p>

          <div className="mt-2 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-[12px] text-success">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Email verified successfully</span>
          </div>

          <div className="mt-5">
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
                    {(selectedFile.size / 1024).toFixed(0)} KB ·{" "}
                    {selectedFile.type.split("/")[1]?.toUpperCase()}
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

          {/* Upload progress */}
          {loading && uploadProgress > 0 && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-3">
                <div
                  className="h-full rounded-full bg-acc-gradient transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="mt-1 text-right text-[10.5px] text-fg-4">
                {uploadProgress}%
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-3 rounded-md border border-brand-purple/18 bg-brand-purple/[0.05] p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
            <p className="text-[12px] leading-[1.5] text-fg-3">
              Our AI reads your document using OCR and validates it
              automatically. High-confidence submissions are approved instantly.
              Your documents stay private.
            </p>
          </div>

          <Button
            size="lg"
            full
            className="mt-5"
            onClick={handleDocSubmit}
            disabled={loading || !selectedFile}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing document...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit for verification
              </>
            )}
          </Button>
        </>
      )}

      {/* ── Step 3a: Document auto-verified by AI ──────── */}
      {step === "doc-auto-verified" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-success/40 bg-success/10 shadow-[0_16px_40px_rgba(52,168,83,0.20)]">
            <Check className="h-9 w-9 text-success" strokeWidth={2} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Approved!
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Our AI verified your document automatically. You now have full
            access to UniVerse with a verified badge.
          </p>

          {docResult && docResult.confidence !== null && (
            <ConfidenceMeter confidence={docResult.confidence} />
          )}

          <div className="mt-5 flex gap-3 rounded-md border border-success/18 bg-success/[0.07] p-3.5">
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
            onClick={goToFeed}
          >
            Go to feed
          </Button>
        </>
      )}

      {/* ── Step 3b: Document pending admin review ─────── */}
      {step === "doc-pending" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-warn/40 bg-[linear-gradient(180deg,#2A2520,#1A1520)] shadow-[0_16px_40px_rgba(255,181,71,0.15)]">
            <FileText className="h-9 w-9 text-warn" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Pending review
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Your document has been submitted. An admin will review it shortly
            — this usually takes a few hours.
          </p>

          {docResult && docResult.confidence !== null && (
            <ConfidenceMeter confidence={docResult.confidence} />
          )}

          <div className="mt-5 flex gap-3 rounded-md border border-warn/18 bg-warn/[0.07] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <p className="text-[12.5px] leading-[1.5] text-fg-2">
              You&rsquo;ll receive a notification once your document is
              reviewed. You can continue browsing UniVerse in the meantime.
            </p>
          </div>

          <Button
            size="lg"
            full
            className="mt-6"
            onClick={goToFeed}
          >
            Go to feed
          </Button>
        </>
      )}

      {/* ── Step 3c: Document flagged as suspicious ────── */}
      {step === "doc-suspicious" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-danger/40 bg-danger/10 shadow-[0_16px_40px_rgba(255,90,106,0.15)]">
            <ShieldAlert className="h-9 w-9 text-danger" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Additional review needed
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            We couldn&rsquo;t automatically verify your document. It has been
            sent to our admin team for manual review.
          </p>

          {docResult && (
            <>
              {docResult.confidence !== null && (
                <ConfidenceMeter confidence={docResult.confidence} />
              )}
              {docResult.flags.length > 0 && (
                <div className="mt-4 rounded-md border border-danger/18 bg-danger/[0.05] p-3.5">
                  <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-danger">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Issues detected
                  </div>
                  <ul className="flex flex-col gap-1">
                    {docResult.flags.map((flag) => (
                      <li key={flag} className="text-[12px] text-fg-3">
                        · {flagLabel(flag)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                setStep("doc-upload");
                setSelectedFile(null);
                setDocResult(null);
                setError(null);
              }}
            >
              Try again
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="flex-1"
              onClick={goToFeed}
            >
              Continue browsing
            </Button>
          </div>
        </>
      )}

      {/* ── Step 3d: Document rejected ─────────────────── */}
      {step === "doc-rejected" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-danger/40 bg-danger/10 shadow-[0_16px_40px_rgba(255,90,106,0.15)]">
            <ShieldAlert className="h-9 w-9 text-danger" strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            Verification rejected
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Your document could not be verified. Please upload a clearer photo
            of your student ID or enrollment certificate.
          </p>

          <Button
            size="lg"
            full
            className="mt-6"
            onClick={() => {
              setStep("doc-upload");
              setSelectedFile(null);
              setDocResult(null);
              setError(null);
            }}
          >
            Upload a new document
          </Button>
        </>
      )}

      {/* ── Success ────────────────────────────────────── */}
      {step === "success" && (
        <>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-success/40 bg-success/10 shadow-[0_16px_40px_rgba(52,168,83,0.20)]">
            <Check className="h-9 w-9 text-success" strokeWidth={2} />
          </div>

          <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
            You&rsquo;re verified!
          </h2>
          <p className="mt-2 text-[14.5px] text-fg-2">
            Your student status has been confirmed. You have full access to
            UniVerse with a verified badge.
          </p>

          <div className="mt-6 flex gap-3 rounded-md border border-success/18 bg-success/[0.07] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p className="text-[12.5px] leading-[1.5] text-fg-2">
              Your verified badge is visible on your profile and next to your
              posts across all communities.
            </p>
          </div>

          <Button
            size="lg"
            full
            className="mt-6"
            onClick={goToFeed}
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

/* ── Shared components ──────────────────────────────── */

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 85
      ? "bg-success"
      : pct >= 50
        ? "bg-warn"
        : "bg-danger";
  const label =
    pct >= 85
      ? "High confidence"
      : pct >= 50
        ? "Moderate confidence"
        : "Low confidence";

  return (
    <div className="mt-5 rounded-md border border-line-1 bg-bg-2 p-3.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-fg-2">AI confidence</span>
        <span className="font-semibold text-fg-1">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-bg-3">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 text-[11px] text-fg-3">{label}</div>
    </div>
  );
}

function flagLabel(flag: string): string {
  const labels: Record<string, string> = {
    name_mismatch: "Name on document doesn't match your profile name",
    university_mismatch: "University on document doesn't match selected university",
    no_student_number: "No student number detected on the document",
    possibly_edited: "Document may have been digitally edited",
    blurry_upload: "Document is blurry or unreadable",
    expired_card: "The student ID card appears to be expired",
    duplicate_file: "This file has been submitted before",
    too_small_file: "File is suspiciously small for a document",
    too_large_text: "Document has more text than expected for a student ID",
    validation_error: "An error occurred during document analysis",
  };
  return labels[flag] ?? flag.replace(/_/g, " ");
}
