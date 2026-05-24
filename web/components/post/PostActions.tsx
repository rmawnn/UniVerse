"use client";

import { useState, useCallback } from "react";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
} from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import { toggleLike } from "@/lib/api/posts";

type ActionKind = "like" | "comment" | "repost" | "bookmark" | "share";

interface PostActionsProps {
  /** Post ID — when provided, likes call the real API */
  postId?: string;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  likes: number;
  comments: number;
  reposts: number;
  views: number;
}

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  repost: Repeat2,
  bookmark: Bookmark,
  share: Share2,
} as const;

const ACTIVE_TINT: Record<ActionKind, string> = {
  like: "text-danger",
  comment: "text-brand-blue",
  repost: "text-success",
  bookmark: "text-brand-purple",
  share: "text-fg-1",
};

/**
 * Action row at the bottom of a post card. Likes are optimistic —
 * the UI toggles immediately, then syncs with the backend.
 */
export function PostActions({
  postId,
  initialLiked = false,
  initialBookmarked = false,
  likes,
  comments,
  reposts,
  views,
}: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likePending, setLikePending] = useState(false);

  const handleLike = useCallback(async () => {
    if (likePending) return;

    // Optimistic update
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? prevCount - 1 : prevCount + 1);

    if (postId) {
      setLikePending(true);
      try {
        const result = await toggleLike(postId);
        // Sync with server truth
        setLiked(result.liked);
        setLikeCount(result.like_count);
      } catch {
        // Revert on error
        setLiked(wasLiked);
        setLikeCount(prevCount);
      } finally {
        setLikePending(false);
      }
    }
  }, [liked, likeCount, postId, likePending]);

  return (
    <div className="mt-3 flex items-center gap-1.5">
      <ActionButton
        kind="like"
        count={likeCount}
        active={liked}
        onClick={handleLike}
      />
      <ActionButton kind="comment" count={comments} />
      <ActionButton kind="repost" count={reposts} />
      <ActionButton
        kind="bookmark"
        active={bookmarked}
        onClick={() => setBookmarked((v) => !v)}
      />
      <ActionButton kind="share" />
      <div className="flex-1" />
      {views > 0 && (
        <span className="text-[12px] text-fg-3">
          {compactNumber(views)} views
        </span>
      )}
    </div>
  );
}

interface ActionButtonProps {
  kind: ActionKind;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

function ActionButton({ kind, count, active, onClick }: ActionButtonProps) {
  const Icon = ICONS[kind];
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
        active ? ACTIVE_TINT[kind] : "text-fg-3 hover:bg-bg-3 hover:text-fg-1",
      )}
      aria-pressed={active}
      aria-label={kind}
    >
      <Icon
        className="h-4 w-4"
        strokeWidth={1.85}
        fill={active && (kind === "like" || kind === "bookmark") ? "currentColor" : "none"}
      />
      {count !== undefined ? compactNumber(count) : null}
    </button>
  );
}
