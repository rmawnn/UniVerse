"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listFollowers, getUserProfile } from "@/api/users";
import type { UserSearchResult } from "@/types/api";

export default function FollowersPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);

  const profileQuery = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => getUserProfile(userId),
    staleTime: 60_000,
  });

  const followersQuery = useQuery({
    queryKey: ["followers", userId],
    queryFn: () => listFollowers(userId, { page_size: 100 }),
    staleTime: 30_000,
  });

  const followers = followersQuery.data?.items ?? [];
  const profileName = profileQuery.data?.full_name;

  return (
    <div>
      <div style={styles.headerRow}>
        <Link href={`/profile/${userId}`} style={styles.backLink}>
          &larr;
        </Link>
        <h2 style={styles.heading}>
          {profileName ? `${profileName}'s Followers` : "Followers"}
        </h2>
      </div>

      {followersQuery.isLoading && (
        <div style={styles.loadingList}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.skeletonRow}>
              <div className="skeleton" style={styles.skeletonAvatar} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "50%", height: 14, borderRadius: 4, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "30%", height: 12, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {followersQuery.isError && (
        <div style={styles.error}>
          <span>Could not load followers.</span>
          <button onClick={() => followersQuery.refetch()} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      )}

      {!followersQuery.isLoading && !followersQuery.isError && followers.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>👥</span>
          <p style={styles.emptyTitle}>No followers yet</p>
          <p style={styles.emptyHint}>When people follow this user, they&apos;ll appear here.</p>
        </div>
      )}

      {followers.length > 0 && (
        <div style={styles.list}>
          {followers.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: UserSearchResult }) {
  return (
    <Link href={`/profile/${user.id}`} style={styles.row} className="row-hover">
      <div style={styles.avatar}>
        {user.full_name.charAt(0).toUpperCase()}
      </div>
      <div style={styles.userInfo}>
        <span style={styles.userName}>
          {user.full_name}
          {user.is_verified_student && (
            <span style={styles.verified} title="Verified">✓</span>
          )}
        </span>
        <span style={styles.userHandle}>@{user.username}</span>
      </div>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 22,
    color: "#6C63FF",
    textDecoration: "none",
    lineHeight: 1,
    padding: "4px 8px",
    borderRadius: 6,
  },
  heading: { fontSize: 20, fontWeight: 700, margin: 0 },
  list: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid #f0f0f0",
    textDecoration: "none",
    color: "inherit",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: 500,
    color: "#222",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  userHandle: {
    fontSize: 13,
    color: "#999",
  },
  verified: {
    background: "#6C63FF",
    color: "#fff",
    borderRadius: "50%",
    width: 16,
    height: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    flexShrink: 0,
  },
  loadingList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  skeletonRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid #f0f0f0",
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    flexShrink: 0,
  },
  empty: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  emptyIcon: { fontSize: 36, display: "block", marginBottom: 8 },
  emptyTitle: {
    fontSize: 16,
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
  },
  retryBtn: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
};
