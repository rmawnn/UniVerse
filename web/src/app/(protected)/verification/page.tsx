"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import {
  sendVerificationCode,
  confirmVerificationCode,
  submitDocumentVerification,
  getVerificationStatus,
  listUniversities,
} from "@/api/verification";
import type { VerificationStatusResponse } from "@/api/verification";

type Method = "choose" | "email" | "document";
type EmailStep = "input" | "code" | "success";
type DocStep = "input" | "pending";

export default function VerificationPage() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const { data: verStatus } = useQuery<VerificationStatusResponse>({
    queryKey: ["verification-status"],
    queryFn: getVerificationStatus,
  });

  const [method, setMethod] = useState<Method>("choose");

  // Already verified
  if (user?.is_verified_student) {
    return (
      <div>
        <h2 style={styles.heading}>Verification</h2>
        <div style={styles.successCard}>
          <span style={styles.successIcon}>&#10003;</span>
          <p style={styles.successTitle}>Verified Student</p>
          <p style={styles.successHint}>
            Your student status has been verified
            {verStatus?.university_name && (
              <> at <strong>{verStatus.university_name}</strong></>
            )}
            .
          </p>
          <Link href="/profile" style={styles.link}>
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  // Pending document review
  if (verStatus?.verification_status === "pending" && verStatus.verification_method === "document") {
    return (
      <div>
        <h2 style={styles.heading}>Verification</h2>
        <div style={styles.pendingCard}>
          <span style={{ fontSize: 40 }}>📄</span>
          <p style={styles.pendingTitle}>Pending Review</p>
          <p style={styles.pendingHint}>
            Your document has been submitted and is waiting for admin review.
            You&apos;ll be notified once a decision is made.
          </p>
          <Link href="/profile" style={styles.linkSecondary}>
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  // Rejected — show reason and allow resubmission
  const isRejected = verStatus?.verification_status === "rejected";

  return (
    <div>
      <h2 style={styles.heading}>Student Verification</h2>

      {isRejected && (
        <div style={styles.rejectedBox}>
          <p style={styles.rejectedTitle}>Your previous verification was rejected</p>
          {verStatus?.rejection_reason && (
            <p style={styles.rejectedReason}>
              Reason: {verStatus.rejection_reason}
            </p>
          )}
          <p style={styles.rejectedHint}>You can try again below.</p>
        </div>
      )}

      {method === "choose" && (
        <div style={styles.methodGrid}>
          <button
            onClick={() => setMethod("email")}
            style={styles.methodCard}
            className="card-hover"
          >
            <span style={styles.methodIcon}>📧</span>
            <h3 style={styles.methodTitle}>University Email</h3>
            <p style={styles.methodDesc}>
              Verify instantly using your official university email address.
            </p>
          </button>
          <button
            onClick={() => setMethod("document")}
            style={styles.methodCard}
            className="card-hover"
          >
            <span style={styles.methodIcon}>📄</span>
            <h3 style={styles.methodTitle}>Student Document</h3>
            <p style={styles.methodDesc}>
              Upload a student ID, certificate, or transcript for admin review.
            </p>
          </button>
        </div>
      )}

      {method === "email" && (
        <EmailFlow
          onBack={() => setMethod("choose")}
          onSuccess={() => refreshUser()}
        />
      )}

      {method === "document" && (
        <DocumentFlow
          onBack={() => setMethod("choose")}
          onSuccess={() => refreshUser()}
        />
      )}
    </div>
  );
}

/* ── Email Flow ──────────────────────────────────────────────── */

function EmailFlow({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<EmailStep>("input");
  const [email, setEmail] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: () => sendVerificationCode(email.trim()),
    onSuccess: (data) => {
      setError(null);
      setVerificationId(data.verification_id);
      setDebugCode(data.debug_code);
      setStep("code");
    },
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to send verification code");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmVerificationCode(verificationId!, code.trim()),
    onSuccess: async (data) => {
      setError(null);
      setUniversityName(data.university_name);
      setStep("success");
      onSuccess();
    },
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to verify code");
    },
  });

  if (step === "success") {
    return (
      <div style={styles.successCard}>
        <span style={styles.successIcon}>&#10003;</span>
        <p style={styles.successTitle}>Verified!</p>
        <p style={styles.successHint}>
          You are now a verified student at <strong>{universityName}</strong>.
        </p>
        <Link href="/communities" style={styles.link}>
          Browse Communities
        </Link>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div style={styles.card}>
        <p style={styles.description}>
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>

        {debugCode && (
          <div style={styles.debugBox}>
            <span style={styles.debugLabel}>Dev mode — code:</span>
            <span style={styles.debugCode}>{debugCode}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length !== 6 || confirmMutation.isPending) return;
            confirmMutation.mutate();
          }}
        >
          <label style={styles.label}>Verification Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(val);
              setError(null);
            }}
            placeholder="000000"
            maxLength={6}
            style={{ ...styles.input, letterSpacing: 8, fontSize: 24, textAlign: "center" }}
            disabled={confirmMutation.isPending}
          />

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.btnRow}>
            <button
              type="button"
              onClick={() => {
                setStep("input");
                setCode("");
                setDebugCode(null);
                setError(null);
              }}
              style={styles.backBtn}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={code.trim().length !== 6 || confirmMutation.isPending}
              style={{
                ...styles.submitBtn,
                opacity: code.trim().length !== 6 || confirmMutation.isPending ? 0.5 : 1,
              }}
            >
              {confirmMutation.isPending ? "Verifying..." : "Verify"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setCode("");
              setError(null);
              sendMutation.mutate();
            }}
            disabled={sendMutation.isPending}
            style={styles.resendBtn}
          >
            {sendMutation.isPending ? "Sending..." : "Resend code"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <button onClick={onBack} style={styles.backLink}>
        &larr; Choose another method
      </button>

      <p style={styles.description}>
        Enter your official university email to verify your student status.
        We&apos;ll send a 6-digit code to confirm.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim() || sendMutation.isPending) return;
          sendMutation.mutate();
        }}
      >
        <label style={styles.label}>University Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@university.edu"
          style={styles.input}
          disabled={sendMutation.isPending}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          type="submit"
          disabled={!email.trim() || sendMutation.isPending}
          style={{
            ...styles.submitBtn,
            opacity: !email.trim() || sendMutation.isPending ? 0.5 : 1,
          }}
        >
          {sendMutation.isPending ? "Sending..." : "Send Code"}
        </button>
      </form>
    </div>
  );
}

/* ── Document Flow ───────────────────────────────────────────── */

function DocumentFlow({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<DocStep>("input");
  const [universityId, setUniversityId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: universities, isLoading: uniLoading } = useQuery({
    queryKey: ["universities"],
    queryFn: listUniversities,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitDocumentVerification(universityId, file!),
    onSuccess: () => {
      setError(null);
      setStep("pending");
      onSuccess();
    },
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to submit document");
    },
  });

  if (step === "pending") {
    return (
      <div style={styles.pendingCard}>
        <span style={{ fontSize: 40 }}>📄</span>
        <p style={styles.pendingTitle}>Document Submitted</p>
        <p style={styles.pendingHint}>
          Your document has been submitted and is waiting for admin review.
          You&apos;ll be notified once a decision is made.
        </p>
        <Link href="/profile" style={styles.linkSecondary}>
          Back to Profile
        </Link>
      </div>
    );
  }

  const canSubmit = universityId && file && !submitMutation.isPending;

  return (
    <div style={styles.card}>
      <button onClick={onBack} style={styles.backLink}>
        &larr; Choose another method
      </button>

      <p style={styles.description}>
        Upload a student document for manual verification. Accepted:
        student ID card, certificate, transcript, or student portal screenshot.
      </p>

      <div style={styles.formRow}>
        <label style={styles.label}>University</label>
        {uniLoading ? (
          <div className="skeleton" style={{ height: 42, borderRadius: 8 }} />
        ) : (
          <select
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            style={styles.select}
          >
            <option value="">Select your university...</option>
            {(universities ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={styles.formRow}>
        <label style={styles.label}>Document</label>
        <div
          style={{
            ...styles.dropZone,
            borderColor: file ? "#6C63FF" : "#ddd",
            background: file ? "#f5f3ff" : "#fafafa",
          }}
        >
          {file ? (
            <div style={styles.fileInfo}>
              <span style={{ fontSize: 20 }}>📎</span>
              <div>
                <p style={styles.fileName}>{file.name}</p>
                <p style={styles.fileSize}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                style={styles.removeFileBtn}
              >
                ×
              </button>
            </div>
          ) : (
            <label style={styles.dropLabel}>
              <span style={{ fontSize: 28, marginBottom: 4 }}>📤</span>
              <span style={{ fontWeight: 500 }}>Click to upload</span>
              <span style={{ fontSize: 12, color: "#999" }}>
                JPG, PNG, or PDF — max 5MB
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 5 * 1024 * 1024) {
                      setError("File too large. Maximum size is 5MB.");
                      return;
                    }
                    setFile(f);
                    setError(null);
                  }
                }}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        onClick={() => submitMutation.mutate()}
        disabled={!canSubmit}
        style={{
          ...styles.submitBtn,
          opacity: canSubmit ? 1 : 0.5,
        }}
      >
        {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
      </button>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },

  /* Method selection */
  methodGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  methodCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  methodIcon: { fontSize: 32 },
  methodTitle: { fontSize: 16, fontWeight: 600, margin: 0, color: "#111" },
  methodDesc: { fontSize: 13, color: "#666", lineHeight: 1.5, margin: 0 },

  /* Shared card */
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    maxWidth: 480,
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#6C63FF",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 16,
    display: "block",
  },
  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.6,
    margin: "0 0 20px",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  },
  formRow: { marginBottom: 16 },
  error: {
    color: "#c53030",
    fontSize: 13,
    margin: "0 0 12px",
  },
  submitBtn: {
    width: "100%",
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnRow: { display: "flex", gap: 10 },
  backBtn: {
    flex: 1,
    background: "#fff",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "12px 0",
    fontSize: 15,
    cursor: "pointer",
  },
  resendBtn: {
    background: "none",
    border: "none",
    color: "#6C63FF",
    fontSize: 13,
    cursor: "pointer",
    marginTop: 16,
    padding: 0,
  },

  /* Debug */
  debugBox: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  debugLabel: { fontSize: 12, color: "#92400e" },
  debugCode: { fontSize: 18, fontWeight: 700, color: "#92400e", letterSpacing: 4 },

  /* Document upload */
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed" as const,
    borderColor: "#ddd",
    borderRadius: 10,
    overflow: "hidden",
    transition: "border-color 0.15s, background 0.15s",
  },
  dropLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "28px 16px",
    cursor: "pointer",
    fontSize: 14,
    color: "#555",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
  },
  fileName: { fontSize: 14, fontWeight: 500, color: "#111", margin: 0 },
  fileSize: { fontSize: 12, color: "#999", margin: 0 },
  removeFileBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    fontSize: 20,
    color: "#999",
    cursor: "pointer",
    padding: "0 4px",
  },

  /* Success */
  successCard: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#f0fdf4",
    borderRadius: 12,
    border: "1px solid #bbf7d0",
    maxWidth: 480,
  },
  successIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#22c55e",
    color: "#fff",
    fontSize: 28,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#166534",
    margin: "0 0 8px",
  },
  successHint: {
    fontSize: 15,
    color: "#15803d",
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  link: {
    display: "inline-block",
    background: "#22c55e",
    color: "#fff",
    padding: "10px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  },

  /* Pending */
  pendingCard: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fffbeb",
    borderRadius: 12,
    border: "1px solid #fde68a",
    maxWidth: 480,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#92400e",
    margin: "12px 0 8px",
  },
  pendingHint: {
    fontSize: 14,
    color: "#a16207",
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  linkSecondary: {
    display: "inline-block",
    background: "#fff",
    color: "#6C63FF",
    padding: "10px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    border: "1px solid #ddd",
  },

  /* Rejected */
  rejectedBox: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  rejectedTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#c53030",
    margin: "0 0 6px",
  },
  rejectedReason: {
    fontSize: 13,
    color: "#e53e3e",
    margin: "0 0 4px",
    fontStyle: "italic",
  },
  rejectedHint: {
    fontSize: 13,
    color: "#999",
    margin: 0,
  },
};
