"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPosts, hidePost, restorePost } from "@/api/admin";
import type { AdminPost } from "@/api/admin";
import { formatRelativeTime } from "@/lib/format";

export default function PostsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    post: AdminPost;
    action: "hide" | "restore";
  } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-posts", page],
    queryFn: () => listPosts({ page, page_size: 50 }),
  });

  const mutation = useMutation({
    mutationFn: ({ post, action }: { post: AdminPost; action: "hide" | "restore" }) =>
      action === "hide" ? hidePost(post.id) : restorePost(post.id),
    onSuccess: (result, { action }) => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-activity"] });
      setConfirmAction(null);
      setBusyId(null);
      showToast(
        action === "hide"
          ? `Post by ${result.author_username} hidden`
          : `Post by ${result.author_username} restored`
      );
    },
    onError: (err: { message?: string }) => {
      setBusyId(null);
      showToast(err?.message ?? "Action failed", "error");
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    setBusyId(confirmAction.post.id);
    mutation.mutate({ post: confirmAction.post, action: confirmAction.action });
  };

  return (
    <div>
      {isLoading && (
        <div style={styles.card}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={styles.skeletonRow}>
              <div className="skeleton" style={{ width: 100, height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 200, height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 60, height: 16, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>
            {(error as { message?: string })?.message ?? "Failed to load posts"}
          </p>
        </div>
      )}

      {data && (
        <>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Author</th>
                  <th style={styles.th}>Community</th>
                  <th style={styles.th}>Content</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const isBusy = busyId === p.id;
                  return (
                    <tr key={p.id} style={{
                      ...styles.tr,
                      opacity: isBusy ? 0.5 : 1,
                      background: p.is_deleted ? "#fef2f2" : undefined,
                    }}>
                      <td style={styles.td}>
                        <span style={styles.username}>{p.author_username}</span>
                        <span style={styles.fullName}>{p.author_full_name}</span>
                      </td>
                      <td style={styles.td}>
                        <Link href={`/communities/${p.community_id}`} style={styles.communityLink}>
                          {p.community_name}
                        </Link>
                      </td>
                      <td style={styles.td}>
                        <Link href={`/admin/posts/${p.id}`} style={styles.contentLink}>
                          {truncateClean(p.content_preview, 80)}
                        </Link>
                        {p.image_url && <span style={styles.imgTag}>IMG</span>}
                      </td>
                      <td style={styles.td}>
                        {p.is_deleted ? (
                          <span style={styles.hiddenBadge}>Hidden</span>
                        ) : (
                          <span style={styles.visibleBadge}>Visible</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: "#999", fontSize: 13 }}>
                          {formatRelativeTime(p.created_at)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              post: p,
                              action: p.is_deleted ? "restore" : "hide",
                            })
                          }
                          disabled={isBusy}
                          style={{
                            ...styles.actionBtn,
                            background: p.is_deleted ? "#dcfce7" : "#fee2e2",
                            color: p.is_deleted ? "#16a34a" : "#dc2626",
                            opacity: isBusy ? 0.5 : 1,
                          }}
                        >
                          {isBusy ? "..." : p.is_deleted ? "Restore" : "Hide"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.items.length === 0 && (
              <p style={styles.empty}>No posts found.</p>
            )}
          </div>
          {data.total_pages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...styles.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>Page {page} of {data.total_pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                style={{ ...styles.pageBtn, opacity: page === data.total_pages ? 0.4 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {confirmAction && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.box}>
            <h3 style={modalStyles.title}>
              {confirmAction.action === "hide" ? "Hide Post" : "Restore Post"}
            </h3>
            <p style={modalStyles.message}>
              {confirmAction.action === "hide"
                ? `Hide this post by "${confirmAction.post.author_username}"? It will no longer appear in feeds.`
                : `Restore this post by "${confirmAction.post.author_username}"? It will appear in feeds again.`}
            </p>
            <div style={modalStyles.preview}>
              {truncateClean(confirmAction.post.content_preview, 120)}
            </div>
            {mutation.error && (
              <p style={modalStyles.error}>
                {(mutation.error as { message?: string })?.message ?? "Action failed"}
              </p>
            )}
            <div style={modalStyles.buttons}>
              <button
                onClick={() => setConfirmAction(null)}
                style={modalStyles.cancel}
                disabled={mutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  ...modalStyles.confirm,
                  background: confirmAction.action === "hide" ? "#ef4444" : "#22c55e",
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? "Processing..."
                  : confirmAction.action === "hide" ? "Hide" : "Restore"}
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

function truncateClean(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "...";
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  box: { background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "90%" },
  title: { fontSize: 16, fontWeight: 700, margin: "0 0 8px" },
  message: { fontSize: 14, color: "#555", marginBottom: 12, lineHeight: 1.5 },
  preview: {
    fontSize: 13, color: "#888", background: "#f9fafb",
    padding: "10px 14px", borderRadius: 8, marginBottom: 16, lineHeight: 1.5,
  },
  error: { color: "#c53030", fontSize: 13, marginBottom: 12 },
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

const styles: Record<string, React.CSSProperties> = {
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#666",
    fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: "1px solid #eee", background: "#fafafa",
  },
  tr: { borderBottom: "1px solid #f5f5f5", transition: "opacity 0.2s" },
  td: { padding: "12px 16px", verticalAlign: "middle" },
  username: { fontWeight: 600, color: "#1a1a1a", display: "block" },
  fullName: { fontSize: 12, color: "#999" },
  communityLink: {
    color: "#6C63FF", fontSize: 13, fontWeight: 500, textDecoration: "none",
  },
  preview: { fontSize: 13, color: "#444", lineHeight: 1.4, display: "inline" },
  contentLink: { fontSize: 13, color: "#6C63FF", lineHeight: 1.4, textDecoration: "none" },
  imgTag: {
    display: "inline-block", marginLeft: 6, padding: "1px 6px",
    fontSize: 10, fontWeight: 600, background: "#e0f2fe", color: "#0284c7",
    borderRadius: 4, verticalAlign: "middle",
  },
  visibleBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#16a34a",
  },
  hiddenBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#fee2e2", color: "#dc2626",
  },
  actionBtn: {
    border: "none", borderRadius: 6, padding: "6px 14px",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s",
  },
  empty: { textAlign: "center", padding: 32, color: "#999", fontSize: 14 },
  skeletonRow: {
    display: "flex", alignItems: "center", gap: 24,
    padding: "14px 16px", borderBottom: "1px solid #f5f5f5",
  },
  pagination: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 16,
  },
  pageBtn: {
    background: "#fff", border: "1px solid #ddd", borderRadius: 8,
    padding: "8px 16px", fontSize: 14, cursor: "pointer",
  },
  pageInfo: { fontSize: 14, color: "#666" },
  errorBox: { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 12, padding: 20 },
  errorText: { color: "#c53030", fontSize: 14, margin: 0 },
};
