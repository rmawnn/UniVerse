"use client";

import { useState, use, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getCommunity, joinCommunity } from "@/api/communities";
import { listCommunityPosts, createPost } from "@/api/posts";
import PostCard from "@/components/post/PostCard";
import { PostSkeleton, SkeletonList } from "@/components/skeletons/Skeletons";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { PaginatedResponse, PostResponse } from "@/types/api";

const PAGE_SIZE = 15;

export default function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const communityKey = ["community", id] as const;
  const postsKey = ["community-posts", id] as const;

  const communityQuery = useQuery({
    queryKey: communityKey,
    queryFn: () => getCommunity(id),
  });

  const postsQuery = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...postsKey],
    queryFn: ({ pageParam = 1 }) =>
      listCommunityPosts(id, {
        page: pageParam as number,
        page_size: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [postsQuery.data]
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
        postsQuery.fetchNextPage();
      }
    },
    !!postsQuery.hasNextPage && !postsQuery.isFetchingNextPage
  );

  const joinMutation = useMutation({
    mutationFn: () => joinCommunity(id),
    onSuccess: (data) => {
      qc.setQueryData(communityKey, data);
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
  });

  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);

  const createPostMutation = useMutation({
    mutationFn: () => createPost(id, { content: draft.trim() }),
    onSuccess: () => {
      setDraft("");
      setShowComposer(false);
      setComposeError(null);
      qc.invalidateQueries({ queryKey: [...postsKey] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (err: { message?: string }) => {
      setComposeError(err?.message ?? "Failed to create post");
    },
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || createPostMutation.isPending) return;
    createPostMutation.mutate();
  };

  if (communityQuery.isLoading) {
    return <p style={styles.muted}>Loading community...</p>;
  }
  if (communityQuery.isError || !communityQuery.data) {
    return <p style={styles.error}>Could not load community.</p>;
  }

  const community = communityQuery.data;

  return (
    <div>
      <section style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h2 style={styles.name}>{community.name}</h2>
            <p style={styles.meta}>{community.member_count} members</p>
          </div>
          <button
            type="button"
            onClick={() => joinMutation.mutate()}
            disabled={community.is_member || joinMutation.isPending}
            style={{
              ...styles.joinBtn,
              background: community.is_member ? "#e5e7eb" : "#6C63FF",
              color: community.is_member ? "#666" : "#fff",
              cursor: community.is_member ? "default" : "pointer",
            }}
          >
            {community.is_member
              ? "Joined"
              : joinMutation.isPending
                ? "Joining..."
                : "Join"}
          </button>
        </div>
        {community.description && (
          <p style={styles.description}>{community.description}</p>
        )}
      </section>

      {community.is_member && (
        <section style={styles.composerSection}>
          {!showComposer ? (
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              style={styles.composerTrigger}
            >
              + Create Post
            </button>
          ) : (
            <form onSubmit={handleCreatePost} style={styles.composerForm}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                style={styles.textarea}
                disabled={createPostMutation.isPending}
                autoFocus
              />
              {composeError && <p style={styles.formError}>{composeError}</p>}
              <div style={styles.composerFooter}>
                <button
                  type="button"
                  onClick={() => {
                    setShowComposer(false);
                    setDraft("");
                    setComposeError(null);
                  }}
                  style={styles.cancelBtn}
                  disabled={createPostMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim() || createPostMutation.isPending}
                  style={{
                    ...styles.submitBtn,
                    opacity:
                      !draft.trim() || createPostMutation.isPending ? 0.5 : 1,
                  }}
                >
                  {createPostMutation.isPending ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <h3 style={styles.subheading}>Posts</h3>

      {postsQuery.isLoading && (
        <SkeletonList count={3} Component={PostSkeleton} />
      )}
      {postsQuery.isError && <p style={styles.error}>Could not load posts.</p>}
      {!postsQuery.isLoading && posts.length === 0 && (
        <p style={styles.muted}>No posts yet.</p>
      )}

      <div style={styles.list}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            invalidateKeys={[[...postsKey], ["feed"]]}
          />
        ))}
      </div>

      {postsQuery.hasNextPage && (
        <div ref={sentinelRef} style={{ marginTop: 12 }}>
          {postsQuery.isFetchingNextPage && <PostSkeleton />}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  name: { fontSize: 22, fontWeight: 700, margin: 0 },
  meta: { fontSize: 13, color: "#999", margin: "4px 0 0" },
  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.5,
    margin: "12px 0 0",
  },
  joinBtn: {
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 500,
  },
  composerSection: { marginBottom: 16 },
  composerTrigger: {
    width: "100%",
    background: "#fff",
    border: "1px dashed #ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#666",
    cursor: "pointer",
  },
  composerForm: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 12,
  },
  textarea: {
    width: "100%",
    border: "1px solid #eee",
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    resize: "vertical",
    outline: "none",
  },
  composerFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  cancelBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
    color: "#666",
  },
  submitBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  formError: { color: "#c53030", fontSize: 13, margin: "8px 0 0" },
  subheading: { fontSize: 17, fontWeight: 600, margin: "8px 0 12px" },
  muted: { color: "#999", fontSize: 14 },
  error: { color: "#c53030", fontSize: 14 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
};
