"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

interface CreateCommunityModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { default: api } = await import("@/lib/api/client");
      const res = await api.post("/communities", {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ["communities"] });
      handleClose();
      // Navigate to the newly created community
      router.push(`/communities/${res.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create community";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setName("");
      setDescription("");
      setError(null);
    }, 200);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create community">
      {error && (
        <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3.5">
        <Field
          label="Community name"
          type="text"
          placeholder="e.g. cs-229, startup-club"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="block">
          <div className="mb-1.5 text-[12px] font-medium text-fg-2">
            Description
          </div>
          <textarea
            placeholder="What is this community about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none rounded-md border border-line-2 bg-bg-2 px-3.5 py-2.5 text-[14.5px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
            rows={3}
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!name.trim() || submitting}
        >
          {submitting ? "Creating..." : "Create community"}
        </Button>
      </div>
    </Modal>
  );
}
