"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCommunities } from "@/api/communities";
import { createPost } from "@/api/posts";
import { uploadImage } from "@/api/uploads";
import { useAuthStore } from "@/store/auth-store";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CreatePostModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Unmount body when closed so all local state resets on each open.
  if (!open) return null;
  return <CreatePostModalBody onClose={onClose} />;
}

function CreatePostModalBody({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const communitiesQuery = useQuery({
    queryKey: ["communities", "browse", user?.university_id],
    queryFn: () => listCommunities(user!.university_id!, { page_size: 100 }),
    enabled: !!user?.university_id,
    staleTime: 60_000,
  });

  const communities = communitiesQuery.data?.items ?? [];
  const effectiveCommunityId =
    selectedId ?? (communities.length > 0 ? communities[0].id : "");

  const createMutation = useMutation({
    mutationFn: (imageUrl?: string) =>
      createPost(effectiveCommunityId, {
        content: content.trim(),
        ...(imageUrl ? { image_url: imageUrl } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({
        queryKey: ["community-posts", effectiveCommunityId],
      });
      onClose();
    },
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to create post");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB`);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !effectiveCommunityId || createMutation.isPending || isUploading) {
      return;
    }

    setError(null);

    try {
      let imageUrl: string | undefined;

      // Upload image first if one is selected
      if (selectedFile) {
        setIsUploading(true);
        try {
          const result = await uploadImage(selectedFile);
          // Convert relative path to absolute URL
          imageUrl = `${BACKEND_URL}${result.url}`;
        } catch (err: unknown) {
          const msg = (err as { message?: string })?.message ?? "Failed to upload image";
          setError(msg);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      createMutation.mutate(imageUrl);
    } catch {
      setError("Something went wrong");
    }
  };

  const isBusy = createMutation.isPending || isUploading;
  const disabled =
    !content.trim() ||
    !effectiveCommunityId ||
    isBusy ||
    communities.length === 0;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel">
        <div style={styles.header}>
          <h3 style={styles.title}>Create Post</h3>
          <button type="button" onClick={onClose} style={styles.closeBtn}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Community</label>
          {communitiesQuery.isLoading ? (
            <p style={styles.muted}>Loading communities...</p>
          ) : communities.length === 0 ? (
            <p style={styles.muted}>You need to join a community first.</p>
          ) : (
            <select
              value={effectiveCommunityId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={styles.select}
              disabled={isBusy}
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <label style={styles.label}>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            style={styles.textarea}
            disabled={isBusy}
            autoFocus
          />

          {/* ── Image upload ──────────────────────────────────── */}
          <label style={styles.label}>Image (optional)</label>

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadBtn}
              disabled={isBusy}
            >
              Choose Image
            </button>
          ) : (
            <div style={styles.selectedFile}>
              <span style={styles.fileName}>
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </span>
              <button
                type="button"
                onClick={removeImage}
                style={styles.removeBtn}
                disabled={isBusy}
              >
                ✕
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {previewUrl && (
            <div style={styles.previewWrap}>
              <img
                src={previewUrl}
                alt="Preview"
                style={styles.previewImg}
              />
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={isBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled}
              style={{
                ...styles.submitBtn,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {isUploading
                ? "Uploading..."
                : createMutation.isPending
                  ? "Posting..."
                  : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
    color: "#999",
    padding: 0,
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#666",
    fontWeight: 500,
    marginBottom: 6,
    marginTop: 10,
  },
  select: {
    width: "100%",
    padding: 10,
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  textarea: {
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    resize: "vertical",
    outline: "none",
  },
  uploadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    cursor: "pointer",
    color: "#555",
  },
  selectedFile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#f0efff",
    border: "1px solid #e0defe",
    borderRadius: 8,
    padding: "8px 12px",
  },
  fileName: {
    fontSize: 13,
    color: "#6C63FF",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#999",
    fontSize: 14,
    cursor: "pointer",
    padding: "0 4px",
    flexShrink: 0,
  },
  previewWrap: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #eee",
    maxHeight: 200,
  },
  previewImg: {
    width: "100%",
    maxHeight: 200,
    objectFit: "cover" as const,
    display: "block",
  },
  muted: { color: "#999", fontSize: 14, margin: "4px 0" },
  error: { color: "#c53030", fontSize: 13, margin: "10px 0 0" },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
    color: "#666",
  },
  submitBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};
