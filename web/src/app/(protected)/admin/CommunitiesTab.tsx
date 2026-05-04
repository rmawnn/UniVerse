"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCommunities, deleteCommunity, restoreCommunity } from "@/api/admin";
import type { AdminCommunity } from "@/api/admin";
import { formatRelativeTime } from "@/lib/format";

export default function CommunitiesTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    community: AdminCommunity;
    action: "delete" | "restore";
  } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-communities", page],
    queryFn: () => listCommunities({ page, page_size: 50 }),
  });

  const mutation = useMutation({
    mutationFn: ({ community, action }: { community: AdminCommunity; action: "delete" | "restore" }) =>
      action === "delete" ? deleteCommunity(community.id) : restoreCommunity(community.id),
    onSuccess: (result, { action }) => {
      qc.invalidateQueries({ queryKey: ["admin-communities"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-activity"] });
      setConfirmAction(null);
      setBusyId(null);
      showToast(
        action === "delete"
          ? `"${result.name}" deleted`
          : `"${result.name}" restored`
      );
    },
    onError: (err: { message?: string }) => {
      setBusyId(null);
      showToast(err?.message ?? "Action failed", "error");
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    setBusyId(confirmAction.community.id);
    mutation.mutate({ community: confirmAction.community, action: confirmAction.action });
  };

  const totalMembers = data?.items.reduce((sum, c) => sum + c.member_count, 0) ?? 0;

  return (
    <div>
      {data && (
        <div style={styles.statsRow}>
          <span style={styles.stat}>{data.total} communities</span>
          <span style={styles.statDot} />
          <span style={styles.stat}>{totalMembers} total memberships on this page</span>
        </div>
      )}

      {isLoading && (
        <div style={styles.card}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={styles.skeletonRow}>
              <div className="skeleton" style={{ width: 140, height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 60, height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>
            {(error as { message?: string })?.message ?? "Failed to load communities"}
          </p>
        </div>
      )}

      {data && (
        <>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Members</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => {
                  const isBusy = busyId === c.id;
                  return (
                    <tr key={c.id} style={{
                      ...styles.tr,
                      background: c.is_deleted ? "#fef2f2" : undefined,
                      opacity: isBusy ? 0.5 : c.is_deleted ? 0.7 : 1,
                    }}>
                      <td style={styles.td}>
                        <Link href={`/admin/communities/${c.id}`} style={styles.nameLink}>
                          {c.name}
                        </Link>
                        {c.description && (
                          <span style={styles.desc}>
                            {c.description.length > 60
                              ? c.description.slice(0, 60) + "..."
                              : c.description}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.memberCount}>{c.member_count}</span>
                      </td>
                      <td style={styles.td}>
                        {c.is_deleted ? (
                          <span style={styles.deletedBadge}>Deleted</span>
                        ) : (
                          <span style={styles.activeBadge}>Active</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: "#999", fontSize: 13 }}>
                          {formatRelativeTime(c.created_at)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {!c.is_deleted && (
                            <Link href={`/communities/${c.id}`} style={styles.link}>
                              View
                            </Link>
                          )}
                          <button
                            onClick={() =>
                              setConfirmAction({
                                community: c,
                                action: c.is_deleted ? "restore" : "delete",
                              })
                            }
                            disabled={isBusy}
                            style={{
                              ...styles.actionBtn,
                              background: c.is_deleted ? "#dcfce7" : "#fee2e2",
                              color: c.is_deleted ? "#16a34a" : "#dc2626",
                              opacity: isBusy ? 0.5 : 1,
                            }}
                          >
                            {isBusy ? "..." : c.is_deleted ? "Restore" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.items.length === 0 && (
              <p style={styles.empty}>No communities found.</p>
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
              {confirmAction.action === "delete" ? "Delete Community" : "Restore Community"}
            </h3>
            <p style={modalStyles.message}>
              {confirmAction.action === "delete"
                ? `Delete "${confirmAction.community.name}"? It will be soft-deleted and hidden from users.`
                : `Restore "${confirmAction.community.name}"? It will become visible to users again.`}
            </p>
            <div style={modalStyles.detail}>
              <span>Members: {confirmAction.community.member_count}</span>
              <span>Created: {formatRelativeTime(confirmAction.community.created_at)}</span>
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
                  background: confirmAction.action === "delete" ? "#ef4444" : "#22c55e",
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? "Processing..."
                  : confirmAction.action === "delete" ? "Delete" : "Restore"}
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

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  box: { background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "90%" },
  title: { fontSize: 16, fontWeight: 700, margin: "0 0 8px" },
  message: { fontSize: 14, color: "#555", marginBottom: 12, lineHeight: 1.5 },
  detail: {
    display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#888",
    background: "#f9fafb", padding: "10px 14px", borderRadius: 8, marginBottom: 16,
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
  statsRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  stat: { fontSize: 13, color: "#999" },
  statDot: { width: 4, height: 4, borderRadius: "50%", background: "#ddd" },
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#666",
    fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: "1px solid #eee", background: "#fafafa",
  },
  tr: { borderBottom: "1px solid #f5f5f5", transition: "opacity 0.2s" },
  td: { padding: "12px 16px", verticalAlign: "middle" },
  name: { fontWeight: 600, color: "#1a1a1a", display: "block" },
  nameLink: { fontWeight: 600, color: "#6C63FF", textDecoration: "none", display: "block" },
  desc: { fontSize: 12, color: "#999", display: "block" },
  memberCount: { fontWeight: 600, color: "#444" },
  activeBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#16a34a",
  },
  deletedBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#fee2e2", color: "#dc2626",
  },
  link: { color: "#6C63FF", fontSize: 13, fontWeight: 500, textDecoration: "none" },
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
