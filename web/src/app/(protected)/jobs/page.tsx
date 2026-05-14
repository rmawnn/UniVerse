"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { listJobs, createJob, listMyApplications } from "@/api/jobs";
import type {
  CreateJobRequest,
  JobPostResponse,
  PaginatedResponse,
  MyApplicationResponse,
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

export default function JobsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"browse" | "my-applications">("browse");

  // ── Browse jobs ─────────────────────────────────────────
  const {
    data: jobsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<PaginatedResponse<JobPostResponse>>({
    queryKey: ["jobs"],
    queryFn: () => listJobs({ page: 1, page_size: 50 }),
  });

  // ── My applications ─────────────────────────────────────
  const {
    data: appsData,
    isLoading: appsLoading,
  } = useQuery<PaginatedResponse<MyApplicationResponse>>({
    queryKey: ["my-applications"],
    queryFn: () => listMyApplications({ page: 1, page_size: 50 }),
    enabled: tab === "my-applications",
  });

  const jobs = jobsData?.items ?? [];
  const applications = appsData?.items ?? [];

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.heading}>Job Board</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={styles.createBtn}
        >
          {showForm ? "Cancel" : "+ Post a Job"}
        </button>
      </div>

      {showForm && (
        <CreateJobForm
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["jobs"] });
          }}
        />
      )}

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(tab === "browse" ? styles.tabActive : {}),
          }}
          onClick={() => setTab("browse")}
        >
          Browse Jobs
        </button>
        <button
          style={{
            ...styles.tab,
            ...(tab === "my-applications" ? styles.tabActive : {}),
          }}
          onClick={() => setTab("my-applications")}
        >
          My Applications
        </button>
      </div>

      {/* ── Browse tab ───────────────────────────────────── */}
      {tab === "browse" && (
        <>
          {isError && (
            <div style={styles.error}>
              <span>Could not load jobs.</span>
              <button onClick={() => refetch()} style={styles.retry}>
                Retry
              </button>
            </div>
          )}

          {isLoading && (
            <div style={styles.skeletonList}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={styles.skeleton} />
              ))}
            </div>
          )}

          {!isLoading && !isError && jobs.length === 0 && (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>💼</span>
              <p style={styles.emptyTitle}>No jobs posted yet</p>
              <p style={styles.emptyHint}>
                Be the first to post an opportunity for the community.
              </p>
            </div>
          )}

          {!isLoading && jobs.length > 0 && (
            <div style={styles.jobList}>
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── My applications tab ──────────────────────────── */}
      {tab === "my-applications" && (
        <>
          {appsLoading && (
            <div style={styles.skeletonList}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={styles.skeleton} />
              ))}
            </div>
          )}

          {!appsLoading && applications.length === 0 && (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>📋</span>
              <p style={styles.emptyTitle}>No applications yet</p>
              <p style={styles.emptyHint}>
                Browse jobs and apply to opportunities that interest you.
              </p>
            </div>
          )}

          {!appsLoading && applications.length > 0 && (
            <div style={styles.jobList}>
              {applications.map((app) => (
                <Link
                  key={app.id}
                  href={`/jobs/${app.job_id}`}
                  style={styles.appCard}
                  className="card-hover"
                >
                  <div style={styles.appTop}>
                    <h3 style={styles.cardTitle}>{app.job_title}</h3>
                    <span
                      style={{
                        ...styles.typeBadge,
                        background:
                          (JOB_TYPE_COLORS[app.job_type] ?? "#666") + "14",
                        color: JOB_TYPE_COLORS[app.job_type] ?? "#666",
                      }}
                    >
                      {JOB_TYPE_LABELS[app.job_type] ?? app.job_type}
                    </span>
                  </div>
                  {app.company_name && (
                    <p style={styles.company}>{app.company_name}</p>
                  )}
                  {app.message && (
                    <p style={styles.appMessage}>
                      &quot;{app.message.length > 100
                        ? app.message.slice(0, 100) + "..."
                        : app.message}&quot;
                    </p>
                  )}
                  <p style={styles.date}>
                    Applied{" "}
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Job Card ──────────────────────────────────────────────── */

function JobCard({ job }: { job: JobPostResponse }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      style={styles.card}
      className="card-hover"
    >
      <div style={styles.cardTop}>
        <h3 style={styles.cardTitle}>{job.title}</h3>
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

      <div style={styles.cardMeta}>
        {job.company_name && (
          <span style={styles.metaItem}>🏢 {job.company_name}</span>
        )}
        {job.location && (
          <span style={styles.metaItem}>📍 {job.location}</span>
        )}
      </div>

      <p style={styles.cardDesc}>
        {job.description.length > 150
          ? job.description.slice(0, 150) + "..."
          : job.description}
      </p>

      <div style={styles.cardFooter}>
        <span style={styles.author}>
          Posted by @{job.author.username}
        </span>
        <span style={styles.date}>
          {new Date(job.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

/* ── Create Job Form ───────────────────────────────────────── */

function CreateJobForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState<CreateJobRequest["job_type"]>("internship");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createJob({
        title,
        description,
        company_name: companyName || undefined,
        location: location || undefined,
        job_type: jobType,
      }),
    onSuccess,
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to create job");
    },
  });

  const canSubmit = title.trim() && description.trim() && !mutation.isPending;

  return (
    <div style={styles.formCard}>
      <h3 style={styles.formTitle}>Post a New Job</h3>

      {error && <p style={styles.formError}>{error}</p>}

      <div style={styles.formRow}>
        <label style={styles.label}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Frontend Developer Intern"
          style={styles.input}
          maxLength={200}
        />
      </div>

      <div style={styles.formRow}>
        <label style={styles.label}>Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the role, requirements, and how to apply..."
          style={styles.textarea}
          maxLength={5000}
          rows={4}
        />
      </div>

      <div style={styles.formGrid}>
        <div style={styles.formRow}>
          <label style={styles.label}>Company</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Optional"
            style={styles.input}
            maxLength={200}
          />
        </div>
        <div style={styles.formRow}>
          <label style={styles.label}>Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional (e.g. Remote, NYC)"
            style={styles.input}
            maxLength={200}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <label style={styles.label}>Job Type *</label>
        <select
          value={jobType}
          onChange={(e) =>
            setJobType(e.target.value as CreateJobRequest["job_type"])
          }
          style={styles.select}
        >
          <option value="internship">Internship</option>
          <option value="part-time">Part-time</option>
          <option value="full-time">Full-time</option>
          <option value="freelance">Freelance</option>
        </select>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit}
        style={{
          ...styles.submitBtn,
          opacity: canSubmit ? 1 : 0.5,
        }}
      >
        {mutation.isPending ? "Posting..." : "Post Job"}
      </button>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  heading: { fontSize: 22, fontWeight: 700, margin: 0 },
  createBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* ── Tabs ───────────────────────────────── */
  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
    borderBottom: "1px solid #eee",
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 500,
    color: "#888",
    cursor: "pointer",
  },
  tabActive: {
    color: "#6C63FF",
    borderBottomColor: "#6C63FF",
    fontWeight: 600,
  },

  /* ── Job list ───────────────────────────── */
  jobList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  /* ── Card ────────────────────────────────── */
  card: {
    display: "block",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 0.15s",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    color: "#111",
  },
  typeBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  cardMeta: {
    display: "flex",
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    fontSize: 13,
    color: "#666",
  },
  cardDesc: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.5,
    margin: "0 0 12px",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: { fontSize: 12, color: "#999" },
  date: { fontSize: 12, color: "#999" },

  /* ── Application card ────────────────────── */
  appCard: {
    display: "block",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 0.15s",
  },
  appTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 4,
  },
  company: {
    fontSize: 13,
    color: "#666",
    margin: "0 0 8px",
  },
  appMessage: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    margin: "0 0 8px",
    lineHeight: 1.5,
  },

  /* ── States ─────────────────────────────── */
  empty: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  emptyIcon: { fontSize: 40, display: "block", marginBottom: 8 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  emptyHint: { color: "#888", fontSize: 14, margin: 0 },
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  skeletonList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  skeleton: {
    height: 120,
    borderRadius: 12,
    background: "#f0f0f0",
    animation: "pulse 1.5s ease-in-out infinite",
  },

  /* ── Form ───────────────────────────────── */
  formCard: {
    background: "#fafafa",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 16px",
    color: "#111",
  },
  formError: {
    background: "#fff5f5",
    color: "#c53030",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  formRow: {
    marginBottom: 14,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#555",
    marginBottom: 4,
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
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
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
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
    marginTop: 4,
  },
};
