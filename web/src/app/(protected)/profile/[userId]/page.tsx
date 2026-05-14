"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, followUser, unfollowUser } from "@/api/users";
import { createConversation } from "@/api/messaging";
import { useAuthStore } from "@/store/auth-store";
import { formatRelativeTime } from "@/lib/format";
import ProfilePostsGrid from "@/components/profile/ProfilePostsGrid";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;
  const [msgError, setMsgError] = useState<string | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: (following: boolean) =>
      following ? unfollowUser(userId) : followUser(userId),
    onMutate: async (currentlyFollowing: boolean) => {
      setFollowError(null);
      await queryClient.cancelQueries({ queryKey: ["user-profile", userId] });
      const prev = queryClient.getQueryData<typeof profileQuery.data>(["user-profile", userId]);
      if (prev) {
        queryClient.setQueryData(["user-profile", userId], {
          ...prev,
          is_following: !currentlyFollowing,
          followers_count: prev.followers_count + (currentlyFollowing ? -1 : 1),
        });
      }
      return { prev };
    },
    onError: (err: { message?: string }, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["user-profile", userId], context.prev);
      }
      setFollowError(err?.message ?? "Could not update follow status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: () => createConversation({ participant_id: userId }),
    onSuccess: (conv) => {
      router.push(`/messages/${conv.id}`);
    },
    onError: (err: { message?: string }) => {
      setMsgError(err?.message ?? "Could not start conversation");
    },
  });

  const profileQuery = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => getUserProfile(userId),
    staleTime: 60_000,
  });

  if (profileQuery.isLoading) {
    return (
      <div>
        <div style={styles.header}>
          <div className="skeleton" style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 12px" }} />
          <div className="skeleton" style={{ width: "40%", height: 22, borderRadius: 6, margin: "0 auto 8px" }} />
          <div className="skeleton" style={{ width: "25%", height: 14, borderRadius: 6, margin: "0 auto 16px" }} />
          <div className="skeleton" style={{ width: "100%", maxWidth: 480, height: 100, borderRadius: 10, margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div style={styles.error}>
        <span>Could not load profile.</span>
        <button onClick={() => profileQuery.refetch()} style={styles.retry}>
          Retry
        </button>
      </div>
    );
  }

  const data = profileQuery.data;

  return (
    <div>
      {/* ── Profile header ──────────────────────────────────── */}
      <section style={styles.header}>
        <div style={styles.avatar}>
          {data.full_name.charAt(0).toUpperCase()}
        </div>
        <h2 style={styles.name}>
          {data.full_name}
          {data.is_verified_student && (
            <span style={styles.verified} title="Verified student">
              ✓
            </span>
          )}
        </h2>
        <p style={styles.username}>@{data.username}</p>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <span style={styles.statCount}>{data.posts_count}</span>
            <span style={styles.statLabel}>Posts</span>
          </div>
          <div style={styles.statDivider} />
          <Link href={`/profile/${userId}/followers`} style={styles.statLink}>
            <span style={styles.statCount}>{data.followers_count}</span>
            <span style={styles.statLabel}>Followers</span>
          </Link>
          <div style={styles.statDivider} />
          <Link href={`/profile/${userId}/following`} style={styles.statLink}>
            <span style={styles.statCount}>{data.following_count}</span>
            <span style={styles.statLabel}>Following</span>
          </Link>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <span style={styles.statCount}>{data.communities_count}</span>
            <span style={styles.statLabel}>Communities</span>
          </div>
        </div>

        {!isOwnProfile && (
          <div style={styles.actionRow}>
            <button
              type="button"
              onClick={() => followMutation.mutate(data.is_following)}
              disabled={followMutation.isPending}
              style={{
                ...(data.is_following ? styles.unfollowBtn : styles.followBtn),
                opacity: followMutation.isPending ? 0.6 : 1,
              }}
            >
              {followMutation.isPending
                ? "..."
                : data.is_following
                  ? "Unfollow"
                  : "Follow"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMsgError(null);
                messageMutation.mutate();
              }}
              disabled={messageMutation.isPending}
              style={{
                ...styles.messageBtn,
                opacity: messageMutation.isPending ? 0.6 : 1,
              }}
            >
              {messageMutation.isPending ? "Opening..." : "Message"}
            </button>
          </div>
        )}
        {followError && (
          <p style={{ color: "#c53030", fontSize: 12, margin: "6px 0 0" }}>
            {followError}
          </p>
        )}
        {msgError && (
          <p style={{ color: "#c53030", fontSize: 12, margin: "6px 0 0" }}>
            {msgError}
          </p>
        )}

        {data.bio && <p style={styles.bio}>{data.bio}</p>}

        <div style={styles.info}>
          {data.university_name && (
            <div style={styles.row}>
              <span style={styles.label}>University</span>
              <span>{data.university_name}</span>
            </div>
          )}
          {data.department && (
            <div style={styles.row}>
              <span style={styles.label}>Department</span>
              <span>{data.department}</span>
            </div>
          )}
          {data.academic_year && (
            <div style={styles.row}>
              <span style={styles.label}>Year</span>
              <span>{data.academic_year}</span>
            </div>
          )}
          <div style={styles.row}>
            <span style={styles.label}>Joined</span>
            <span>{formatRelativeTime(data.created_at)}</span>
          </div>
        </div>
      </section>

      {/* ── Communities ──────────────────────────────────────── */}
      <section style={styles.section}>
        <h3 style={styles.subheading}>Communities</h3>
        {data.communities.length === 0 ? (
          <p style={styles.mutedText}>Not a member of any community yet.</p>
        ) : (
          <div style={styles.communitiesList}>
            {data.communities.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.id}`}
                style={styles.communityChip}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Posts grid (Instagram-style) ─────────────────────── */}
      <section style={styles.section}>
        <ProfilePostsGrid userId={userId} isOwnProfile={isOwnProfile} />
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mutedText: { color: "#999", fontSize: 14 },
  header: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 32,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  verified: {
    background: "#6C63FF",
    color: "#fff",
    borderRadius: "50%",
    width: 20,
    height: 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
  },
  username: { color: "#666", fontSize: 15, margin: "0 0 12px" },
  statsRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginBottom: 14,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  statLink: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    textDecoration: "none",
    color: "inherit",
  },
  statCount: { fontSize: 18, fontWeight: 700, color: "#222" },
  statLabel: { fontSize: 12, color: "#888" },
  statDivider: {
    width: 1,
    height: 28,
    background: "#e0e0e0",
  },
  actionRow: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  followBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  unfollowBtn: {
    background: "#fff",
    color: "#6C63FF",
    border: "1px solid #6C63FF",
    borderRadius: 8,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  messageBtn: {
    background: "#fff",
    color: "#6C63FF",
    border: "1px solid #6C63FF",
    borderRadius: 8,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  bio: {
    color: "#444",
    fontSize: 14,
    lineHeight: 1.6,
    margin: "8px auto 16px",
    maxWidth: 480,
  },
  info: {
    background: "#f9f9f9",
    borderRadius: 10,
    padding: 16,
    textAlign: "left",
    maxWidth: 480,
    margin: "0 auto",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    fontSize: 14,
  },
  label: { color: "#666" },
  section: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  subheading: { fontSize: 16, fontWeight: 600, margin: "0 0 12px" },
  communitiesList: { display: "flex", flexWrap: "wrap", gap: 8 },
  communityChip: {
    background: "#f0efff",
    color: "#6C63FF",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 13,
    textDecoration: "none",
    border: "1px solid #e0defe",
  },
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
};
