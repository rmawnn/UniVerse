"use client";

import { useState, use, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getPost, listComments, createComment } from "@/api/posts";
import PostCard from "@/components/post/PostCard";
import CommentItem from "@/components/post/CommentItem";
import {
  PostSkeleton,
  CommentSkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { PaginatedResponse, CommentResponse } from "@/types/api";

const PAGE_SIZE = 20;

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const postKey = ["post", id] as const;
  const commentsKey = ["comments", id] as const;

  const postQuery = useQuery({
    queryKey: postKey,
    queryFn: () => getPost(id),
  });

  const commentsQuery = useInfiniteQuery<PaginatedResponse<CommentResponse>>({
    queryKey: [...commentsKey],
    queryFn: ({ pageParam = 1 }) =>
      listComments(id, { page: pageParam as number, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [commentsQuery.data]
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (commentsQuery.hasNextPage && !commentsQuery.isFetchingNextPage) {
        commentsQuery.fetchNextPage();
      }
    },
    !!commentsQuery.hasNextPage && !commentsQuery.isFetchingNextPage
  );

  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const commentMutation = useMutation({
    mutationFn: () => createComment(id, { content: draft.trim() }),
    onSuccess: () => {
      setDraft("");
      setFormError(null);
      qc.invalidateQueries({ queryKey: [...commentsKey] });
    },
    onError: (err: { message?: string }) => {
      setFormError(err?.message ?? "Failed to post comment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || commentMutation.isPending) return;
    commentMutation.mutate();
  };

  return (
    <div>
      <h2 style={styles.heading}>Post</h2>

      {postQuery.isLoading && <PostSkeleton />}
      {postQuery.isError && <p style={styles.error}>Could not load this post.</p>}
      {postQuery.data && (
        <PostCard
          post={postQuery.data}
          invalidateKeys={[[...postKey], ["feed"]]}
        />
      )}

      <h3 style={styles.subheading}>Comments</h3>

      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          style={styles.textarea}
          disabled={commentMutation.isPending}
        />
        {formError && <p style={styles.formError}>{formError}</p>}
        <div style={styles.formFooter}>
          <button
            type="submit"
            disabled={!draft.trim() || commentMutation.isPending}
            style={{
              ...styles.submitBtn,
              opacity: !draft.trim() || commentMutation.isPending ? 0.5 : 1,
            }}
          >
            {commentMutation.isPending ? "Posting..." : "Post comment"}
          </button>
        </div>
      </form>

      {commentsQuery.isLoading && (
        <SkeletonList count={3} Component={CommentSkeleton} />
      )}
      {commentsQuery.isError && (
        <p style={styles.error}>Could not load comments.</p>
      )}

      {!commentsQuery.isLoading && comments.length === 0 && (
        <p style={styles.muted}>No comments yet. Be the first.</p>
      )}

      <div>
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </div>

      {commentsQuery.hasNextPage && (
        <div ref={sentinelRef} style={{ minHeight: 20, marginTop: 12 }}>
          {commentsQuery.isFetchingNextPage && <CommentSkeleton />}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  subheading: { fontSize: 17, fontWeight: 600, margin: "24px 0 12px" },
  muted: { color: "#999", fontSize: 14 },
  error: { color: "#c53030", fontSize: 14 },
  form: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
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
  formError: { color: "#c53030", fontSize: 13, margin: "8px 0 0" },
  formFooter: { display: "flex", justifyContent: "flex-end", marginTop: 8 },
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
};
