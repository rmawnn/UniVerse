"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCommunities } from "@/api/communities";
import { createPost } from "@/api/posts";
import { useAuthStore } from "@/store/auth-store";

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

  // `null` = not yet touched — fallback to first community on submit.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (url: string) => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const showPreview = isValidUrl(imageUrl) && !imageError;

  const communitiesQuery = useQuery({
    queryKey: ["communities", "browse", user?.university_id],
    queryFn: () => listCommunities(user!.university_id!, { page_size: 100 }),
    enabled: !!user?.university_id,
    staleTime: 60_000,
  });

  const communities = communitiesQuery.data?.items ?? [];
  // Derived: either the explicit choice or the first community in the list.
  const effectiveCommunityId =
    selectedId ?? (communities.length > 0 ? communities[0].id : "");

  const createMutation = useMutation({
    mutationFn: () =>
      createPost(effectiveCommunityId, {
        content: content.trim(),
        ...(isValidUrl(imageUrl) ? { image_url: imageUrl.trim() } : {}),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !content.trim() ||
      !effectiveCommunityId ||
      createMutation.isPending
    ) {
      return;
    }
    createMutation.mutate();
  };

  const disabled =
    !content.trim() ||
    !effectiveCommunityId ||
    createMutation.isPending ||
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
              disabled={createMutation.isPending}
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
            disabled={createMutation.isPending}
            autoFocus
          />

          <label style={styles.label}>Image URL (optional)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setImageError(false);
            }}
            placeholder="https://example.com/image.jpg"
            style={styles.input}
            disabled={createMutation.isPending}
          />

          {imageUrl.trim() && !isValidUrl(imageUrl) && (
            <p style={styles.urlHint}>Enter a valid URL starting with http:// or https://</p>
          )}

          {showPreview && (
            <div style={styles.previewWrap}>
              <img
                src={imageUrl}
                alt="Preview"
                style={styles.previewImg}
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {imageError && imageUrl.trim() && (
            <p style={styles.urlHint}>Could not load image. Check the URL.</p>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={createMutation.isPending}
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
              {createMutation.isPending ? "Posting..." : "Post"}
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
  input: {
    width: "100%",
    padding: 10,
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  urlHint: {
    color: "#e67e22",
    fontSize: 12,
    margin: "4px 0 0",
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
