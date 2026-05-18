"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listVerifications,
  approveVerification,
  rejectVerification,
} from "@/api/admin";
import type { AdminVerification } from "@/api/admin";
import { formatRelativeTime } from "@/lib/format";

export default function VerificationsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    verification: AdminVerification;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-verifications", page, statusFilter, methodFilter],
    queryFn: () =>
      listVerifications({
        page,
        page_size: 50,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveVerification(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-activity"] });
      setConfirmAction(null);
      setBusyId(null);
      showToast(`${result.username} approved as verified student`);
    },
    onError: (err: { message?: string }) => {
      setBusyId(null);
      showToast(err?.message ?? "Approval failed", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectVerification(id, reason),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-activity"] });
      setConfirmAction(null);
      setRejectReason("");
      setBusyId(null);
      showToast(`${result.username} verification rejected`);
    },
    onError: (err: { message?: string }) => {
      setBusyId(null);
      showToast(err?.message ?? "Rejection failed", "error");
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    setBusyId(confirmAction.verification.id);
    if (confirmAction.action === "approve") {
      approveMutation.mutate(confirmAction.verification.id);
    } else {
      rejectMutation.mutate({
        id: confirmAction.verification.id,
        reason: rejectReason.trim() || undefined,
      });
    }
  };

  const handleCloseModal = () => {
    setConfirmAction(null);
    setRejectReason("");
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "#f59e0b";
      case "verified": return "#22c55e";
      case "rejected": return "#ef4444";
      case "expired": return "#9ca3af";
      case "cancelled": return "#9ca3af";
      default: return "#666";
    }
  };

  const pendingCount = data?.items.filter((v) => v.status === "pending").length ?? 0;

  return (
    <div>
      <div style={styles.topRow}>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">All methods</option>
          <option value="email">Email</option>
          <option value="document">Document</option>
        </select>
        {pendingCount > 0 && (
          <span style={styles.pendingCount}>{pendingCount} pending on this page</span>
        )}
      </div>

      {isLoading && <Skeleton />}

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>
            {(error as { message?: string })?.message ?? "Failed to load verifications"}
          </p>
        </div>
      )}

      {data && (
        <>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Detail</th>
                  <th style={styles.th}>University</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => {
                  const isBusy = busyId === v.id;
                  const isPending = v.status === "pending";
                  return (
                    <tr key={v.id} style={{
                      ...styles.tr,
                      opacity: isBusy ? 0.5 : 1,
                      background: isPending ? "#fffbeb" : undefined,
                    }}>
                      <td style={styles.td}>
                        <div>
                          <span style={styles.username}>{v.username}</span>
                          <span style={styles.fullName}>{v.full_name}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.methodBadge,
                          background: v.verification_method === "email" ? "#eff6ff" : "#fdf4ff",
                          color: v.verification_method === "email" ? "#2563eb" : "#a855f7",
                        }}>
                          {v.verification_method === "email" ? "📧 Email" : "📄 Document"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {v.verification_method === "email" && v.university_email ? (
                          <span style={{ fontSize: 13 }}>{v.university_email}</span>
                        ) : v.verification_method === "document" && v.document_url ? (
                          <a
                            href={v.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.docLink}
                          >
                            View Document
                          </a>
                        ) : (
                          <span style={{ color: "#999", fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={styles.td}>{v.university_name ?? "—"}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          background: statusColor(v.status) + "1a",
                          color: statusColor(v.status),
                        }}>
                          {v.status}
                        </span>
                        {v.status === "rejected" && v.rejection_reason && (
                          <span style={styles.rejectionReason} title={v.rejection_reason}>
                            {v.rejection_reason.length > 30
                              ? v.rejection_reason.slice(0, 30) + "..."
                              : v.rejection_reason}
                          </span>
                        )}
                        {v.verified_at && (
                          <span style={styles.verifiedAt}>
                            {formatRelativeTime(v.verified_at)}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: "#999", fontSize: 13 }}>
                          {formatRelativeTime(v.created_at)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {isPending ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() =>
                                setConfirmAction({ verification: v, action: "approve" })
                              }
                              disabled={isBusy}
                              style={{ ...styles.approveBtn, opacity: isBusy ? 0.5 : 1 }}
                            >
                              {isBusy ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({ verification: v, action: "reject" })
                              }
                              disabled={isBusy}
                              style={{ ...styles.rejectBtn, opacity: isBusy ? 0.5 : 1 }}
                            >
                              {isBusy ? "..." : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span style={styles.doneLabel}>
                            {v.status === "verified" ? "Approved" : v.status === "rejected" ? "Rejected" : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.items.length === 0 && (
              <p style={styles.empty}>No verification requests found.</p>
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
              {confirmAction.action === "approve" ? "Approve Verification" : "Reject Verification"}
            </h3>
            <p style={modalStyles.message}>
              {confirmAction.action === "approve"
                ? `Approve "${confirmAction.verification.username}"? This will mark them as a verified student and link their university.`
                : `Reject "${confirmAction.verification.username}"'s verification request?`}
            </p>
            <div style={modalStyles.detail}>
              <span>Method: {confirmAction.verification.verification_method === "email" ? "📧 Email" : "📄 Document"}</span>
              {confirmAction.verification.university_email && (
                <span>Email: {confirmAction.verification.university_email}</span>
              )}
              {confirmAction.verification.document_url && (
                <span>
                  Document:{" "}
                  <a
                    href={confirmAction.verification.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#6C63FF" }}
                  >
                    View Document
                  </a>
                </span>
              )}
              <span>University: {confirmAction.verification.university_name ?? "—"}</span>
            </div>

            {confirmAction.action === "reject" && (
              <div style={{ marginBottom: 16 }}>
                <label style={modalStyles.reasonLabel}>
                  Rejection reason (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Email domain not recognized, document unclear..."
                  maxLength={500}
                  rows={3}
                  style={modalStyles.reasonInput}
                />
                <span style={modalStyles.charCount}>
                  {rejectReason.length}/500
                </span>
              </div>
            )}

            {(approveMutation.error || rejectMutation.error) && (
              <p style={modalStyles.error}>
                {(approveMutation.error as { message?: string })?.message ??
                  (rejectMutation.error as { message?: string })?.message}
              </p>
            )}
            <div style={modalStyles.buttons}>
              <button
                onClick={handleCloseModal}
                style={modalStyles.cancel}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  ...modalStyles.confirm,
                  background: confirmAction.action === "approve" ? "#22c55e" : "#ef4444",
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {approveMutation.isPending || rejectMutation.isPending
                  ? "Processing..."
                  : confirmAction.action === "approve" ? "Approve" : "Reject"}
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

function Skeleton() {
  return (
    <div style={styles.card}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={styles.skeletonRow}>
          <div className="skeleton" style={{ width: 100, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 180, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 12 }} />
        </div>
      ))}
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  box: { background: "#fff", borderRadius: 12, padding: 24, maxWidth: 460, width: "90%" },
  title: { fontSize: 16, fontWeight: 700, margin: "0 0 8px" },
  message: { fontSize: 14, color: "#555", marginBottom: 12, lineHeight: 1.5 },
  detail: {
    display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#888",
    background: "#f9fafb", padding: "10px 14px", borderRadius: 8, marginBottom: 16,
  },
  reasonLabel: {
    display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6,
  },
  reasonInput: {
    width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8,
    fontSize: 14, resize: "vertical" as const, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box" as const,
  },
  charCount: {
    display: "block", textAlign: "right" as const, fontSize: 11, color: "#bbb", marginTop: 4,
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
  topRow: { display: "flex", gap: 12, alignItems: "center", marginBottom: 16 },
  pendingCount: { fontSize: 13, color: "#f59e0b", fontWeight: 500 },
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
  username: { fontWeight: 600, color: "#1a1a1a", display: "block" },
  fullName: { fontSize: 12, color: "#999" },
  statusBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, textTransform: "capitalize",
  },
  rejectionReason: {
    display: "block", fontSize: 11, color: "#dc2626", marginTop: 3,
    fontStyle: "italic",
  },
  verifiedAt: { display: "block", fontSize: 11, color: "#999", marginTop: 2 },
  approveBtn: {
    border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", background: "#dcfce7", color: "#16a34a",
    transition: "opacity 0.2s",
  },
  rejectBtn: {
    border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", background: "#fee2e2", color: "#dc2626",
    transition: "opacity 0.2s",
  },
  methodBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  docLink: {
    color: "#6C63FF",
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
  },
  doneLabel: { fontSize: 13, color: "#999", fontStyle: "italic" },
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
