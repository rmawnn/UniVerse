"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listReports, updateReportStatus } from "@/api/reports";
import type { AdminReport } from "@/api/reports";
import { formatRelativeTime } from "@/lib/format";

const STATUS_OPTIONS = ["pending", "reviewed", "dismissed", "action_taken"];
const TYPE_OPTIONS = ["post", "comment", "community", "job", "user"];

export default function ReportsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "admin-reports",
      page,
      filterStatus,
      filterType,
    ],
    queryFn: () =>
      listReports({
        page,
        page_size: 30,
        status: filterStatus || undefined,
        target_type: filterType || undefined,
      }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateReportStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
  });

  /* ── Loading ──────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ width: "100%", height: 60, borderRadius: 8 }}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={s.errorBox}>
        <p style={s.errorText}>Failed to load reports.</p>
        <button onClick={() => refetch()} style={s.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {/* ── Filters ──────────────────────────────────────── */}
      <div style={s.filterRow}>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          style={s.select}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          style={s.select}
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        <span style={s.countLabel}>{data.total} report{data.total !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Reports list ─────────────────────────────────── */}
      {data.items.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>No reports</p>
          <p style={s.emptyHint}>
            {filterStatus || filterType
              ? "Try adjusting the filters."
              : "No reports have been submitted yet."}
          </p>
        </div>
      ) : (
        <div style={s.list}>
          {data.items.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              onStatusChange={(status) =>
                statusMut.mutate({ id: r.id, status })
              }
              isPending={statusMut.isPending}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────── */}
      {data.total_pages > 1 && (
        <div style={s.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={s.pageBtn}
          >
            &larr; Prev
          </button>
          <span style={s.pageInfo}>
            Page {data.page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            style={s.pageBtn}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Report Row ────────────────────────────────────────────── */

function ReportRow({
  report,
  onStatusChange,
  isPending,
}: {
  report: AdminReport;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}) {
  const targetLink = getTargetLink(report.target_type, report.target_id);

  return (
    <div style={s.row}>
      <div style={s.rowLeft}>
        <div style={s.rowTop}>
          <TypeBadge type={report.target_type} />
          <StatusBadge status={report.status} />
          <span style={s.rowTime}>{formatRelativeTime(report.created_at)}</span>
        </div>
        <div style={s.rowLabel}>
          {targetLink ? (
            <Link href={targetLink} style={s.targetLink}>
              {report.target_label}
            </Link>
          ) : (
            <span style={s.targetText}>{report.target_label}</span>
          )}
        </div>
        <div style={s.rowReason}>
          <span style={s.reasonLabel}>Reason:</span> {report.reason}
        </div>
        <div style={s.rowReporter}>
          Reported by{" "}
          <Link href={`/admin/users/${report.reporter_id}`} style={s.reporterLink}>
            @{report.reporter_username}
          </Link>
        </div>
      </div>

      {report.status === "pending" && (
        <div style={s.rowActions}>
          <button
            onClick={() => onStatusChange("reviewed")}
            disabled={isPending}
            style={s.reviewedBtn}
          >
            Reviewed
          </button>
          <button
            onClick={() => onStatusChange("action_taken")}
            disabled={isPending}
            style={s.actionBtn}
          >
            Action Taken
          </button>
          <button
            onClick={() => onStatusChange("dismissed")}
            disabled={isPending}
            style={s.dismissBtn}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */

function getTargetLink(type: string, id: string): string | null {
  switch (type) {
    case "post":
      return `/posts/${id}`;
    case "job":
      return `/jobs/${id}`;
    case "user":
      return `/admin/users/${id}`;
    case "community":
      return `/communities/${id}`;
    default:
      return null;
  }
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    post: { bg: "#dbeafe", fg: "#1d4ed8" },
    comment: { bg: "#fef3c7", fg: "#d97706" },
    community: { bg: "#dcfce7", fg: "#16a34a" },
    job: { bg: "#f3e8ff", fg: "#7c3aed" },
    user: { bg: "#fce7f3", fg: "#be185d" },
  };
  const c = colors[type] ?? { bg: "#f3f4f6", fg: "#6b7280" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
        background: c.bg,
        color: c.fg,
        textTransform: "capitalize",
      }}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "#fef3c7", fg: "#d97706" },
    reviewed: { bg: "#dbeafe", fg: "#1d4ed8" },
    dismissed: { bg: "#f3f4f6", fg: "#6b7280" },
    action_taken: { bg: "#dcfce7", fg: "#16a34a" },
  };
  const c = colors[status] ?? { bg: "#f3f4f6", fg: "#6b7280" };
  const label = status.replace("_", " ").replace(/^\w/, (ch) => ch.toUpperCase());
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
        background: c.bg,
        color: c.fg,
      }}
    >
      {label}
    </span>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const s: Record<string, React.CSSProperties> = {
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  select: {
    padding: "7px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 13,
    background: "#fff",
    outline: "none",
    cursor: "pointer",
  },
  countLabel: {
    fontSize: 13,
    color: "#888",
    marginLeft: "auto",
  },

  /* ── List ──────────────────────────── */
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  rowTime: {
    fontSize: 12,
    color: "#bbb",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: "#222",
    marginBottom: 4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 480,
  },
  targetLink: {
    color: "#6C63FF",
    textDecoration: "none",
    fontWeight: 500,
  },
  targetText: {
    color: "#333",
  },
  rowReason: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
    lineHeight: 1.4,
  },
  reasonLabel: {
    fontWeight: 600,
    color: "#888",
  },
  rowReporter: {
    fontSize: 12,
    color: "#999",
  },
  reporterLink: {
    color: "#6C63FF",
    textDecoration: "none",
    fontWeight: 500,
  },

  /* ── Actions ───────────────────────── */
  rowActions: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
    flexWrap: "wrap",
  },
  reviewedBtn: {
    background: "#dbeafe",
    color: "#1d4ed8",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  actionBtn: {
    background: "#dcfce7",
    color: "#16a34a",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  dismissBtn: {
    background: "#f3f4f6",
    color: "#6b7280",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* ── Pagination ────────────────────── */
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  pageBtn: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "#333",
  },
  pageInfo: {
    fontSize: 13,
    color: "#888",
  },

  /* ── Empty / Error ─────────────────── */
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
    margin: "0 0 4px",
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
