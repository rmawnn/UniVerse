"use client";

import { useQuery } from "@tanstack/react-query";
import { getHomeFeed } from "@/api/feed";
import PostCard from "@/components/post/PostCard";

const FEED_KEY = ["feed"] as const;

export default function FeedPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: FEED_KEY,
    queryFn: () => getHomeFeed({ page_size: 20 }),
  });

  return (
    <div>
      <h2 style={styles.heading}>Feed</h2>

      {isLoading && <p style={styles.muted}>Loading feed...</p>}

      {isError && (
        <div style={styles.error}>
          <span>Could not load feed.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
        <p style={styles.muted}>
          Your feed is empty. Join some communities first.
        </p>
      )}

      <div style={styles.list}>
        {data?.items.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            invalidateKeys={[[...FEED_KEY]]}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  muted: { color: "#999", fontSize: 15 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
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
};
