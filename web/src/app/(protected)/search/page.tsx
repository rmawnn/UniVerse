"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { unifiedSearch } from "@/api/search";
import type { UnifiedSearchResponse } from "@/api/search";
import { formatRelativeTime } from "@/lib/format";

type Tab = "all" | "users" | "communities" | "posts" | "jobs";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialTab = (searchParams.get("tab") as Tab) || "all";

  const [input, setInput] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [tab, setTab] = useState<Tab>(initialTab);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const enabled = query.trim().length >= 2;

  const { data, isLoading, isError, refetch } = useQuery<UnifiedSearchResponse>({
    queryKey: ["unified-search", query.trim()],
    queryFn: () => unifiedSearch(query.trim()),
    enabled,
  });

  // ── Debounced input → query ─────────────────────────────
  const handleInput = useCallback(
    (val: string) => {
      setInput(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setQuery(val);
      }, 350);
    },
    [],
  );

  // ── Sync query to URL ───────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim();
    const params = new URLSearchParams();
    if (trimmed.length >= 2) params.set("q", trimmed);
    if (tab !== "all") params.set("tab", tab);
    const qs = params.toString();
    router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [query, tab, router]);

  // ── Tab counts ──────────────────────────────────────────
  const counts = data
    ? {
        all: data.users_total + data.communities_total + data.posts_total + data.jobs_total,
        users: data.users_total,
        communities: data.communities_total,
        posts: data.posts_total,
        jobs: data.jobs_total,
      }
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "users", label: "Users" },
    { key: "communities", label: "Communities" },
    { key: "posts", label: "Posts" },
    { key: "jobs", label: "Jobs" },
  ];

  return (
    <div style={s.page}>
      {/* ── Search input ────────────────────────────── */}
      <div style={s.searchWrap}>
        <div style={s.searchIcon}>S</div>
        <input
          type="text"
          placeholder="Search users, communities, posts, jobs..."
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          style={s.input}
          autoFocus
        />
        {input && (
          <button
            onClick={() => { setInput(""); setQuery(""); }}
            style={s.clearBtn}
          >
            X
          </button>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      {enabled && (
        <div style={s.tabBar}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...s.tabBtn,
                ...(tab === t.key ? s.tabActive : {}),
              }}
            >
              {t.label}
              {counts && counts[t.key] > 0 && (
                <span style={s.tabCount}>{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Hint state ──────────────────────────────── */}
      {!enabled && (
        <div style={s.hintCard}>
          <div style={s.hintIconWrap}>S</div>
          <p style={s.hintTitle}>Search UniVerse</p>
          <p style={s.hintText}>Type at least 2 characters to search across users, communities, posts, and jobs</p>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────── */}
      {enabled && isLoading && <SearchSkeleton />}

      {/* ── Error ───────────────────────────────────── */}
      {enabled && isError && (
        <div style={s.errorBox}>
          <span style={s.errorText}>Search failed. Please try again.</span>
          <button onClick={() => refetch()} style={s.retryBtn}>Retry</button>
        </div>
      )}

      {/* ── Results ─────────────────────────────────── */}
      {enabled && data && !isLoading && !isError && (
        <div style={s.results}>
          {counts && counts.all === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>?</div>
              <p style={s.emptyTitle}>No results found</p>
              <p style={s.emptyHint}>
                Try different keywords or check spelling
              </p>
            </div>
          )}

          {/* ── Users ─────────────────────────────── */}
          {(tab === "all" || tab === "users") && data.users.length > 0 && (
            <section style={s.section}>
              {tab === "all" && (
                <SectionHeader
                  title="Users"
                  count={data.users_total}
                  onViewAll={() => setTab("users")}
                />
              )}
              <div style={s.cardList}>
                {data.users.map((u) => (
                  <Link key={u.id} href={`/profile/${u.id}`} style={s.card}>
                    <div style={s.userAvatar}>
                      {u.profile_image_url ? (
                        <img
                          src={u.profile_image_url}
                          alt=""
                          style={s.avatarImg}
                        />
                      ) : (
                        u.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={s.cardInfo}>
                      <div style={s.cardNameRow}>
                        <span style={s.cardName}>{u.full_name}</span>
                        {u.is_verified_student && (
                          <span style={s.verifiedBadge}>Verified</span>
                        )}
                      </div>
                      <span style={s.cardMeta}>@{u.username}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Communities ────────────────────────── */}
          {(tab === "all" || tab === "communities") && data.communities.length > 0 && (
            <section style={s.section}>
              {tab === "all" && (
                <SectionHeader
                  title="Communities"
                  count={data.communities_total}
                  onViewAll={() => setTab("communities")}
                />
              )}
              <div style={s.cardList}>
                {data.communities.map((c) => (
                  <Link key={c.id} href={`/communities/${c.id}`} style={s.card}>
                    <div style={s.commAvatar}>C</div>
                    <div style={s.cardInfo}>
                      <div style={s.cardNameRow}>
                        <span style={s.cardName}>{c.name}</span>
                        {c.is_member && (
                          <span style={s.memberBadge}>Joined</span>
                        )}
                      </div>
                      <span style={s.cardMeta}>
                        {c.member_count} member{c.member_count !== 1 ? "s" : ""}
                        {c.description && ` · ${c.description.length > 50 ? c.description.slice(0, 50) + "..." : c.description}`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Posts ──────────────────────────────── */}
          {(tab === "all" || tab === "posts") && data.posts.length > 0 && (
            <section style={s.section}>
              {tab === "all" && (
                <SectionHeader
                  title="Posts"
                  count={data.posts_total}
                  onViewAll={() => setTab("posts")}
                />
              )}
              <div style={s.cardList}>
                {data.posts.map((p) => (
                  <div key={p.id} style={s.postCard}>
                    <div style={s.postTop}>
                      <span style={s.postAuthor}>{p.author_username}</span>
                      <span style={s.postIn}>in</span>
                      <span style={s.postComm}>{p.community_name}</span>
                      <span style={s.postTime}>
                        {formatRelativeTime(p.created_at)}
                      </span>
                    </div>
                    <p style={s.postContent}>
                      {p.content_preview.length > 150
                        ? p.content_preview.slice(0, 150) + "..."
                        : p.content_preview}
                    </p>
                    <div style={s.postStats}>
                      <span style={s.postStat}>
                        {p.like_count} like{p.like_count !== 1 ? "s" : ""}
                      </span>
                      <span style={s.postStat}>
                        {p.comment_count} comment{p.comment_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Jobs ──────────────────────────────── */}
          {(tab === "all" || tab === "jobs") && data.jobs.length > 0 && (
            <section style={s.section}>
              {tab === "all" && (
                <SectionHeader
                  title="Jobs"
                  count={data.jobs_total}
                  onViewAll={() => setTab("jobs")}
                />
              )}
              <div style={s.cardList}>
                {data.jobs.map((j) => (
                  <Link key={j.id} href={`/jobs/${j.id}`} style={s.card}>
                    <div style={s.jobIcon}>J</div>
                    <div style={s.cardInfo}>
                      <div style={s.cardNameRow}>
                        <span style={s.cardName}>{j.title}</span>
                        <JobTypeBadge type={j.job_type} />
                      </div>
                      <span style={s.cardMeta}>
                        {j.company_name ?? "No company"}
                        {j.location && ` · ${j.location}`}
                        {` · ${formatRelativeTime(j.created_at)}`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function SectionHeader({
  title,
  count,
  onViewAll,
}: {
  title: string;
  count: number;
  onViewAll: () => void;
}) {
  return (
    <div style={s.sectionHeader}>
      <h3 style={s.sectionTitle}>
        {title}
        <span style={s.sectionCount}>{count}</span>
      </h3>
      {count > 6 && (
        <button onClick={onViewAll} style={s.viewAllBtn}>
          View all
        </button>
      )}
    </div>
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
        padding: "2px 7px",
        borderRadius: 5,
        background: c.bg,
        color: c.fg,
        textTransform: "capitalize" as const,
      }}
    >
      {type}
    </span>
  );
}

function SearchSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
      {Array.from({ length: 3 }).map((_, si) => (
        <div key={si}>
          <div
            className="skeleton"
            style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 10 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 3 }).map((__, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ width: "100%", height: 56, borderRadius: 10 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 720,
    margin: "0 auto",
  },

  /* ── Search input ───────────────────── */
  searchWrap: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: "0 16px",
    marginBottom: 16,
    transition: "border-color 0.15s",
  },
  searchIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#f3f4f6",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginRight: 10,
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 15,
    padding: "14px 0",
    background: "transparent",
    color: "#1a1a1a",
  },
  clearBtn: {
    background: "#f3f4f6",
    border: "none",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    cursor: "pointer",
    marginLeft: 8,
    flexShrink: 0,
  },

  /* ── Tabs ────────────────────────────── */
  tabBar: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "#eee",
    overflowX: "auto" as const,
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    borderBottomWidth: 2,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "transparent",
    background: "none",
    color: "#777",
    cursor: "pointer",
    marginBottom: -1,
    whiteSpace: "nowrap" as const,
    transition: "color 0.15s, border-color 0.15s",
  },
  tabActive: {
    color: "#6C63FF",
    borderBottomColor: "#6C63FF",
    fontWeight: 600,
  },
  tabCount: {
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
    background: "#6C63FF",
    borderRadius: 8,
    padding: "1px 6px",
    lineHeight: "16px",
  },

  /* ── Hint state ─────────────────────── */
  hintCard: {
    textAlign: "center" as const,
    padding: "56px 24px",
    background: "#fafafa",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ddd",
    marginTop: 8,
  },
  hintIconWrap: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#f0efff",
    color: "#6C63FF",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  hintTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  hintText: {
    color: "#999",
    fontSize: 14,
    margin: 0,
    maxWidth: 360,
    marginLeft: "auto",
    marginRight: "auto",
  },

  /* ── Results container ──────────────── */
  results: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
  },

  /* ── Section ────────────────────────── */
  section: {},
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#333",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    background: "#f3f4f6",
    borderRadius: 8,
    padding: "1px 7px",
    lineHeight: "16px",
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6C63FF",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },

  /* ── Card list ──────────────────────── */
  cardList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },

  /* ── Generic card (link-based) ──────── */
  card: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eee",
    borderRadius: 10,
    padding: "12px 16px",
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap" as const,
  },
  cardName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1a1a1a",
  },
  cardMeta: {
    fontSize: 12,
    color: "#999",
    display: "block",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },

  /* ── User avatar ────────────────────── */
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 600,
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  verifiedBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#6C63FF",
    background: "#f0efff",
    borderRadius: 4,
    padding: "1px 6px",
  },

  /* ── Community avatar ───────────────── */
  commAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#f0efff",
    color: "#6C63FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },
  memberBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "#16a34a",
    background: "#dcfce7",
    borderRadius: 4,
    padding: "1px 6px",
  },

  /* ── Job icon ───────────────────────── */
  jobIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#f3e8ff",
    color: "#7c3aed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },

  /* ── Post card ──────────────────────── */
  postCard: {
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eee",
    borderRadius: 10,
    padding: "14px 16px",
  },
  postTop: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap" as const,
  },
  postAuthor: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1a1a1a",
  },
  postIn: {
    fontSize: 12,
    color: "#bbb",
  },
  postComm: {
    fontSize: 12,
    fontWeight: 500,
    color: "#6C63FF",
  },
  postTime: {
    fontSize: 11,
    color: "#ccc",
    marginLeft: "auto",
  },
  postContent: {
    fontSize: 14,
    color: "#333",
    lineHeight: 1.5,
    margin: "0 0 8px",
  },
  postStats: {
    display: "flex",
    gap: 14,
  },
  postStat: {
    fontSize: 12,
    color: "#999",
  },

  /* ── Empty ──────────────────────────── */
  emptyState: {
    textAlign: "center" as const,
    padding: "48px 24px",
    background: "#fafafa",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ddd",
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#f3f4f6",
    color: "#9ca3af",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  emptyHint: {
    fontSize: 14,
    color: "#999",
    margin: 0,
  },

  /* ── Error ──────────────────────────── */
  errorBox: {
    background: "#fff5f5",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fed7d7",
    borderRadius: 10,
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#c53030",
    fontSize: 14,
  },
  retryBtn: {
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
};
