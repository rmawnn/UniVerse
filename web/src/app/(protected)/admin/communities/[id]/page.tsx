"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCommunityDetail, deleteCommunity, restoreCommunity } from "@/api/admin";
import type { AdminCommunityDetail } from "@/api/admin";
import { useAuthStore } from "@/store/auth-store";
import { formatRelativeTime } from "@/lib/format";

export default function AdminCommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"delete" | "restore" | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data: community, isLoading, error } = useQuery<AdminCommunityDetail>({
    queryKey: ["admin-community-detail", id],
    queryFn: () => getCommunityDetail(id),
  });

  const mutation = useMutation({
    mutationFn: (action: "delete" | "restore") =>
      action === "delete" ? deleteCommunity(id) : restoreCommunity(id),
    onSuccess: (_, action) => {
      qc.invalidateQueries({ queryKey: ["admin-community-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-communities"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      showToast(action === "delete" ? "Community deleted" : "Community restored");
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: i % 2 === 0 ? 200 : 140, height: 16, borderRadius: 4, marginBottom: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div>
        <BackLink />
        <div style={s.errorBox}>
          <p style={s.errorText}>
            {(error as { message?: string })?.message ?? "Community not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackLink />

      {/* ── Header ────────────────────────── */}
      <div style={s.header}>
        <h2 style={s.name}>{community.name}</h2>
        {community.is_deleted ? (
          <span style={s.deletedBadge}>Deleted</span>
        ) : (
          <span style={s.activeBadge}>Active</span>
        )}
      </div>

      {/* ── Info Card ─────────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Community Information</h3>
        <div style={s.grid}>
          {community.description && (
            <InfoRow label="Description" value={community.description} />
          )}
          <InfoRow label="Created by" value={community.created_by_username ?? "—"} />
          <InfoRow label="Members" value={String(community.member_count)} />
          <InfoRow label="Created" value={formatRelativeTime(community.created_at)} />
        </div>
      </div>

      {/* ── Actions ───────────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Actions</h3>
        <div style={s.actions}>
          <button
            onClick={() =>
              setConfirmAction(community.is_deleted ? "restore" : "delete")
            }
            disabled={mutation.isPending}
            style={{
              ...s.actionBtn,
              background: community.is_deleted ? "#dcfce7" : "#fee2e2",
              color: community.is_deleted ? "#16a34a" : "#dc2626",
            }}
          >
            {community.is_deleted ? "Restore Community" : "Delete Community"}
          </button>
          {!community.is_deleted && (
            <Link href={`/communities/${community.id}`} style={s.viewLink}>
              View Public Page
            </Link>
          )}
        </div>
      </div>

      {/* ── Members ───────────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Members ({community.members.length})</h3>
        {community.members.length === 0 ? (
          <p style={s.empty}>No members.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Username</th>
                <th style={s.th}>Name</th>
                <th style={s.th}>Role</th>
              </tr>
            </thead>
            <tbody>
              {community.members.map((m) => (
                <tr key={m.user_id} style={s.tr}>
                  <td style={s.td}>
                    <Link href={`/admin/users/${m.user_id}`} style={s.userLink}>
                      {m.username}
                    </Link>
                  </td>
                  <td style={s.td}>
                    <span style={{ color: "#555" }}>{m.full_name}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      ...s.roleBadge,
                      background: m.role === "admin" ? "#ede9fe"
                        : m.role === "moderator" ? "#dbeafe" : "#f3f4f6",
                      color: m.role === "admin" ? "#7c3aed"
                        : m.role === "moderator" ? "#2563eb" : "#6b7280",
                    }}>
                      {m.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Recent Posts ──────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Recent Posts ({community.recent_posts.length})</h3>
        {community.recent_posts.length === 0 ? (
          <p style={s.empty}>No posts yet.</p>
        ) : (
          <div style={s.postsList}>
            {community.recent_posts.map((p) => (
              <Link
                key={p.id}
                href={`/admin/posts/${p.id}`}
                style={{
                  ...s.postItem,
                  opacity: p.is_deleted ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={s.postMeta}>
                    <span style={s.postAuthor}>{p.author_username}</span>
                    <span style={s.postTime}>{formatRelativeTime(p.created_at)}</span>
                    {p.is_deleted && <span style={s.hiddenTag}>Hidden</span>}
                  </div>
                  <span style={s.postPreview}>{p.content_preview || "—"}</span>
                </div>
                <span style={s.arrow}>&rarr;</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Confirm Modal ─────────────────── */}
      {confirmAction && (
        <div style={modalS.overlay}>
          <div style={modalS.box}>
            <h3 style={modalS.title}>
              {confirmAction === "delete" ? "Delete Community" : "Restore Community"}
            </h3>
            <p style={modalS.message}>
              {confirmAction === "delete"
                ? `Delete "${community.name}"? It will be soft-deleted and hidden from users.`
                : `Restore "${community.name}"? It will become visible to users again.`}
            </p>
            <div style={modalS.buttons}>
              <button onClick={() => setConfirmAction(null)} style={modalS.cancel} disabled={mutation.isPending}>
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate(confirmAction)}
                style={{
                  ...modalS.confirm,
                  background: confirmAction === "delete" ? "#ef4444" : "#22c55e",
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Processing..." : confirmAction === "delete" ? "Delete" : "Restore"}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value}</span>
    </div>
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
  header: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
  },
  name: { fontSize: 20, fontWeight: 700, margin: 0, color: "#1a1a1a" },
  activeBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#16a34a",
  },
  deletedBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#fee2e2", color: "#dc2626",
  },
  card: {
    background: "#fff", border: "1px solid #eee", borderRadius: 12,
    padding: 20, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "#1a1a1a" },
  grid: { display: "flex", flexDirection: "column", gap: 10 },
  infoRow: { display: "flex", alignItems: "flex-start", gap: 12 },
  infoLabel: { fontSize: 13, color: "#888", fontWeight: 500, minWidth: 120 },
  infoValue: { fontSize: 14, color: "#1a1a1a" },
  actions: { display: "flex", gap: 10, alignItems: "center" },
  actionBtn: {
    border: "none", borderRadius: 8, padding: "8px 18px",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  viewLink: {
    fontSize: 14, color: "#6C63FF", fontWeight: 500, textDecoration: "none",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#666",
    fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: "1px solid #eee", background: "#fafafa",
  },
  tr: { borderBottom: "1px solid #f5f5f5" },
  td: { padding: "10px 14px", verticalAlign: "middle" },
  userLink: { color: "#6C63FF", fontSize: 14, fontWeight: 600, textDecoration: "none" },
  roleBadge: {
    display: "inline-block", padding: "2px 8px", borderRadius: 10,
    fontSize: 11, fontWeight: 600,
  },
  postsList: { display: "flex", flexDirection: "column", gap: 0 },
  postItem: {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
    borderBottom: "1px solid #f5f5f5", textDecoration: "none", color: "inherit",
  },
  postMeta: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 },
  postAuthor: { fontSize: 13, fontWeight: 600, color: "#1a1a1a" },
  postTime: { fontSize: 12, color: "#bbb" },
  hiddenTag: {
    display: "inline-block", padding: "1px 6px", fontSize: 10, fontWeight: 600,
    background: "#fee2e2", color: "#dc2626", borderRadius: 4,
  },
  postPreview: { fontSize: 13, color: "#444", display: "block" },
  arrow: { color: "#ccc", fontSize: 14 },
  empty: { textAlign: "center", padding: "20px 0", color: "#ccc", fontSize: 13 },
  errorBox: { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 12, padding: 20 },
  errorText: { color: "#c53030", fontSize: 14, margin: 0 },
};
