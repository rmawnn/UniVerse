"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, activateUser, deactivateUser, changeRole, verifyUserManually } from "@/api/admin";
import type { AdminUser } from "@/api/admin";
import { formatRelativeTime } from "@/lib/format";

export default function UsersTab({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [filterVerified, setFilterVerified] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    user: AdminUser;
    action: "activate" | "deactivate" | "role" | "verify";
    newRole?: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const isActive = filterActive === "" ? undefined : filterActive === "true";
  const isVerified = filterVerified === "" ? undefined : filterVerified === "true";

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", page, debouncedSearch, filterActive, filterVerified, filterRole],
    queryFn: () =>
      listUsers({
        page,
        page_size: 50,
        search: debouncedSearch || undefined,
        is_active: isActive,
        is_verified: isVerified,
        role: filterRole || undefined,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: (u: AdminUser) =>
      u.is_active ? deactivateUser(u.id) : activateUser(u.id),
    onSuccess: (_, u) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      setBusyId(null);
      showToast(`${u.username} ${u.is_active ? "deactivated" : "activated"}`);
    },
    onError: (err: { message?: string }) => {
      setBusyId(null);
      showToast(err?.message ?? "Action failed", "error");
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      changeRole(userId, role),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      setBusyId(null);
      showToast(`${result.username} role changed to ${result.role}`);
    },
    onError: (err: { message?: string }) => {
      setBusyId(null);
      showToast(err?.message ?? "Role change failed", "error");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (userId: string) => verifyUserManually(userId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      setBusyId(null);
      showToast(`${result.username} manually verified`);
    },
    onError: (err: { message?: string }) => {
      setBusyId(null);
      showToast(err?.message ?? "Verification failed", "error");
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    setBusyId(confirmAction.user.id);
    if (confirmAction.action === "verify") {
      verifyMutation.mutate(confirmAction.user.id);
    } else if (confirmAction.action === "role" && confirmAction.newRole) {
      roleMutation.mutate({ userId: confirmAction.user.id, role: confirmAction.newRole });
    } else {
      toggleMutation.mutate(confirmAction.user);
    }
  };

  const activeCount = data?.items.filter((u) => u.is_active).length ?? 0;
  const totalCount = data?.total ?? 0;

  return (
    <div>
      <div style={styles.statsRow}>
        <span style={styles.stat}>{totalCount} total users</span>
        <span style={styles.statDot} />
        <span style={styles.stat}>{activeCount} active on this page</span>
      </div>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search username, email, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={filterActive}
          onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={filterVerified}
          onChange={(e) => { setFilterVerified(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">All verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {isLoading && <TableSkeleton />}

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>
            {(error as { message?: string })?.message ?? "Failed to load users"}
          </p>
        </div>
      )}

      {data && (
        <>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Verified</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isBusy = busyId === u.id;
                  return (
                    <tr key={u.id} style={{ ...styles.tr, opacity: isBusy ? 0.5 : 1 }}>
                      <td style={styles.td}>
                        <Link href={`/admin/users/${u.id}`} style={styles.usernameLink}>
                          {u.username}
                        </Link>
                        <RoleBadge role={u.role} />
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: "#555" }}>{u.email}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusPill,
                          background: u.is_active ? "#dcfce7" : "#fee2e2",
                          color: u.is_active ? "#16a34a" : "#dc2626",
                        }}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {u.is_verified_student ? (
                          <span style={styles.verifiedBadge}>Verified</span>
                        ) : (
                          <span style={{ color: "#999", fontSize: 13 }}>No</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: "#999", fontSize: 13 }}>
                          {formatRelativeTime(u.created_at)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {u.id === currentUserId ? (
                          <span style={styles.youLabel}>You</span>
                        ) : (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  user: u,
                                  action: u.is_active ? "deactivate" : "activate",
                                })
                              }
                              disabled={isBusy}
                              style={{
                                ...styles.actionBtn,
                                background: u.is_active ? "#fee2e2" : "#dcfce7",
                                color: u.is_active ? "#dc2626" : "#16a34a",
                                opacity: isBusy ? 0.5 : 1,
                              }}
                            >
                              {isBusy ? "..." : u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            {!u.is_verified_student && (
                              <button
                                onClick={() =>
                                  setConfirmAction({ user: u, action: "verify" })
                                }
                                disabled={isBusy}
                                style={{
                                  ...styles.actionBtn,
                                  background: "#dbeafe",
                                  color: "#2563eb",
                                  opacity: isBusy ? 0.5 : 1,
                                }}
                              >
                                {isBusy ? "..." : "Verify"}
                              </button>
                            )}
                            <select
                              value={u.role}
                              onChange={(e) => {
                                if (e.target.value === u.role) return;
                                setConfirmAction({
                                  user: u,
                                  action: "role",
                                  newRole: e.target.value,
                                });
                              }}
                              disabled={isBusy}
                              style={styles.roleSelect}
                            >
                              <option value="student">student</option>
                              <option value="moderator">moderator</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.items.length === 0 && <p style={styles.empty}>No users found.</p>}
          </div>
          <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
        </>
      )}

      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.action === "role"
              ? "Change Role"
              : confirmAction.action === "deactivate"
              ? "Deactivate User"
              : confirmAction.action === "verify"
              ? "Verify User"
              : "Activate User"
          }
          message={
            confirmAction.action === "role"
              ? `Change "${confirmAction.user.username}" role from "${confirmAction.user.role}" to "${confirmAction.newRole}"?`
              : confirmAction.action === "deactivate"
              ? `Deactivate "${confirmAction.user.username}"? They will be unable to log in.`
              : confirmAction.action === "verify"
              ? `Manually verify "${confirmAction.user.username}" as a student? This bypasses the email verification flow.`
              : `Activate "${confirmAction.user.username}"? They will be able to log in again.`
          }
          confirmLabel={
            confirmAction.action === "role" ? "Change Role"
              : confirmAction.action === "deactivate" ? "Deactivate"
              : confirmAction.action === "verify" ? "Verify"
              : "Activate"
          }
          confirmColor={confirmAction.action === "deactivate" ? "#ef4444" : confirmAction.action === "verify" ? "#2563eb" : "#6C63FF"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
          loading={toggleMutation.isPending || roleMutation.isPending || verifyMutation.isPending}
          error={
            (toggleMutation.error as { message?: string })?.message ??
            (roleMutation.error as { message?: string })?.message ??
            (verifyMutation.error as { message?: string })?.message ??
            null
          }
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
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
    <span style={{ ...badgeStyle, background: c.bg, color: c.fg }}>
      {role}
    </span>
  );
}

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 8,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 10,
};

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      background: type === "success" ? "#22c55e" : "#ef4444",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      zIndex: 1100,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    }}>
      {message}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={styles.card}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={styles.skeletonRow}>
          <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 180, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 60, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 70, height: 28, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

function Pagination({
  page, totalPages, onPageChange,
}: {
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div style={styles.pagination}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ ...styles.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
      >
        Previous
      </button>
      <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{ ...styles.pageBtn, opacity: page === totalPages ? 0.4 : 1 }}
      >
        Next
      </button>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, confirmColor, onConfirm, onCancel, loading, error,
}: {
  title: string; message: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean; error: string | null;
}) {
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.box}>
        <h3 style={modalStyles.title}>{title}</h3>
        <p style={modalStyles.message}>{message}</p>
        {error && <p style={modalStyles.error}>{error}</p>}
        <div style={modalStyles.buttons}>
          <button onClick={onCancel} style={modalStyles.cancel} disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ ...modalStyles.confirm, background: confirmColor }}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
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
  message: { fontSize: 14, color: "#555", marginBottom: 16, lineHeight: 1.5 },
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
  statsRow: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
  },
  stat: { fontSize: 13, color: "#999" },
  statDot: {
    width: 4, height: 4, borderRadius: "50%", background: "#ddd",
  },
  filters: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  searchInput: {
    flex: 1, minWidth: 200, padding: "10px 14px",
    border: "1px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none",
  },
  select: {
    padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8,
    fontSize: 14, background: "#fff", cursor: "pointer",
  },
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#666",
    fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: "1px solid #eee", background: "#fafafa",
  },
  tr: { borderBottom: "1px solid #f5f5f5", transition: "opacity 0.2s" },
  td: { padding: "12px 16px", verticalAlign: "middle" },
  username: { fontWeight: 600, color: "#1a1a1a" },
  usernameLink: { fontWeight: 600, color: "#6C63FF", textDecoration: "none" },
  statusPill: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600,
  },
  verifiedBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#16a34a",
  },
  actionBtn: {
    border: "none", borderRadius: 6, padding: "6px 14px",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s",
  },
  roleSelect: {
    padding: "5px 8px", fontSize: 12, border: "1px solid #ddd",
    borderRadius: 6, background: "#fff", cursor: "pointer",
  },
  youLabel: { fontSize: 13, color: "#999", fontStyle: "italic" },
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
