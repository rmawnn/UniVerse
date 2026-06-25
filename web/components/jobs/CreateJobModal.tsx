"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Building2, MapPin } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

const JOB_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "part-time", label: "Part-time" },
  { value: "full-time", label: "Full-time" },
  { value: "freelance", label: "Freelance" },
] as const;

interface CreateJobModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateJobModal({ open, onClose }: CreateJobModalProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("internship");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { default: api } = await import("@/lib/api/client");
      const res = await api.post("/jobs", {
        title: title.trim(),
        description: description.trim(),
        company_name: companyName.trim() || null,
        location: location.trim() || null,
        job_type: jobType,
      });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      handleClose();
      router.push(`/jobs/${res.data.id}`);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Failed to post job");
      } else {
        setError("Failed to post job");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setTitle("");
      setDescription("");
      setCompanyName("");
      setLocation("");
      setJobType("internship");
      setError(null);
    }, 200);
  };

  const charCount = description.length;

  return (
    <Modal open={open} onClose={handleClose} title="Post a job" className="max-w-[540px]">
      {error && (
        <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3.5">
        <Field
          label="Job title"
          type="text"
          placeholder="e.g. Frontend Developer Intern"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          icon={<Briefcase className="h-4 w-4" />}
          required
        />

        <Field
          label="Company name"
          type="text"
          placeholder="e.g. Acme Corp (optional)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={200}
          icon={<Building2 className="h-4 w-4" />}
        />

        <Field
          label="Location"
          type="text"
          placeholder="e.g. Istanbul, Remote (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={200}
          icon={<MapPin className="h-4 w-4" />}
        />

        <div>
          <div className="mb-1.5 text-[12px] font-medium text-fg-2">Job type</div>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map((jt) => (
              <button
                key={jt.value}
                type="button"
                onClick={() => setJobType(jt.value)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  jobType === jt.value
                    ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
                    : "border-line-2 text-fg-3 hover:border-fg-4 hover:text-fg-2"
                }`}
              >
                {jt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-fg-2">Description</span>
            <span className={`text-[11px] ${charCount > 4500 ? "text-danger" : "text-fg-4"}`}>
              {charCount}/5000
            </span>
          </div>
          <textarea
            placeholder="Describe the role, responsibilities, requirements, and how to apply..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            className="w-full resize-none rounded-md border border-line-2 bg-bg-2 px-3.5 py-2.5 text-[14.5px] leading-[1.6] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
            rows={6}
            required
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[11px] text-fg-4">
          Visible to all verified students
        </p>
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || submitting}
          >
            {submitting ? "Posting..." : "Post job"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
