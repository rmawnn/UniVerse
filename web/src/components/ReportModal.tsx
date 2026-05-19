"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createReport } from "@/api/reports";
import type { ReportCreateRequest } from "@/api/reports";

interface Props {
  targetType: ReportCreateRequest["target_type"];
  targetId: string;
  onClose: () => void;
}

const REASON_OPTIONS = [
  "Spam or misleading",
  "Harassment or bullying",
  "Inappropriate content",
  "Hate speech",
  "Violence or threats",
  "Other",
];

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: ReportCreateRequest) => createReport(data),
    onSuccess: () => setSuccess(true),
  });

  const handleSubmit = () => {
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) return;
    mutation.mutate({
      target_type: targetType,
      target_id: targetId,
      reason: finalReason,
    });
  };

  const typeLabel =
    targetType === "post"
      ? "post"
      : targetType === "comment"
      ? "comment"
      : targetType === "community"
      ? "community"
      : targetType === "job"
      ? "job posting"
      : "user";

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {success ? (
          <>
            <div style={s.successIcon}>&#10003;</div>
            <h3 style={s.title}>Report Submitted</h3>
            <p style={s.hint}>
              Thank you for helping keep UniVerse safe. We&apos;ll review this
              report shortly.
            </p>
            <button onClick={onClose} style={s.doneBtn}>
              Done
            </button>
          </>
        ) : (
          <>
            <h3 style={s.title}>Report {typeLabel}</h3>
            <p style={s.hint}>
              Why are you reporting this {typeLabel}?
            </p>

            <div style={s.options}>
              {REASON_OPTIONS.map((opt) => (
                <label key={opt} style={s.optionLabel}>
                  <input
                    type="radio"
                    name="report-reason"
                    value={opt}
                    checked={reason === opt}
                    onChange={() => setReason(opt)}
                    style={s.radio}
                  />
                  <span style={s.optionText}>{opt}</span>
                </label>
              ))}
            </div>

            {reason === "Other" && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the issue..."
                style={s.textarea}
                maxLength={500}
                rows={3}
              />
            )}

            {mutation.isError && (
              <p style={s.error}>
                {(mutation.error as { message?: string })?.message ??
                  "Failed to submit report"}
              </p>
            )}

            <div style={s.actions}>
              <button onClick={onClose} style={s.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  mutation.isPending ||
                  !reason ||
                  (reason === "Other" && !customReason.trim())
                }
                style={{
                  ...s.submitBtn,
                  opacity:
                    mutation.isPending ||
                    !reason ||
                    (reason === "Other" && !customReason.trim())
                      ? 0.5
                      : 1,
                }}
              >
                {mutation.isPending ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 14,
    padding: 24,
    maxWidth: 420,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    margin: "0 0 6px",
    color: "#111",
  },
  hint: {
    fontSize: 14,
    color: "#666",
    margin: "0 0 16px",
    lineHeight: 1.5,
  },
  options: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  optionLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #eee",
    fontSize: 14,
    transition: "background 0.1s",
  },
  radio: {
    accentColor: "#6C63FF",
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  optionText: {
    color: "#333",
  },
  textarea: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    marginBottom: 12,
  },
  error: {
    background: "#fff5f5",
    color: "#c53030",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    background: "#f3f4f6",
    color: "#666",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  submitBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  successIcon: {
    fontSize: 36,
    color: "#059669",
    textAlign: "center",
    marginBottom: 8,
  },
  doneBtn: {
    width: "100%",
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
  },
};
