"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { listJobs, createJob, listMyApplications, listSavedJobs, saveJob, unsaveJob } from "@/api/jobs";
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
  const [tab, setTab] = useState<"browse" | "saved" | "my-applications">("browse");

  // ── Filter state ────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  // Debounce search input → searchQuery (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasFilters = searchQuery || filterType || filterLocation;

  // ── Browse jobs ─────────────────────────────────────────
  const {
    data: jobsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<PaginatedResponse<JobPostResponse>>({
    queryKey: ["jobs", { q: searchQuery, job_type: filterType, location: filterLocation }],
    queryFn: () =>
      listJobs({
        page: 1,
        page_size: 50,
        q: searchQuery || undefined,
        job_type: filterType || undefined,
        location: filterLocation || undefined,
      }),
  });

  // ── Saved jobs ───────────────────────────────────────────
  const {
    data: savedData,
    isLoading: savedLoading,
  } = useQuery<PaginatedResponse<JobPostResponse>>({
    queryKey: ["saved-jobs"],
    queryFn: () => listSavedJobs({ page: 1, page_size: 50 }),
    enabled: tab === "saved",
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
  const savedJobs = savedData?.items ?? [];
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
            ...(tab === "saved" ? styles.tabActive : {}),
          }}
          onClick={() => setTab("saved")}
        >
          Saved
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
          {/* ── Filter bar ─────────────────────────────── */}
          <div style={styles.filterBar}>
            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search jobs..."
                style={styles.searchInput}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  style={styles.clearBtn}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Types</option>
              <option value="internship">Internship</option>
              <option value="part-time">Part-time</option>
              <option value="full-time">Full-time</option>
              <option value="freelance">Freelance</option>
            </select>
            <input
              type="text"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              placeholder="Location..."
              style={styles.filterLocationInput}
            />
            {hasFilters && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setFilterType("");
                  setFilterLocation("");
                }}
                style={styles.clearFiltersBtn}
              >
                Clear
              </button>
            )}
          </div>

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
              <span style={styles.emptyIcon}>{hasFilters ? "🔍" : "💼"}</span>
              <p style={styles.emptyTitle}>
                {hasFilters ? "No jobs match your filters" : "No jobs posted yet"}
              </p>
              <p style={styles.emptyHint}>
                {hasFilters
                  ? "Try adjusting your search or filters."
                  : "Be the first to post an opportunity for the community."}
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

      {/* ── Saved tab ──────────────────────────────────────── */}
      {tab === "saved" && (
        <>
          {savedLoading && (
            <div style={styles.skeletonList}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={styles.skeleton} />
              ))}
            </div>
          )}

          {!savedLoading && savedJobs.length === 0 && (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>🔖</span>
              <p style={styles.emptyTitle}>No saved jobs</p>
              <p style={styles.emptyHint}>
                Save jobs you&apos;re interested in to find them here later.
              </p>
            </div>
          )}

          {!savedLoading && savedJobs.length > 0 && (
            <div style={styles.jobList}>
              {savedJobs.map((job) => (
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
  const qc = useQueryClient();
  const [saved, setSaved] = useState(job.saved_by_me);

  const saveMutation = useMutation({
    mutationFn: () => (saved ? unsaveJob(job.id) : saveJob(job.id)),
    onMutate: () => setSaved((s) => !s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: () => setSaved((s) => !s),
  });

  return (
    <Link
      href={`/jobs/${job.id}`}
      style={styles.card}
      className="card-hover"
    >
      <div style={styles.cardTop}>
        <h3 style={styles.cardTitle}>{job.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveMutation.mutate();
            }}
            style={styles.saveBtn}
            aria-label={saved ? "Unsave job" : "Save job"}
          >
            {saved ? "🔖" : "📑"}
          </button>
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

  /* ── Filter bar ──────────────────────────── */
  filterBar: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchBox: {
    position: "relative",
    flex: "1 1 200px",
    minWidth: 180,
  },
  searchIcon: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 14,
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "8px 32px 8px 32px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  clearBtn: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#999",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  filterSelect: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    minWidth: 130,
    boxSizing: "border-box",
  },
  filterLocationInput: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    minWidth: 140,
    flex: "0 1 160px",
  },
  clearFiltersBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    color: "#666",
    cursor: "pointer",
    whiteSpace: "nowrap",
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
  saveBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    padding: "2px 4px",
    lineHeight: 1,
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
