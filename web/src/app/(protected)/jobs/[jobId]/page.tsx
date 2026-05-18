"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getJob, applyToJob, deleteJob, listJobApplications, getJobStats, getJobActivity, saveJob, unsaveJob, updateApplicationStatus } from "@/api/jobs";
import { useAuthStore } from "@/store/auth-store";
import type {
  JobPostResponse,
  JobApplicationResponse,
  JobActivityEvent,
  JobStatsResponse,
  PaginatedResponse,
} from "@/types/api";

const JOB_TYPE_LABELS: Record<string, string> = {
  internship: "Internship",
  "part-time": "Part-time",
  "full-time": "Full-time",
  freelance: "Freelance",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  internship: "#6C63FF",
  "part-time": "#0891b2",
  "full-time": "#059669",
  freelance: "#d97706",
};

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [showApply, setShowApply] = useState(false);
  const [message, setMessage] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const {
    data: job,
    isLoading,
    isError,
    refetch,
  } = useQuery<JobPostResponse>({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
  });

  const isOwner = user?.id === job?.author.id;

  // ── Applications (owner only) ───────────────────────────
  const {
    data: appsData,
    isLoading: appsLoading,
  } = useQuery<PaginatedResponse<JobApplicationResponse>>({
    queryKey: ["job-applications", jobId],
    queryFn: () => listJobApplications(jobId, { page: 1, page_size: 50 }),
    enabled: isOwner,
  });

  const applications = appsData?.items ?? [];

  // ── Stats (owner only) ─────────────────────────────────
  const { data: stats } = useQuery<JobStatsResponse>({
    queryKey: ["job-stats", jobId],
    queryFn: () => getJobStats(jobId),
    enabled: isOwner,
  });

  // ── Activity timeline (owner only) ────────────────────
  const { data: activity } = useQuery<JobActivityEvent[]>({
    queryKey: ["job-activity", jobId],
    queryFn: () => getJobActivity(jobId),
    enabled: isOwner,
  });

  // ── Apply mutation ──────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: () => applyToJob(jobId, { message: message || undefined }),
    onSuccess: () => {
      setApplied(true);
      setShowApply(false);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (err: { message?: string }) => {
      setApplyError(err?.message ?? "Failed to apply");
    },
  });

  // ── Status mutation ─────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: "accepted" | "rejected" }) =>
      updateApplicationStatus(appId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications", jobId] });
      qc.invalidateQueries({ queryKey: ["job-stats", jobId] });
      qc.invalidateQueries({ queryKey: ["job-activity", jobId] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });

  // ── Delete mutation ─────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteJob(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      router.push("/jobs");
    },
  });

  // ── Save mutation ────────────────────────────────────────
  // Track optimistic override separately; null = use server value
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const saved = savedOverride ?? job?.saved_by_me ?? false;

  const saveMutation = useMutation({
    mutationFn: () => (saved ? unsaveJob(jobId) : saveJob(jobId)),
    onMutate: () => setSavedOverride(!saved),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      setSavedOverride(null); // reset to server value on next render
    },
    onError: () => setSavedOverride(null),
  });

  const hasApplied = applied || (job?.has_applied ?? false);

  // ── Loading ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <div style={styles.backRow}>
          <Link href="/jobs" style={styles.backLink}>
            &larr; Jobs
          </Link>
        </div>
        <div style={styles.skeletonTitle} />
        <div style={styles.skeletonBody} />
        <div style={styles.skeletonBody} />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div>
        <div style={styles.backRow}>
          <Link href="/jobs" style={styles.backLink}>
            &larr; Jobs
          </Link>
        </div>
        <div style={styles.error}>
          <span>Could not load this job.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.backRow}>
        <Link href="/jobs" style={styles.backLink}>
          &larr; Jobs
        </Link>
      </div>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={styles.detailCard}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{job.title}</h1>
          <span
            style={{
              ...styles.typeBadge,
              background:
                (JOB_TYPE_COLORS[job.job_type] ?? "#666") + "14",
              color: JOB_TYPE_COLORS[job.job_type] ?? "#666",
            }}
          >
            {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
          </span>
        </div>

        <div style={styles.meta}>
          {job.company_name && (
            <span style={styles.metaItem}>🏢 {job.company_name}</span>
          )}
          {job.location && (
            <span style={styles.metaItem}>📍 {job.location}</span>
          )}
          <span style={styles.metaItem}>
            📅 {new Date(job.created_at).toLocaleDateString()}
          </span>
        </div>

        <div style={styles.authorRow}>
          <Link
            href={`/profile/${job.author.id}`}
            style={styles.authorLink}
          >
            <div style={styles.avatar}>
              {job.author.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={styles.authorName}>{job.author.full_name}</div>
              <div style={styles.authorHandle}>@{job.author.username}</div>
            </div>
          </Link>
        </div>

        <div style={styles.divider} />

        <div style={styles.description}>
          {job.description.split("\n").map((line, i) => (
            <p key={i} style={styles.descParagraph}>
              {line || " "}
            </p>
          ))}
        </div>

        {/* ── Actions ──────────────────────────────────── */}
        <div style={styles.actions}>
          {isOwner ? (
            <button
              onClick={() => {
                if (confirm("Delete this job post?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              style={styles.deleteBtn}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Job"}
            </button>
          ) : hasApplied ? (
            <div style={styles.appliedBadge}>
              ✓ Application Submitted
            </div>
          ) : !job.is_active ? (
            <div style={styles.closedBadge}>
              This position is closed
            </div>
          ) : (
            <button
              onClick={() => setShowApply(!showApply)}
              style={styles.applyBtn}
            >
              {showApply ? "Cancel" : "Apply Now"}
            </button>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            style={{
              ...styles.saveToggleBtn,
              background: saved ? "#f0efff" : "#fafafa",
              color: saved ? "#6C63FF" : "#666",
              borderColor: saved ? "#6C63FF" : "#ddd",
            }}
          >
            {saved ? "🔖 Saved" : "📑 Save"}
          </button>
        </div>

        {/* ── Apply form ───────────────────────────────── */}
        {showApply && !hasApplied && (
          <div style={styles.applyForm}>
            {applyError && (
              <p style={styles.formError}>{applyError}</p>
            )}
            <label style={styles.label}>
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself, share relevant experience..."
              style={styles.textarea}
              maxLength={2000}
              rows={3}
            />
            <button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              style={{
                ...styles.submitBtn,
                opacity: applyMutation.isPending ? 0.6 : 1,
              }}
            >
              {applyMutation.isPending
                ? "Submitting..."
                : "Submit Application"}
            </button>
          </div>
        )}

        {/* ── Applied success ──────────────────────────── */}
        {applied && (
          <div style={styles.successBox}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <p style={styles.successText}>
              Your application has been submitted successfully!
            </p>
          </div>
        )}
      </div>

      {/* ── Stats dashboard (owner view) ─────────────────── */}
      {isOwner && stats && (
        <div style={styles.statsSection}>
          <h3 style={styles.sectionTitle}>Dashboard</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.total_applications}</span>
              <span style={styles.statLabel}>Total</span>
            </div>
            <div style={{ ...styles.statCard, borderLeftColor: "#6C63FF" }}>
              <span style={{ ...styles.statValue, color: "#6C63FF" }}>
                {stats.pending_count}
              </span>
              <span style={styles.statLabel}>Pending</span>
            </div>
            <div style={{ ...styles.statCard, borderLeftColor: "#059669" }}>
              <span style={{ ...styles.statValue, color: "#059669" }}>
                {stats.accepted_count}
              </span>
              <span style={styles.statLabel}>Accepted</span>
            </div>
            <div style={{ ...styles.statCard, borderLeftColor: "#dc2626" }}>
              <span style={{ ...styles.statValue, color: "#dc2626" }}>
                {stats.rejected_count}
              </span>
              <span style={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* ── Simple bar chart ────────────────────────── */}
          {stats.total_applications > 0 && (
            <div style={styles.chartWrap}>
              <div style={styles.chartBar}>
                {stats.accepted_count > 0 && (
                  <div
                    style={{
                      ...styles.chartSegment,
                      background: "#059669",
                      width: `${(stats.accepted_count / stats.total_applications) * 100}%`,
                    }}
                    title={`Accepted: ${stats.accepted_count}`}
                  />
                )}
                {stats.pending_count > 0 && (
                  <div
                    style={{
                      ...styles.chartSegment,
                      background: "#6C63FF",
                      width: `${(stats.pending_count / stats.total_applications) * 100}%`,
                    }}
                    title={`Pending: ${stats.pending_count}`}
                  />
                )}
                {stats.rejected_count > 0 && (
                  <div
                    style={{
                      ...styles.chartSegment,
                      background: "#dc2626",
                      width: `${(stats.rejected_count / stats.total_applications) * 100}%`,
                    }}
                    title={`Rejected: ${stats.rejected_count}`}
                  />
                )}
              </div>
              <div style={styles.chartLegend}>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: "#059669" }} />
                  Accepted
                </span>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: "#6C63FF" }} />
                  Pending
                </span>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: "#dc2626" }} />
                  Rejected
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Activity timeline (owner view) ─────────────── */}
      {isOwner && activity && activity.length > 0 && (
        <div style={styles.timelineSection}>
          <h3 style={styles.sectionTitle}>Activity Timeline</h3>
          <div style={styles.timeline}>
            {activity.map((event, idx) => {
              const isLast = idx === activity.length - 1;
              const icon =
                event.event_type === "applied"
                  ? "📋"
                  : event.event_type === "accepted"
                  ? "✅"
                  : "❌";
              const label =
                event.event_type === "applied"
                  ? `${event.user.full_name} applied`
                  : event.event_type === "accepted"
                  ? `${event.user.full_name} accepted`
                  : `${event.user.full_name} rejected`;
              const dotColor =
                event.event_type === "applied"
                  ? "#6C63FF"
                  : event.event_type === "accepted"
                  ? "#059669"
                  : "#dc2626";

              return (
                <div key={`${event.event_type}-${event.user.id}-${event.timestamp}`} style={styles.timelineItem}>
                  <div style={styles.timelineLine}>
                    <div
                      style={{
                        ...styles.timelineDot,
                        background: dotColor,
                      }}
                    />
                    {!isLast && <div style={styles.timelineConnector} />}
                  </div>
                  <div style={styles.timelineContent}>
                    <div style={styles.timelineLabel}>
                      <span style={{ marginRight: 6 }}>{icon}</span>
                      <span>{label}</span>
                    </div>
                    <span style={styles.timelineDate}>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Applications (owner view) ──────────────────── */}
      {isOwner && (
        <div style={styles.applicationsSection}>
          <h3 style={styles.sectionTitle}>
            Applications ({job.application_count})
          </h3>

          {appsLoading && (
            <p style={{ color: "#999", fontSize: 14 }}>Loading...</p>
          )}

          {!appsLoading && applications.length === 0 && (
            <p style={styles.noApps}>No applications yet.</p>
          )}

          {!appsLoading && applications.length > 0 && (
            <div style={styles.appList}>
              {applications.map((app) => (
                <div key={app.id} style={styles.appCard}>
                  <div style={styles.appCardHeader}>
                    <Link
                      href={`/profile/${app.applicant.id}`}
                      style={styles.appUserLink}
                    >
                      <div style={styles.appAvatar}>
                        {app.applicant.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={styles.appName}>
                          {app.applicant.full_name}
                        </div>
                        <div style={styles.appHandle}>
                          @{app.applicant.username}
                        </div>
                      </div>
                    </Link>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background:
                          app.status === "accepted"
                            ? "#ecfdf5"
                            : app.status === "rejected"
                            ? "#fff5f5"
                            : "#f5f3ff",
                        color:
                          app.status === "accepted"
                            ? "#059669"
                            : app.status === "rejected"
                            ? "#dc2626"
                            : "#6C63FF",
                      }}
                    >
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                  {app.message && (
                    <p style={styles.appMessage}>{app.message}</p>
                  )}
                  <div style={styles.appFooter}>
                    <p style={styles.appDate}>
                      Applied{" "}
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                    {app.status === "pending" && (
                      <div style={styles.statusActions}>
                        <button
                          onClick={() =>
                            statusMutation.mutate({
                              appId: app.id,
                              status: "accepted",
                            })
                          }
                          disabled={statusMutation.isPending}
                          style={styles.acceptBtn}
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() =>
                            statusMutation.mutate({
                              appId: app.id,
                              status: "rejected",
                            })
                          }
                          disabled={statusMutation.isPending}
                          style={styles.rejectBtn}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  backRow: { marginBottom: 16 },
  backLink: {
    color: "#6C63FF",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
  },

  /* ── Detail card ────────────────────────── */
  detailCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: "#111",
  },
  typeBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 20,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    fontSize: 14,
    color: "#666",
  },
  authorRow: { marginBottom: 16 },
  authorLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "inherit",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  authorName: { fontSize: 14, fontWeight: 600, color: "#111" },
  authorHandle: { fontSize: 12, color: "#999" },
  divider: {
    height: 1,
    background: "#f0f0f0",
    margin: "0 0 16px",
  },
  description: { marginBottom: 20 },
  descParagraph: {
    fontSize: 15,
    color: "#333",
    lineHeight: 1.7,
    margin: "0 0 6px",
  },

  /* ── Actions ────────────────────────────── */
  actions: { display: "flex", gap: 12 },
  applyBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#fff",
    color: "#ef4444",
    border: "1px solid #ef4444",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  appliedBadge: {
    background: "#ecfdf5",
    color: "#059669",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  closedBadge: {
    background: "#fafafa",
    color: "#999",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
  },

  saveToggleBtn: {
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },

  /* ── Apply form ─────────────────────────── */
  applyForm: {
    marginTop: 16,
    padding: 16,
    background: "#fafafa",
    borderRadius: 8,
    border: "1px solid #eee",
  },
  formError: {
    background: "#fff5f5",
    color: "#c53030",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#555",
    marginBottom: 4,
  },
  textarea: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    marginBottom: 12,
  },
  submitBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* ── Success ────────────────────────────── */
  successBox: {
    marginTop: 16,
    padding: 16,
    background: "#ecfdf5",
    border: "1px solid #d1fae5",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  successText: {
    color: "#059669",
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
  },

  /* ── Stats dashboard ────────────────────── */
  statsSection: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "#fafafa",
    borderRadius: 10,
    padding: "16px 14px",
    textAlign: "center",
    borderLeftWidth: 3,
    borderLeftStyle: "solid" as const,
    borderLeftColor: "#333",
  },
  statValue: {
    display: "block",
    fontSize: 28,
    fontWeight: 700,
    color: "#333",
    lineHeight: 1.2,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  chartWrap: {
    marginTop: 4,
  },
  chartBar: {
    display: "flex",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    background: "#f0f0f0",
    marginBottom: 8,
  },
  chartSegment: {
    height: "100%",
    transition: "width 0.3s",
  },
  chartLegend: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    color: "#666",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },

  /* ── Activity timeline ──────────────────── */
  timelineSection: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
  },
  timelineItem: {
    display: "flex",
    gap: 14,
    minHeight: 48,
  },
  timelineLine: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 16,
    flexShrink: 0,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 3,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    background: "#e5e5e5",
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: "#222",
    display: "flex",
    alignItems: "center",
    lineHeight: 1.3,
  },
  timelineDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
    display: "block",
  },

  /* ── Applications section ───────────────── */
  applicationsSection: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 16px",
    color: "#111",
  },
  noApps: {
    color: "#999",
    fontSize: 14,
    margin: 0,
  },
  appList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  appCard: {
    background: "#fafafa",
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 16,
  },
  appCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  appUserLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "inherit",
  },
  appAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  appName: { fontSize: 14, fontWeight: 600, color: "#111" },
  appHandle: { fontSize: 12, color: "#999" },
  appMessage: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.6,
    margin: "8px 0",
    paddingLeft: 12,
    borderLeft: "2px solid #e0e0e0",
  },
  appDate: {
    fontSize: 12,
    color: "#999",
    margin: 0,
  },
  appFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 20,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  statusActions: {
    display: "flex",
    gap: 8,
  },
  acceptBtn: {
    background: "#ecfdf5",
    color: "#059669",
    border: "1px solid #d1fae5",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  rejectBtn: {
    background: "#fff5f5",
    color: "#dc2626",
    border: "1px solid #fed7d7",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* ── States ─────────────────────────────── */
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  retry: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  skeletonTitle: {
    height: 28,
    width: "60%",
    borderRadius: 6,
    background: "#f0f0f0",
    marginBottom: 16,
  },
  skeletonBody: {
    height: 16,
    width: "100%",
    borderRadius: 6,
    background: "#f0f0f0",
    marginBottom: 10,
  },
};
