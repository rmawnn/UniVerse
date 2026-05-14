"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFollowSuggestions, followUser } from "@/api/users";
import type { UserSearchResult } from "@/types/api";

const SUGGESTIONS_KEY = ["follow-suggestions"] as const;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

interface Props {
  /** "card" = grid cards (explore page), "compact" = horizontal rows (sidebar) */
  variant?: "card" | "compact";
  limit?: number;
}

export default function SuggestedUsers({
  variant = "card",
  limit = 6,
}: Props) {
  const qc = useQueryClient();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const { data: users, isLoading } = useQuery<UserSearchResult[]>({
    queryKey: [...SUGGESTIONS_KEY, limit],
    queryFn: () => getFollowSuggestions(limit),
    staleTime: 120_000,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => followUser(userId),
    onSuccess: (_data, userId) => {
      setFollowedIds((prev) => new Set(prev).add(userId));
      qc.invalidateQueries({ queryKey: ["explore"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  if (isLoading) {
    if (variant === "compact") {
      return (
        <div style={compactStyles.wrapper}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={compactStyles.row}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "60%", height: 10, borderRadius: 4, marginBottom: 4 }} />
                <div className="skeleton" style={{ width: "40%", height: 8, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null; // Card variant loading is handled by parent (explore page)
  }

  if (!users || users.length === 0) return null;

  // Filter out already-followed users from the list
  const visible = users.filter((u) => !followedIds.has(u.id));
  if (visible.length === 0) return null;

  if (variant === "compact") {
    return (
      <div style={compactStyles.wrapper}>
        <p style={compactStyles.heading}>Suggested for you</p>
        {visible.slice(0, 5).map((u) => (
          <CompactUserRow
            key={u.id}
            user={u}
            onFollow={() => followMutation.mutate(u.id)}
            isPending={followMutation.isPending}
          />
        ))}
        <Link href="/explore" style={compactStyles.seeAll}>
          See all
        </Link>
      </div>
    );
  }

  // Card variant
  return (
    <div style={cardStyles.grid}>
      {visible.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          onFollow={() => followMutation.mutate(u.id)}
          isPending={followMutation.isPending}
        />
      ))}
    </div>
  );
}

/* ── Card variant (explore page) ───────────────────────────── */

function UserCard({
  user: u,
  onFollow,
  isPending,
}: {
  user: UserSearchResult;
  onFollow: () => void;
  isPending: boolean;
}) {
  const profileUrl = u.profile_image_url
    ? u.profile_image_url.startsWith("http")
      ? u.profile_image_url
      : `${BACKEND_URL}${u.profile_image_url}`
    : null;

  return (
    <div style={cardStyles.card} className="card-hover">
      <Link
        href={`/profile/${u.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        {profileUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={profileUrl} alt="" style={cardStyles.avatar} />
        ) : (
          <div style={cardStyles.avatarFallback}>
            {u.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={cardStyles.name}>{u.full_name}</div>
        <div style={cardStyles.handle}>@{u.username}</div>
        {u.is_verified_student && (
          <span style={cardStyles.verifiedBadge}>Verified Student</span>
        )}
      </Link>
      <button
        type="button"
        onClick={onFollow}
        disabled={isPending}
        style={{
          ...cardStyles.followBtn,
          opacity: isPending ? 0.6 : 1,
        }}
      >
        Follow
      </button>
    </div>
  );
}

/* ── Compact variant (sidebar) ─────────────────────────────── */

function CompactUserRow({
  user: u,
  onFollow,
  isPending,
}: {
  user: UserSearchResult;
  onFollow: () => void;
  isPending: boolean;
}) {
  const profileUrl = u.profile_image_url
    ? u.profile_image_url.startsWith("http")
      ? u.profile_image_url
      : `${BACKEND_URL}${u.profile_image_url}`
    : null;

  return (
    <div style={compactStyles.row}>
      <Link href={`/profile/${u.id}`} style={compactStyles.rowLink}>
        {profileUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={profileUrl} alt="" style={compactStyles.avatar} />
        ) : (
          <div style={compactStyles.avatarFallback}>
            {u.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={compactStyles.name}>{u.full_name}</div>
          <div style={compactStyles.handle}>@{u.username}</div>
        </div>
      </Link>
      <button
        type="button"
        onClick={onFollow}
        disabled={isPending}
        style={{
          ...compactStyles.followBtn,
          opacity: isPending ? 0.6 : 1,
        }}
      >
        Follow
      </button>
    </div>
  );
}

/* ── Card styles ───────────────────────────────────────────── */

const cardStyles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: 8,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 22,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111",
  },
  handle: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  verifiedBadge: {
    fontSize: 11,
    color: "#6C63FF",
    background: "#f0efff",
    borderRadius: 6,
    padding: "2px 8px",
    fontWeight: 500,
    marginBottom: 4,
  },
  followBtn: {
    marginTop: 8,
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
};

/* ── Compact styles ────────────────────────────────────────── */

const compactStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  heading: {
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
    margin: "0 0 8px",
    padding: "0 4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 4px",
    borderRadius: 8,
  },
  rowLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    textDecoration: "none",
    color: "inherit",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: 600,
    color: "#222",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  handle: {
    fontSize: 11,
    color: "#999",
  },
  followBtn: {
    background: "#f0efff",
    color: "#6C63FF",
    border: "none",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  seeAll: {
    fontSize: 12,
    color: "#6C63FF",
    fontWeight: 500,
    textDecoration: "none",
    padding: "8px 4px 0",
  },
};
