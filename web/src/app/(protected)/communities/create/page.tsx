"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCommunity } from "@/api/communities";

export default function CreateCommunityPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nameError =
    name.length > 0 && name.trim().length < 2
      ? "Name must be at least 2 characters"
      : null;

  const mutation = useMutation({
    mutationFn: () =>
      createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      router.push(`/communities/${data.id}`);
    },
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to create community");
    },
  });

  const canSubmit =
    name.trim().length >= 2 && !nameError && !mutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    mutation.mutate();
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Create Community</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Computer Science 2025"
            style={styles.input}
            disabled={mutation.isPending}
            maxLength={100}
            autoFocus
          />
          {nameError && <p style={styles.fieldError}>{nameError}</p>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this community about?"
            rows={3}
            style={styles.textarea}
            disabled={mutation.isPending}
            maxLength={1000}
          />
          <span style={styles.charCount}>{description.length}/1000</span>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Visibility</label>
          <div style={styles.toggleRow}>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              style={{
                ...styles.toggleBtn,
                ...(isPublic ? styles.toggleActive : {}),
              }}
              disabled={mutation.isPending}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              style={{
                ...styles.toggleBtn,
                ...(!isPublic ? styles.toggleActive : {}),
              }}
              disabled={mutation.isPending}
            >
              Private
            </button>
          </div>
          <p style={styles.hint}>
            {isPublic
              ? "Anyone at your university can find and join."
              : "Only invited members can see and join."}
          </p>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => router.back()}
            style={styles.cancelBtn}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...styles.submitBtn,
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {mutation.isPending ? "Creating..." : "Create Community"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 520 },
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 20 },
  form: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
  },
  field: { marginBottom: 18 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    resize: "vertical",
    outline: "none",
  },
  charCount: {
    display: "block",
    textAlign: "right",
    fontSize: 11,
    color: "#bbb",
    marginTop: 4,
  },
  fieldError: { color: "#c53030", fontSize: 12, marginTop: 4 },
  toggleRow: { display: "flex", gap: 8 },
  toggleBtn: {
    flex: 1,
    padding: "10px 0",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    background: "#fff",
    color: "#666",
    cursor: "pointer",
  },
  toggleActive: {
    background: "#6C63FF",
    color: "#fff",
    borderColor: "#6C63FF",
  },
  hint: { fontSize: 12, color: "#999", marginTop: 6 },
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    cursor: "pointer",
    color: "#666",
  },
  submitBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
