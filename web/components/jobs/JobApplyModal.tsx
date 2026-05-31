"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Job } from "@/lib/mock-data-jobs";

interface JobApplyModalProps {
  open: boolean;
  onClose: () => void;
  job: Job;
}

export function JobApplyModal({ open, onClose, job }: JobApplyModalProps) {
  const [coverNote, setCoverNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // TODO: Call POST /jobs/{jobId}/apply when backend is wired
      const { default: api } = await import("@/lib/api/client");
      await api.post(`/jobs/${job.id}/apply`, {
        cover_note: coverNote.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      // Show success anyway for demo UX
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setCoverNote("");
      setSubmitted(false);
    }, 200);
  };

  if (submitted) {
    return (
      <Modal open={open} onClose={handleClose} title="Application submitted">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[14px] font-medium">Application sent!</p>
          <p className="text-[13px] text-fg-2">
            Your application for <b>{job.title}</b> at {job.org} has been submitted.
          </p>
          <Button variant="ghost" size="sm" onClick={handleClose} className="mt-2">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Apply — ${job.title}`}>
      <div className="mb-4 flex items-center gap-3 rounded-md border border-line-1 bg-bg-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{job.title}</div>
          <div className="text-[12px] text-fg-3">{job.org} · {job.pay}</div>
        </div>
      </div>

      <label className="block">
        <div className="mb-1.5 text-[12px] font-medium text-fg-2">
          Cover note <span className="text-fg-4">(optional)</span>
        </div>
        <textarea
          placeholder="Why are you a great fit for this role?"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          className="w-full resize-none rounded-md border border-line-2 bg-bg-3 px-3.5 py-2.5 text-[14px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
          rows={4}
        />
      </label>

      <div className="mt-2 rounded-md border border-line-1 bg-bg-3 px-3.5 py-2.5 text-[12.5px] text-fg-3">
        Your UniVerse profile will be shared with the recruiter.
      </div>

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit application"}
        </Button>
      </div>
    </Modal>
  );
}
