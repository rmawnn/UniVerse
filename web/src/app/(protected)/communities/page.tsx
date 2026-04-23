"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { listCommunities } from "@/api/communities";
import CommunityCard from "@/components/community/CommunityCard";
import {
  CommunitySkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";

export default function CommunitiesPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["communities", "browse", user?.university_id],
    queryFn: () => listCommunities(user!.university_id!, { page_size: 50 }),
    enabled: !!user?.university_id,
  });

  if (!user?.university_id) {
    return (
      <div>
        <h2 style={styles.heading}>Communities</h2>
        <p style={styles.empty}>
          Verify your student account to see communities from your university.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.headingRow}>
        <h2 style={styles.heading}>Communities</h2>
        <Link href="/communities/create" style={styles.createBtn}>
          + Create
        </Link>
      </div>

      {isLoading && <SkeletonList count={4} Component={CommunitySkeleton} />}

      {isError && (
        <div style={styles.errorBox}>
          <span>Could not load communities.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
        <p style={styles.empty}>No communities yet.</p>
      )}

      <div style={styles.list}>
        {data?.items.map((c) => (
          <CommunityCard key={c.id} community={c} />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heading: { fontSize: 22, fontWeight: 700, margin: 0 },
  createBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  },
  empty: { color: "#999", fontSize: 15 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  errorBox: {
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
};
