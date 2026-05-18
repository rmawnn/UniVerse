"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getModerationQueue,
  approveVerification,
  rejectVerification,
  hidePost,
  restorePost,
} from "@/api/admin";
import type {
  ModerationQueue,
  AdminVerification,
  AdminPost,
  AdminCommunity,
  ModerationJobItem,
} from "@/api/admin";
import { formatRelativeTime } from "@/lib/format";

const QUEUE_KEY = ["admin-moderation-queue"];

export default function ModerationTab() {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<ModerationQueue>({
    queryKey: QUEUE_KEY,
    queryFn: getModerationQueue,
  });

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  /* ── Mutations ────────────────────────────────────────────── */

  const approveMut = useMutation({
    mutationFn: (id: string) => approveVerification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUEUE_KEY });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectVerification(id, reason),
    onSuccess: () => {
      setRejectId(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: QUEUE_KEY });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const hideMut = useMutation({
    mutationFn: (id: string) => hidePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUEUE_KEY }),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => restorePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUEUE_KEY }),
  });

  /* ── Skeleton ─────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={s.section}>
            <div className="skeleton" style={{ width: 160, height: 18, borderRadius: 4 }} />
            {Array.from({ length: 2 }).map((__, j) => (
              <div key={j} className="skeleton" style={{ width: "100%", height: 52, borderRadius: 8, marginTop: 10 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={s.errorBox}>
        <p style={s.errorText}>Failed to load moderation queue.</p>
        <button onClick={() => refetch()} style={s.retryBtn}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const {
    pending_verifications,
    hidden_posts,
    recent_communities,
    recent_jobs,
  } = data;

  const totalItems =
    pending_verifications.length +
    hidden_posts.length +
    recent_communities.length +
    recent_jobs.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {totalItems === 0 && (
        <div style={s.emptyState}>
          <span style={{ fontSize: 36 }}>&#10003;</span>
          <p style={s.emptyTitle}>All clear</p>
          <p style={s.emptyHint}>Nothing needs attention right now.</p>
        </div>
      )}

      {/* ── Pending Verifications ────────────────────── */}
      {pending_verifications.length > 0 && (
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>
              Pending Verifications
              <span style={s.badge}>{pending_verifications.length}</span>
            </h3>
          </div>

          {pending_verifications.map((v) => (
            <div key={v.id} style={s.row}>
              <div style={s.rowInfo}>
                <div style={s.rowMain}>
                  <span style={s.rowName}>{v.full_name}</span>
                  <span style={s.rowMeta}>@{v.username}</span>
                  <MethodBadge method={v.verification_method} />
                </div>
                <span style={s.rowSub}>
                  {v.university_name ?? "Unknown university"}
                  {v.university_email && ` · ${v.university_email}`}
                </span>
              </div>
              <div style={s.rowActions}>
                <span style={s.rowTime}>{formatRelativeTime(v.created_at)}</span>
                {v.document_url && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}${v.document_url.startsWith("/api") ? v.document_url.replace(/^\/api\/v1/, "") : v.document_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.linkBtn}
                  >
                    View Doc
                  </a>
                )}
                <button
                  onClick={() => approveMut.mutate(v.id)}
                  disabled={approveMut.isPending}
                  style={s.approveBtn}
                >
                  Approve
                </button>
                {rejectId === v.id ? (
                  <div style={s.rejectInline}>
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={s.rejectInput}
                    />
                    <button
                      onClick={() =>
                        rejectMut.mutate({
                          id: v.id,
                          reason: rejectReason || undefined,
                        })
                      }
                      disabled={rejectMut.isPending}
                      style={s.rejectConfirmBtn}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setRejectId(null); setRejectReason(""); }}
                      style={s.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRejectId(v.id)}
                    style={s.rejectBtn}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Hidden Posts ─────────────────────────────── */}
      {hidden_posts.length > 0 && (
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>
              Hidden Posts
              <span style={s.badge}>{hidden_posts.length}</span>
            </h3>
          </div>

          {hidden_posts.map((p) => (
            <div key={p.id} style={s.row}>
              <div style={s.rowInfo}>
                <div style={s.rowMain}>
                  <span style={s.rowName}>{p.author_username}</span>
                  <span style={s.rowMeta}>in {p.community_name}</span>
                </div>
                <span style={s.rowSub}>
                  {p.content_preview.length > 80
                    ? p.content_preview.slice(0, 80) + "..."
                    : p.content_preview}
                </span>
              </div>
              <div style={s.rowActions}>
                <span style={s.rowTime}>{formatRelativeTime(p.created_at)}</span>
                <Link href={`/admin/posts/${p.id}`} style={s.linkBtn}>
                  Detail
                </Link>
                <button
                  onClick={() => restoreMut.mutate(p.id)}
                  disabled={restoreMut.isPending}
                  style={s.approveBtn}
                >
                  Restore
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Recent Communities ────────────────────────── */}
      {recent_communities.length > 0 && (
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>
              New Communities (7d)
              <span style={s.badgeNeutral}>{recent_communities.length}</span>
            </h3>
          </div>

          {recent_communities.map((c) => (
            <div key={c.id} style={s.row}>
              <div style={s.rowInfo}>
                <div style={s.rowMain}>
                  <span style={s.rowName}>{c.name}</span>
                  {c.is_deleted && <span style={s.deletedTag}>Deleted</span>}
                </div>
                <span style={s.rowSub}>
                  {c.member_count} {c.member_count === 1 ? "member" : "members"}
                  {c.description && ` · ${c.description.length > 60 ? c.description.slice(0, 60) + "..." : c.description}`}
                </span>
              </div>
              <div style={s.rowActions}>
                <span style={s.rowTime}>{formatRelativeTime(c.created_at)}</span>
                <Link href={`/admin/communities/${c.id}`} style={s.linkBtn}>
                  Detail
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Recent Jobs ──────────────────────────────── */}
      {recent_jobs.length > 0 && (
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>
              New Jobs (7d)
              <span style={s.badgeNeutral}>{recent_jobs.length}</span>
            </h3>
          </div>

          {recent_jobs.map((j) => (
            <div key={j.id} style={s.row}>
              <div style={s.rowInfo}>
                <div style={s.rowMain}>
                  <span style={s.rowName}>{j.title}</span>
                  <JobTypeBadge type={j.job_type} />
                  {!j.is_active && <span style={s.deletedTag}>Inactive</span>}
                </div>
                <span style={s.rowSub}>
                  {j.company_name ?? "No company"} · posted by @{j.author_username}
                </span>
              </div>
              <div style={s.rowActions}>
                <span style={s.rowTime}>{formatRelativeTime(j.created_at)}</span>
                <Link href={`/jobs/${j.id}`} style={s.linkBtn}>
                  View
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/* ── Helper components ──────────────────────────────────────── */

function MethodBadge({ method }: { method: string }) {
  const isEmail = method === "email";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "1px 7px",
        borderRadius: 6,
        background: isEmail ? "#dbeafe" : "#fce7f3",
        color: isEmail ? "#1d4ed8" : "#be185d",
        marginLeft: 6,
      }}
    >
      {isEmail ? "Email" : "Document"}
    </span>
  );
}

function JobTypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    internship: { bg: "#dbeafe", fg: "#1d4ed8" },
    "part-time": { bg: "#fef3c7", fg: "#d97706" },
    "full-time": { bg: "#dcfce7", fg: "#16a34a" },
    freelance: { bg: "#f3e8ff", fg: "#7c3aed" },
  };
  const c = colors[type] ?? { bg: "#f3f4f6", fg: "#6b7280" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "1px 7px",
        borderRadius: 6,
        background: c.bg,
        color: c.fg,
        marginLeft: 6,
        textTransform: "capitalize",
      }}
    >
      {type}
    </span>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const s: Record<string, React.CSSProperties> = {
  section: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    color: "#dc2626",
    background: "#fee2e2",
    borderRadius: 10,
    padding: "2px 8px",
    lineHeight: "18px",
  },
  badgeNeutral: {
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    background: "#f3f4f6",
    borderRadius: 10,
    padding: "2px 8px",
    lineHeight: "18px",
  },

  /* ── Row ─────────────────────────────────────── */
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #f5f5f5",
    flexWrap: "wrap",
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowMain: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1a1a1a",
  },
  rowMeta: {
    fontSize: 13,
    color: "#888",
  },
  rowSub: {
    fontSize: 12,
    color: "#999",
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 420,
  },
  rowActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    flexWrap: "wrap",
  },
  rowTime: {
    fontSize: 12,
    color: "#bbb",
    flexShrink: 0,
  },

  /* ── Buttons ─────────────────────────────────── */
  approveBtn: {
    background: "#dcfce7",
    color: "#16a34a",
    border: "none",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  rejectBtn: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  linkBtn: {
    background: "#f0efff",
    color: "#6C63FF",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
  },
  cancelBtn: {
    background: "#f3f4f6",
    color: "#6b7280",
    border: "none",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* ── Reject inline form ──────────────────────── */
  rejectInline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  rejectInput: {
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    width: 140,
    outline: "none",
  },
  rejectConfirmBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* ── Tags ─────────────────────────────────────── */
  deletedTag: {
    fontSize: 10,
    fontWeight: 600,
    padding: "1px 6px",
    borderRadius: 4,
    background: "#fee2e2",
    color: "#dc2626",
    marginLeft: 4,
  },

  /* ── Empty / Error ───────────────────────────── */
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#333",
    margin: "8px 0 4px",
  },
  emptyHint: {
    fontSize: 14,
    color: "#888",
    margin: 0,
  },
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#c53030",
    fontSize: 14,
    margin: 0,
  },
  retryBtn: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
