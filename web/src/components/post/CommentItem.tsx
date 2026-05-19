"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import ReportModal from "@/components/ReportModal";
import type { CommentResponse } from "@/types/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

interface Props {
  comment: CommentResponse;
  onReply?: (comment: CommentResponse) => void;
  isReply?: boolean;
}

function CommentItemInner({ comment, onReply, isReply = false }: Props) {
  const [showReport, setShowReport] = useState(false);
  const profileUrl = comment.author.profile_image_url
    ? comment.author.profile_image_url.startsWith("http")
      ? comment.author.profile_image_url
      : `${BACKEND_URL}${comment.author.profile_image_url}`
    : null;

  return (
    <div style={isReply ? styles.replyItem : styles.item}>
      <div style={styles.row}>
        {/* Avatar */}
        <Link
          href={`/profile/${comment.author.id}`}
          style={styles.avatarLink}
        >
          {profileUrl ? (
            <img
              src={profileUrl}
              alt=""
              style={isReply ? styles.avatarSmall : styles.avatar}
            />
          ) : (
            <div style={isReply ? styles.avatarFallbackSmall : styles.avatarFallback}>
              {comment.author.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Content bubble */}
        <div style={styles.body}>
          <div style={styles.bubble}>
            <Link
              href={`/profile/${comment.author.id}`}
              style={styles.name}
            >
              {comment.author.full_name}
            </Link>
            <p style={styles.content}>{comment.content}</p>
          </div>

          {/* Meta row */}
          <div style={styles.meta}>
            <span style={styles.time}>
              {formatRelativeTime(comment.created_at)}
            </span>
            {onReply && !isReply && (
              <button
                type="button"
                onClick={() => onReply(comment)}
                style={styles.replyBtn}
              >
                Reply
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowReport(true)}
              style={styles.reportBtn}
            >
              Report
            </button>
          </div>

          {showReport && (
            <ReportModal
              targetType="comment"
              targetId={comment.id}
              onClose={() => setShowReport(false)}
            />
          )}

          {/* Nested replies (1 level only) */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div style={styles.repliesWrap}>
              {comment.replies.map((reply) => (
                <CommentItemInner
                  key={reply.id}
                  comment={reply}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CommentItem = memo(
  CommentItemInner,
  (prev, next) =>
    prev.comment.id === next.comment.id &&
    prev.comment.reply_count === next.comment.reply_count &&
    prev.comment.replies?.length === next.comment.replies?.length &&
    prev.isReply === next.isReply
);
CommentItem.displayName = "CommentItem";
export default CommentItem;

const styles: Record<string, React.CSSProperties> = {
  item: {
    padding: "12px 0",
    borderBottom: "1px solid #f5f5f5",
  },
  replyItem: {
    padding: "8px 0 0",
  },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  avatarLink: {
    flexShrink: 0,
    textDecoration: "none",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    objectFit: "cover" as const,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    objectFit: "cover" as const,
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
  },
  avatarFallbackSmall: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  bubble: {
    background: "#f5f5f5",
    borderRadius: 12,
    padding: "8px 12px",
  },
  name: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111",
    textDecoration: "none",
    display: "block",
    marginBottom: 2,
  },
  content: {
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: "pre-wrap",
    color: "#333",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 4px 0",
  },
  time: {
    color: "#999",
    fontSize: 12,
  },
  replyBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 12,
    fontWeight: 600,
    color: "#6C63FF",
    cursor: "pointer",
  },
  reportBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 12,
    fontWeight: 500,
    color: "#bbb",
    cursor: "pointer",
  },
  repliesWrap: {
    marginTop: 4,
    paddingLeft: 0,
  },
};
