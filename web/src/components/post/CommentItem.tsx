"use client";

import { memo } from "react";
import { formatRelativeTime } from "@/lib/format";
import type { CommentResponse } from "@/types/api";

function CommentItemInner({ comment }: { comment: CommentResponse }) {
  return (
    <div style={styles.item}>
      <div style={styles.header}>
        <strong style={styles.name}>{comment.author.full_name}</strong>
        <span style={styles.username}>@{comment.author.username}</span>
        <span style={styles.time}>{formatRelativeTime(comment.created_at)}</span>
      </div>
      <p style={styles.content}>{comment.content}</p>
    </div>
  );
}

const CommentItem = memo(
  CommentItemInner,
  (prev, next) => prev.comment.id === next.comment.id
);
CommentItem.displayName = "CommentItem";
export default CommentItem;

const styles: Record<string, React.CSSProperties> = {
  item: {
    padding: "12px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 4,
  },
  name: { fontSize: 14 },
  username: { color: "#999", fontSize: 12 },
  time: { color: "#bbb", fontSize: 12, marginLeft: "auto" },
  content: { fontSize: 14, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" },
};
