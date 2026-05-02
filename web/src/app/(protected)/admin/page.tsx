"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { listUsers, activateUser, deactivateUser } from "@/api/admin";
import type { AdminUser } from "@/api/admin";

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => listUsers(page, pageSize),
    enabled: user?.role === "admin",
  });

  const toggleMutation = useMutation({
    mutationFn: (u: AdminUser) =>
      u.is_active ? deactivateUser(u.id) : activateUser(u.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  if (user?.role !== "admin") {
    return (
      <div style={styles.denied}>
        <p style={styles.deniedText}>Admin access required.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.heading}>User Management</h2>

      {isLoading && (
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
      )}

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
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.username}>{u.username}</span>
                      {u.role === "admin" && (
                        <span style={styles.adminBadge}>admin</span>
                      )}
                    </td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusDot,
                          background: u.is_active ? "#22c55e" : "#ef4444",
                        }}
                      />
                      {u.is_active ? "Active" : "Inactive"}
                    </td>
                    <td style={styles.td}>
                      {u.is_verified_student ? (
                        <span style={styles.verified}>Yes</span>
                      ) : (
                        <span style={styles.unverified}>No</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {u.id === user.id ? (
                        <span style={styles.youLabel}>You</span>
                      ) : (
                        <button
                          onClick={() => toggleMutation.mutate(u)}
                          disabled={toggleMutation.isPending}
                          style={{
                            ...styles.actionBtn,
                            background: u.is_active ? "#fee2e2" : "#dcfce7",
                            color: u.is_active ? "#dc2626" : "#16a34a",
                            opacity: toggleMutation.isPending ? 0.5 : 1,
                          }}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.items.length === 0 && (
              <p style={styles.empty}>No users found.</p>
            )}
          </div>

          {data.total_pages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  ...styles.pageBtn,
                  opacity: page === 1 ? 0.4 : 1,
                }}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {page} of {data.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                style={{
                  ...styles.pageBtn,
                  opacity: page === data.total_pages ? 0.4 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {toggleMutation.isError && (
        <div style={styles.toastError}>
          {(toggleMutation.error as { message?: string })?.message ??
            "Action failed"}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontWeight: 600,
    color: "#666",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: "1px solid #eee",
    background: "#fafafa",
  },
  tr: {
    borderBottom: "1px solid #f5f5f5",
  },
  td: {
    padding: "12px 16px",
    verticalAlign: "middle",
  },
  username: {
    fontWeight: 600,
    color: "#1a1a1a",
  },
  adminBadge: {
    display: "inline-block",
    marginLeft: 8,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    background: "#ede9fe",
    color: "#7c3aed",
    borderRadius: 10,
  },
  statusDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    marginRight: 6,
  },
  verified: { color: "#16a34a", fontWeight: 500 },
  unverified: { color: "#999" },
  actionBtn: {
    border: "none",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  youLabel: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
  pageBtn: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    cursor: "pointer",
  },
  pageInfo: {
    fontSize: 14,
    color: "#666",
  },
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 12,
    padding: 20,
  },
  errorText: {
    color: "#c53030",
    fontSize: 14,
    margin: 0,
  },
  skeletonRow: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    padding: "14px 16px",
    borderBottom: "1px solid #f5f5f5",
  },
  denied: {
    textAlign: "center",
    padding: "64px 24px",
  },
  deniedText: {
    fontSize: 16,
    color: "#999",
  },
  empty: {
    textAlign: "center",
    padding: 32,
    color: "#999",
    fontSize: 14,
  },
  toastError: {
    position: "fixed",
    bottom: 24,
    right: 24,
    background: "#c53030",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    zIndex: 1000,
  },
};
