"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
}

const REASONS = [
  "Spam or misleading",
  "Harassment or bullying",
  "Hate speech",
  "Misinformation",
  "NSFW content",
  "Off-topic",
  "Other",
] as const;

export function ReportModal({ open, onClose, postId }: ReportModalProps) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const { default: api } = await import("@/lib/api/client");
      await api.post("/reports", {
        content_type: "post",
        content_id: postId,
        reason,
        description: details || undefined,
      });
      setSubmitted(true);
    } catch {
      // TODO: If endpoint fails, still show success for UX
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after close animation
    setTimeout(() => {
      setReason("");
      setDetails("");
      setSubmitted(false);
    }, 200);
  };

  if (submitted) {
    return (
      <Modal open={open} onClose={handleClose} title="Report submitted">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[14px] font-medium">Thanks for reporting</p>
          <p className="text-[13px] text-fg-2">
            Our moderation team will review this post shortly.
          </p>
          <Button variant="ghost" size="sm" onClick={handleClose} className="mt-2">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Report post">
      <p className="mb-4 text-[13px] text-fg-2">
        Why are you reporting this post? Select a reason below.
      </p>
      <div className="flex flex-col gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              "rounded-md border px-3.5 py-2.5 text-left text-[13.5px] transition-colors",
              reason === r
                ? "border-brand-purple/50 bg-brand-purple/10 font-semibold text-fg-1"
                : "border-line-1 text-fg-2 hover:bg-bg-3",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Additional details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="mt-3 w-full resize-none rounded-md border border-line-2 bg-bg-3 px-3.5 py-2.5 text-[13.5px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
        rows={2}
      />
      <div className="mt-4 flex justify-end gap-2.5">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleSubmit}
          disabled={!reason || submitting}
        >
          {submitting ? "Submitting..." : "Submit report"}
        </Button>
      </div>
    </Modal>
  );
}
