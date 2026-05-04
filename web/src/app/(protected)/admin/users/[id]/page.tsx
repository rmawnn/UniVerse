"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserDetail,
  activateUser,
  deactivateUser,
  changeRole,
  verifyUserManually,
} from "@/api/admin";
import type { AdminUserDetail } from "@/api/admin";
import { useAuthStore } from "@/store/auth-store";
import { formatRelativeTime } from "@/lib/format";

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    action: "activate" | "deactivate" | "role" | "verify";
    newRole?: string;
  } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data: user, isLoading, error } = useQuery<AdminUserDetail>({
    queryKey: ["admin-user-detail", id],
    queryFn: () => getUserDetail(id),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const toggleMutation = useMutation({
    mutationFn: () =>
      user?.is_active ? deactivateUser(id) : activateUser(id),
    onSuccess: (result) => {
      invalidateAll();
      setConfirmAction(null);
      showToast(`${result.username} ${result.is_active ? "activated" : "deactivated"}`);
    },
    onError: (err: { message?: string }) =>
      showToast(err?.message ?? "Action failed", "error"),
  });

  const roleMutation = useMutation({
    mutationFn: (role: string) => changeRole(id, role),
    onSuccess: (result) => {
      invalidateAll();
      setConfirmAction(null);
      showToast(`Role changed to ${result.role}`);
    },
    onError: (err: { message?: string }) =>
      showToast(err?.message ?? "Role change failed", "error"),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyUserManually(id),
    onSuccess: (result) => {
      invalidateAll();
      setConfirmAction(null);
      showToast(`${result.username} manually verified`);
    },
    onError: (err: { message?: string }) =>
      showToast(err?.message ?? "Verification failed", "error"),
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === "verify") verifyMutation.mutate();
    else if (confirmAction.action === "role" && confirmAction.newRole)
      roleMutation.mutate(confirmAction.newRole);
    else toggleMutation.mutate();
  };

  const isAnyPending =
    toggleMutation.isPending || roleMutation.isPending || verifyMutation.isPending;

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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: i % 2 === 0 ? 200 : 140, height: 16, borderRadius: 4, marginBottom: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <BackLink />
        <div style={s.errorBox}>
          <p style={s.errorText}>
            {(error as { message?: string })?.message ?? "User not found"}
          </p>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.id === user.id;

  return (
    <div>
      <BackLink />

      {/* ── Header ────────────────────────── */}
      <div style={s.header}>
        <div style={s.avatar}>
          {user.profile_image_url ? (
            <img src={user.profile_image_url} alt="" style={s.avatarImg} />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h2 style={s.name}>{user.full_name}</h2>
          <span style={s.usernameLabel}>@{user.username}</span>
        </div>
      </div>

      {/* ── Info Card ─────────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Profile Information</h3>
        <div style={s.grid}>
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Role">
            <RoleBadge role={user.role} />
          </InfoRow>
          <InfoRow label="Status">
            <StatusPill active={user.is_active} />
          </InfoRow>
          <InfoRow label="Verified Student">
            {user.is_verified_student ? (
              <span style={s.verifiedBadge}>Verified</span>
            ) : (
              <span style={{ color: "#999" }}>No</span>
            )}
          </InfoRow>
          <InfoRow label="University" value={user.university_name ?? "—"} />
          {user.department && <InfoRow label="Department" value={user.department} />}
          {user.academic_year && (
            <InfoRow label="Academic Year" value={`Year ${user.academic_year}`} />
          )}
          <InfoRow label="Joined" value={formatRelativeTime(user.created_at)} />
          {user.bio && <InfoRow label="Bio" value={user.bio} />}
        </div>
      </div>

      {/* ── Actions ───────────────────────── */}
      {!isSelf && (
        <div style={s.card}>
          <h3 style={s.sectionTitle}>Actions</h3>
          <div style={s.actions}>
            <button
              onClick={() =>
                setConfirmAction({
                  action: user.is_active ? "deactivate" : "activate",
                })
              }
              disabled={isAnyPending}
              style={{
                ...s.actionBtn,
                background: user.is_active ? "#fee2e2" : "#dcfce7",
                color: user.is_active ? "#dc2626" : "#16a34a",
              }}
            >
              {user.is_active ? "Deactivate" : "Activate"}
            </button>

            {!user.is_verified_student && (
              <button
                onClick={() => setConfirmAction({ action: "verify" })}
                disabled={isAnyPending}
                style={{ ...s.actionBtn, background: "#dbeafe", color: "#2563eb" }}
              >
                Verify Manually
              </button>
            )}

            <div style={s.roleRow}>
              <span style={s.roleLabel}>Change role:</span>
              <select
                value={user.role}
                onChange={(e) => {
                  if (e.target.value !== user.role) {
                    setConfirmAction({ action: "role", newRole: e.target.value });
                  }
                }}
                disabled={isAnyPending}
                style={s.roleSelect}
              >
                <option value="student">student</option>
                <option value="moderator">moderator</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Communities ───────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>
          Communities ({user.communities.length})
        </h3>
        {user.communities.length === 0 ? (
          <p style={s.empty}>No communities joined.</p>
        ) : (
          <div style={s.listGrid}>
            {user.communities.map((c) => (
              <Link
                key={c.id}
                href={`/admin/communities/${c.id}`}
                style={s.listItem}
              >
                <span style={s.listItemName}>{c.name}</span>
                <span style={s.arrow}>&rarr;</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Posts ──────────────────── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>
          Recent Posts ({user.recent_posts.length})
        </h3>
        {user.recent_posts.length === 0 ? (
          <p style={s.empty}>No posts yet.</p>
        ) : (
          <div style={s.listGrid}>
            {user.recent_posts.map((p) => (
              <Link
                key={p.id}
                href={`/admin/posts/${p.id}`}
                style={{
                  ...s.listItem,
                  opacity: p.is_deleted ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={s.postPreview}>{p.content_preview || "—"}</span>
                  <span style={s.postMeta}>
                    {formatRelativeTime(p.created_at)}
                    {p.is_deleted && " · Hidden"}
                  </span>
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
              {confirmAction.action === "role"
                ? "Change Role"
                : confirmAction.action === "verify"
                ? "Verify User"
                : confirmAction.action === "deactivate"
                ? "Deactivate User"
                : "Activate User"}
            </h3>
            <p style={modalS.message}>
              {confirmAction.action === "role"
                ? `Change "${user.username}" role from "${user.role}" to "${confirmAction.newRole}"?`
                : confirmAction.action === "verify"
                ? `Manually verify "${user.username}" as a student? This bypasses the email verification flow.`
                : confirmAction.action === "deactivate"
                ? `Deactivate "${user.username}"? They will be unable to log in.`
                : `Activate "${user.username}"? They will be able to log in again.`}
            </p>
            <div style={modalS.buttons}>
              <button onClick={() => setConfirmAction(null)} style={modalS.cancel} disabled={isAnyPending}>
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  ...modalS.confirm,
                  background:
                    confirmAction.action === "deactivate" ? "#ef4444"
                    : confirmAction.action === "verify" ? "#2563eb"
                    : "#6C63FF",
                }}
                disabled={isAnyPending}
              >
                {isAnyPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────── */}
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

/* ── Helpers ──────────────────────────────────── */

function BackLink() {
  return (
    <Link href="/admin" style={s.backLink}>
      &larr; Back to Admin
    </Link>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      {children ?? <span style={s.infoValue}>{value}</span>}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { bg: string; fg: string }> = {
    admin: { bg: "#ede9fe", fg: "#7c3aed" },
    moderator: { bg: "#dbeafe", fg: "#2563eb" },
    student: { bg: "#f3f4f6", fg: "#6b7280" },
  };
  const c = config[role] ?? config.student;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg,
    }}>
      {role}
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 600,
      background: active ? "#dcfce7" : "#fee2e2",
      color: active ? "#16a34a" : "#dc2626",
    }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ── Styles ───────────────────────────────────── */

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
    display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
  },
  avatar: {
    width: 56, height: 56, borderRadius: "50%", background: "#6C63FF",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, fontWeight: 700, flexShrink: 0, overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  name: { fontSize: 20, fontWeight: 700, margin: 0, color: "#1a1a1a" },
  usernameLabel: { fontSize: 14, color: "#888" },
  card: {
    background: "#fff", border: "1px solid #eee", borderRadius: 12,
    padding: 20, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "#1a1a1a" },
  grid: { display: "flex", flexDirection: "column", gap: 10 },
  infoRow: { display: "flex", alignItems: "center", gap: 12 },
  infoLabel: { fontSize: 13, color: "#888", fontWeight: 500, minWidth: 130 },
  infoValue: { fontSize: 14, color: "#1a1a1a" },
  verifiedBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#16a34a",
  },
  actions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  actionBtn: {
    border: "none", borderRadius: 8, padding: "8px 18px",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  roleRow: { display: "flex", alignItems: "center", gap: 8 },
  roleLabel: { fontSize: 13, color: "#888" },
  roleSelect: {
    padding: "6px 10px", fontSize: 13, border: "1px solid #ddd",
    borderRadius: 6, background: "#fff", cursor: "pointer",
  },
  listGrid: { display: "flex", flexDirection: "column", gap: 0 },
  listItem: {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
    borderBottom: "1px solid #f5f5f5", textDecoration: "none", color: "inherit",
  },
  listItemName: { fontSize: 14, fontWeight: 600, color: "#1a1a1a" },
  arrow: { color: "#ccc", fontSize: 14 },
  postPreview: { fontSize: 13, color: "#444", display: "block" },
  postMeta: { fontSize: 12, color: "#999", display: "block", marginTop: 2 },
  empty: { textAlign: "center", padding: "20px 0", color: "#ccc", fontSize: 13 },
  errorBox: { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 12, padding: 20 },
  errorText: { color: "#c53030", fontSize: 14, margin: 0 },
};
