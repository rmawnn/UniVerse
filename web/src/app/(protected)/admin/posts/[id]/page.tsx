"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPostDetail, hidePost, restorePost } from "@/api/admin";
import type { AdminPostDetail } from "@/api/admin";
import { useAuthStore } from "@/store/auth-store";
import { formatRelativeTime } from "@/lib/format";

export default function AdminPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"hide" | "restore" | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data: post, isLoading, error } = useQuery<AdminPostDetail>({
    queryKey: ["admin-post-detail", id],
    queryFn: () => getPostDetail(id),
  });

  const mutation = useMutation({
    mutationFn: (action: "hide" | "restore") =>
      action === "hide" ? hidePost(id) : restorePost(id),
    onSuccess: (_, action) => {
      qc.invalidateQueries({ queryKey: ["admin-post-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      showToast(action === "hide" ? "Post hidden" : "Post restored");
    },
    onError: (err: { message?: string }) =>
      showToast(err?.message ?? "Action failed", "error"),
  });

  if (currentUser?.role !== "admin") {
    return (
      <div style={s.center}>
        <p style={s.muted}>Admin access required.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <BackLink />
        <div style={s.card}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: i === 0 ? "80%" : 160, height: 16, borderRadius: 4, marginBottom: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <BackLink />
        <div style={s.errorBox}>
          <p style={s.errorText}>
            {(error as { message?: string })?.message ?? "Post not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackLink />

      {/* ── Post Info ─────────────────────── */}
      <div style={s.card}>
        <div style={s.postHeader}>
          <div style={{ flex: 1 }}>
            <div style={s.metaRow}>
              <Link href={`/admin/users/${post.author_username}`} style={s.authorLink}>
                {post.author_username}
              </Link>
              <span style={s.metaSep}>in</span>
              <Link href={`/admin/communities/${post.community_id}`} style={s.communityLink}>
                {post.community_name}
              </Link>
            </div>
            <span style={s.timestamp}>{formatRelativeTime(post.created_at)}</span>
          </div>
          {post.is_deleted ? (
            <span style={s.hiddenBadge}>Hidden</span>
          ) : (
            <span style={s.visibleBadge}>Visible</span>
          )}
        </div>

        <div style={s.content}>{post.content}</div>

        {post.image_url && (
          <img src={post.image_url} alt="Post image" style={s.postImage} />
        )}

        <div style={s.statsRow}>
          <span style={s.statItem}>{post.like_count} likes</span>
          <span style={s.statDot} />
          <span style={s.statItem}>{post.comment_count} comments</span>
        </div>
      </div>

      {/* ── Actions ───────────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Actions</h3>
        <div style={s.actions}>
          <button
            onClick={() => setConfirmAction(post.is_deleted ? "restore" : "hide")}
            disabled={mutation.isPending}
            style={{
              ...s.actionBtn,
              background: post.is_deleted ? "#dcfce7" : "#fee2e2",
              color: post.is_deleted ? "#16a34a" : "#dc2626",
            }}
          >
            {post.is_deleted ? "Restore Post" : "Hide Post"}
          </button>
        </div>
      </div>

      {/* ── Comments ──────────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Comments ({post.comments.length})</h3>
        {post.comments.length === 0 ? (
          <p style={s.empty}>No comments.</p>
        ) : (
          <div style={s.commentsList}>
            {post.comments.map((c) => (
              <div
                key={c.id}
                style={{
                  ...s.commentItem,
                  opacity: c.is_deleted ? 0.5 : 1,
                }}
              >
                <div style={s.commentHeader}>
                  <span style={s.commentAuthor}>{c.author_username}</span>
                  <span style={s.commentTime}>{formatRelativeTime(c.created_at)}</span>
                  {c.is_deleted && <span style={s.deletedTag}>Deleted</span>}
                </div>
                <p style={s.commentContent}>{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Confirm Modal ─────────────────── */}
      {confirmAction && (
        <div style={modalS.overlay}>
          <div style={modalS.box}>
            <h3 style={modalS.title}>
              {confirmAction === "hide" ? "Hide Post" : "Restore Post"}
            </h3>
            <p style={modalS.message}>
              {confirmAction === "hide"
                ? `Hide this post by "${post.author_username}"? It will no longer appear in feeds.`
                : `Restore this post by "${post.author_username}"? It will appear in feeds again.`}
            </p>
            <div style={modalS.buttons}>
              <button onClick={() => setConfirmAction(null)} style={modalS.cancel} disabled={mutation.isPending}>
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate(confirmAction)}
                style={{
                  ...modalS.confirm,
                  background: confirmAction === "hide" ? "#ef4444" : "#22c55e",
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Processing..." : confirmAction === "hide" ? "Hide" : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1100,
          background: toast.type === "success" ? "#22c55e" : "#ef4444",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin" style={s.backLink}>
      &larr; Back to Admin
    </Link>
  );
}

const modalS: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  box: { background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "90%" },
  title: { fontSize: 16, fontWeight: 700, margin: "0 0 8px" },
  message: { fontSize: 14, color: "#555", marginBottom: 16, lineHeight: 1.5 },
  buttons: { display: "flex", gap: 10, justifyContent: "flex-end" },
  cancel: {
    padding: "8px 18px", fontSize: 14, border: "1px solid #ddd",
    borderRadius: 8, background: "#fff", cursor: "pointer",
  },
  confirm: {
    padding: "8px 18px", fontSize: 14, border: "none", borderRadius: 8,
    color: "#fff", fontWeight: 600, cursor: "pointer",
  },
};

const s: Record<string, React.CSSProperties> = {
  center: { textAlign: "center", padding: "64px 24px" },
  muted: { fontSize: 16, color: "#999" },
  backLink: {
    display: "inline-block", marginBottom: 16, fontSize: 14,
    color: "#6C63FF", textDecoration: "none", fontWeight: 500,
  },
  card: {
    background: "#fff", border: "1px solid #eee", borderRadius: 12,
    padding: 20, marginBottom: 16,
  },
  postHeader: {
    display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16,
  },
  metaRow: { display: "flex", alignItems: "center", gap: 6 },
  authorLink: { fontSize: 15, fontWeight: 600, color: "#6C63FF", textDecoration: "none" },
  metaSep: { fontSize: 13, color: "#bbb" },
  communityLink: { fontSize: 14, fontWeight: 500, color: "#6C63FF", textDecoration: "none" },
  timestamp: { fontSize: 12, color: "#999" },
  visibleBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#16a34a", flexShrink: 0,
  },
  hiddenBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#fee2e2", color: "#dc2626", flexShrink: 0,
  },
  content: {
    fontSize: 15, color: "#1a1a1a", lineHeight: 1.6, whiteSpace: "pre-wrap",
    marginBottom: 16,
  },
  postImage: {
    maxWidth: "100%", borderRadius: 8, marginBottom: 16, display: "block",
  },
  statsRow: {
    display: "flex", alignItems: "center", gap: 8,
    paddingTop: 12, borderTop: "1px solid #f0f0f0",
  },
  statItem: { fontSize: 13, color: "#888", fontWeight: 500 },
  statDot: { width: 4, height: 4, borderRadius: "50%", background: "#ddd" },
  sectionTitle: { fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "#1a1a1a" },
  actions: { display: "flex", gap: 10 },
  actionBtn: {
    border: "none", borderRadius: 8, padding: "8px 18px",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  commentsList: { display: "flex", flexDirection: "column", gap: 0 },
  commentItem: {
    padding: "12px 0", borderBottom: "1px solid #f5f5f5",
  },
  commentHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: 600, color: "#1a1a1a" },
  commentTime: { fontSize: 12, color: "#bbb" },
  deletedTag: {
    display: "inline-block", padding: "1px 6px", fontSize: 10, fontWeight: 600,
    background: "#fee2e2", color: "#dc2626", borderRadius: 4,
  },
  commentContent: { fontSize: 14, color: "#444", margin: 0, lineHeight: 1.5 },
  empty: { textAlign: "center", padding: "20px 0", color: "#ccc", fontSize: 13 },
  errorBox: { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 12, padding: 20 },
  errorText: { color: "#c53030", fontSize: 14, margin: 0 },
};
