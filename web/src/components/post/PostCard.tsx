"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleLike } from "@/api/posts";
import { formatRelativeTime } from "@/lib/format";
import type { PostResponse } from "@/types/api";

interface Props {
  post: PostResponse;
  /** Query keys that should be optimistically patched */
  invalidateKeys?: readonly unknown[][];
}

function PostCardInner({ post, invalidateKeys = [] }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post.id),
    onMutate: async () => {
      // Optimistic: flip liked_by_me and adjust count in every cached query
      const snapshots: Array<{ key: unknown[]; data: unknown }> = [];

      const patchPost = (p: PostResponse): PostResponse =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: !p.liked_by_me,
              like_count: p.like_count + (p.liked_by_me ? -1 : 1),
            }
          : p;

      for (const key of invalidateKeys) {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData(key);
        snapshots.push({ key: [...key], data: prev });

        qc.setQueryData(key, (old: unknown) => {
          if (!old || typeof old !== "object") return old;

          // Infinite-query shape: { pages: [{ items: [...] }], pageParams: [...] }
          if (
            "pages" in old &&
            Array.isArray((old as { pages: unknown[] }).pages)
          ) {
            const inf = old as {
              pages: { items: PostResponse[] }[];
              pageParams: unknown[];
            };
            return {
              ...inf,
              pages: inf.pages.map((p) => ({
                ...p,
                items: p.items.map(patchPost),
              })),
            };
          }

          // Plain paginated list
          if (
            "items" in old &&
            Array.isArray((old as { items: unknown[] }).items)
          ) {
            const list = old as { items: PostResponse[] };
            return { ...list, items: list.items.map(patchPost) };
          }

          // Single post
          if ("id" in old && (old as PostResponse).id === post.id) {
            return patchPost(old as PostResponse);
          }

          return old;
        });
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(({ key, data }) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!likeMutation.isPending) likeMutation.mutate();
  };

  const goToPost = () => router.push(`/posts/${post.id}`);

  return (
    <article style={styles.card} className="card-hover" onClick={goToPost}>
      <header style={styles.header}>
        <div>
          <strong style={styles.name}>{post.author.full_name}</strong>
          <Link
            href={`/profile/${post.author.id}`}
            onClick={(e) => e.stopPropagation()}
            style={styles.username}
          >
            @{post.author.username}
          </Link>
        </div>
        <span style={styles.time}>{formatRelativeTime(post.created_at)}</span>
      </header>

      <p style={styles.content}>{post.content}</p>

      {post.image_url && (
        <div style={styles.imageWrap}>
          <img
            src={post.image_url}
            alt=""
            style={styles.image}
            loading="lazy"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div style={styles.footer}>
        <button
          type="button"
          onClick={handleLike}
          disabled={likeMutation.isPending}
          style={{
            ...styles.likeBtn,
            color: post.liked_by_me ? "#e0245e" : "#666",
          }}
        >
          {post.liked_by_me ? "♥" : "♡"} {post.like_count}
        </button>

        <span style={styles.commentCount}>
          💬 {post.comment_count ?? 0}
        </span>
      </div>
    </article>
  );
}

const PostCard = memo(PostCardInner, (prev, next) => {
  const a = prev.post;
  const b = next.post;
  return (
    a.id === b.id &&
    a.liked_by_me === b.liked_by_me &&
    a.like_count === b.like_count &&
    a.comment_count === b.comment_count &&
    a.content === b.content &&
    a.image_url === b.image_url &&
    a.updated_at === b.updated_at
  );
});
PostCard.displayName = "PostCard";
export default PostCard;

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 16,
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  name: { fontSize: 15, marginRight: 6 },
  username: { color: "#999", fontSize: 13, textDecoration: "none" },
  time: { color: "#bbb", fontSize: 12 },
  content: {
    fontSize: 15,
    lineHeight: 1.6,
    margin: "0 0 12px",
    whiteSpace: "pre-wrap",
  },
  imageWrap: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    maxHeight: 400,
  },
  image: {
    width: "100%",
    maxHeight: 400,
    objectFit: "cover" as const,
    display: "block",
  },
  footer: { display: "flex", gap: 16 },
  likeBtn: {
    background: "none",
    border: "none",
    padding: "4px 8px",
    fontSize: 14,
    cursor: "pointer",
    borderRadius: 6,
  },
  commentCount: {
    color: "#666",
    fontSize: 14,
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
};
