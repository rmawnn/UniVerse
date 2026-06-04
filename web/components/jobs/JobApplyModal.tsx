"use client";

import { useState, useCallback, useRef } from "react";
import { FileText, Upload, X, AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { uploadCV, applyToJob } from "@/lib/api/jobs";
import type { Job } from "@/lib/mock-data-jobs";

interface JobApplyModalProps {
  open: boolean;
  onClose: () => void;
  job: Job;
}

const MAX_CV_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

export function JobApplyModal({ open, onClose, job }: JobApplyModalProps) {
  const [coverNote, setCoverNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CV upload state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── File validation ─────────────────────────────────── */

  const validateFile = useCallback((file: File): string | null => {
    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Only PDF and DOCX files are accepted.`;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "application/octet-stream") {
      return `Invalid file type "${file.type}". Only PDF and DOCX files are accepted.`;
    }
    if (file.size > MAX_CV_SIZE) {
      return `File too large (${formatFileSize(file.size)}). Maximum is 10 MB.`;
    }
    if (file.size === 0) {
      return "File is empty.";
    }
    return null;
  }, []);

  /* ── File selection ──────────────────────────────────── */

  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploadError(null);
      setError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setCvFile(file);
      setUploading(true);
      setUploadProgress(0);

      try {
        const result = await uploadCV(file, (pct) => {
          setUploadProgress(pct);
        });
        setCvUrl(result.url);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to upload CV";
        setUploadError(msg);
        setCvFile(null);
        setCvUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [validateFile],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      // Reset the input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeCv = useCallback(() => {
    setCvFile(null);
    setCvUrl(null);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  /* ── Submit application ──────────────────────────────── */

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await applyToJob(job.id, {
        message: coverNote.trim() || undefined,
        cv_url: cvUrl || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit application";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Reset & close ───────────────────────────────────── */

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setCoverNote("");
      setSubmitted(false);
      setSubmitting(false);
      setError(null);
      setCvFile(null);
      setCvUrl(null);
      setUploadProgress(0);
      setUploading(false);
      setUploadError(null);
    }, 200);
  };

  /* ── Success state ───────────────────────────────────── */

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
            Your application for <b>{job.title}</b> at {job.org} has been
            submitted{cvFile ? " with your CV" : ""}.
          </p>
          <Button variant="ghost" size="sm" onClick={handleClose} className="mt-2">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  /* ── Form state ──────────────────────────────────────── */

  return (
    <Modal open={open} onClose={handleClose} title={`Apply — ${job.title}`}>
      {/* Job summary */}
      <div className="mb-4 flex items-center gap-3 rounded-md border border-line-1 bg-bg-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{job.title}</div>
          <div className="text-[12px] text-fg-3">{job.org} · {job.pay}</div>
        </div>
      </div>

      {/* Cover note */}
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

      {/* ── CV Upload ───────────────────────────────────── */}
      <div className="mt-4">
        <div className="mb-1.5 text-[12px] font-medium text-fg-2">
          Upload CV <span className="text-fg-4">(PDF or DOCX, max 10 MB)</span>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {!cvFile && !uploading ? (
          /* Drop zone */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed border-line-2 bg-bg-3 px-4 py-5 text-center transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/5"
          >
            <Upload className="h-5 w-5 text-fg-3" />
            <span className="text-[13px] text-fg-2">
              Drop your CV here or{" "}
              <span className="font-medium text-brand-purple">browse</span>
            </span>
            <span className="text-[11px] text-fg-4">
              PDF or DOCX · Max 10 MB
            </span>
          </button>
        ) : (
          /* File preview / progress */
          <div className="rounded-md border border-line-1 bg-bg-3 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-purple/10 text-brand-purple">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-fg-1">
                  {cvFile?.name ?? "Uploading..."}
                </div>
                <div className="text-[11px] text-fg-3">
                  {cvFile ? formatFileSize(cvFile.size) : ""}
                  {cvUrl && (
                    <span className="ml-1.5 text-success">Uploaded</span>
                  )}
                </div>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={removeCv}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-bg-4 hover:text-fg-1"
                  aria-label="Remove CV"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {uploading && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-purple" />
              )}
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="mt-2.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-4">
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
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mt-2 flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Notice */}
      <div className="mt-3 rounded-md border border-line-1 bg-bg-3 px-3.5 py-2.5 text-[12.5px] text-fg-3">
        Your UniVerse profile will be shared with the recruiter.
      </div>

      {/* Submit error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || uploading}
        >
          {submitting ? "Submitting..." : "Submit application"}
        </Button>
      </div>
    </Modal>
  );
}
