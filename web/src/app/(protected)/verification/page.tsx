"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import {
  sendVerificationCode,
  confirmVerificationCode,
} from "@/api/verification";

type Step = "email" | "code" | "success";

export default function VerificationPage() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: () => sendVerificationCode(email.trim()),
    onSuccess: (data) => {
      setError(null);
      setDebugCode(data.debug_code);
      setStep("code");
    },
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to send verification code");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmVerificationCode(email.trim(), code.trim()),
    onSuccess: async (data) => {
      setError(null);
      setUniversityName(data.university_name);
      setStep("success");
      await refreshUser();
    },
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to verify code");
    },
  });

  if (user?.is_verified_student) {
    return (
      <div>
        <h2 style={styles.heading}>Verification</h2>
        <div style={styles.successCard}>
          <span style={styles.successIcon}>&#10003;</span>
          <p style={styles.successTitle}>Already Verified</p>
          <p style={styles.successHint}>
            Your student status has been verified.
          </p>
          <Link href="/profile" style={styles.link}>
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.heading}>Student Verification</h2>

      {step === "email" && (
        <div style={styles.card}>
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
      )}

      {step === "code" && (
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
                  setStep("email");
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
                  opacity:
                    code.trim().length !== 6 || confirmMutation.isPending
                      ? 0.5
                      : 1,
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
      )}

      {step === "success" && (
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
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    maxWidth: 480,
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
  btnRow: {
    display: "flex",
    gap: 10,
  },
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
  debugLabel: {
    fontSize: 12,
    color: "#92400e",
  },
  debugCode: {
    fontSize: 18,
    fontWeight: 700,
    color: "#92400e",
    letterSpacing: 4,
  },
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
};
