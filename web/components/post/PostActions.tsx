"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Check,
} from "lucide-react";
import dynamic from "next/dynamic";
import { cn, compactNumber } from "@/lib/utils";
import { toggleLike, toggleRepost } from "@/lib/api/posts";

const ReportModal = dynamic(() => import("./ReportModal").then(m => m.ReportModal), { ssr: false });
const SaveToCollectionModal = dynamic(() => import("@/components/bookmarks/SaveToCollectionModal").then(m => m.SaveToCollectionModal), { ssr: false });

type ActionKind = "like" | "comment" | "repost" | "bookmark" | "share";

interface PostActionsProps {
  /** Post ID — when provided, likes call the real API */
  postId?: string;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  initialReposted?: boolean;
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
  initialReposted = false,
  likes,
  comments,
  reposts,
  views,
}: PostActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [reposted, setReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(reposts);
  const [likePending, setLikePending] = useState(false);
  const [repostPending, setRepostPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);

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

  const handleComment = useCallback(() => {
    if (postId) {
      router.push(`/posts/${postId}`);
    }
  }, [postId, router]);

  const handleRepost = useCallback(async () => {
    if (repostPending || !postId) return;

    const wasReposted = reposted;
    const prevCount = repostCount;
    setReposted(!wasReposted);
    setRepostCount(wasReposted ? prevCount - 1 : prevCount + 1);

    setRepostPending(true);
    try {
      const result = await toggleRepost(postId);
      setReposted(result.reposted);
      setRepostCount(result.repost_count);
    } catch {
      setReposted(wasReposted);
      setRepostCount(prevCount);
    } finally {
      setRepostPending(false);
    }
  }, [reposted, repostCount, postId, repostPending]);

  const handleShare = useCallback(async () => {
    const url = postId
      ? `${window.location.origin}/posts/${postId}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing if clipboard fails
    }
  }, [postId]);

  const handleBookmark = useCallback(async () => {
    const newState = !bookmarked;
    setBookmarked(newState);

    if (postId) {
      try {
        const { default: api } = await import("@/lib/api/client");
        if (newState) {
          await api.post(`/posts/${postId}/save`);
          setCollectionOpen(true);
        } else {
          await api.delete(`/posts/${postId}/save`);
        }
        queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      } catch {
        setBookmarked(!newState);
      }
    }
  }, [bookmarked, postId, queryClient]);

  return (
    <>
      <div className="mt-3 flex items-center gap-1.5">
        <ActionButton
          kind="like"
          count={likeCount}
          active={liked}
          onClick={handleLike}
        />
        <ActionButton
          kind="comment"
          count={comments}
          onClick={handleComment}
        />
        <ActionButton
          kind="repost"
          count={repostCount}
          active={reposted}
          onClick={handleRepost}
        />
        <ActionButton
          kind="bookmark"
          active={bookmarked}
          onClick={handleBookmark}
        />
        {copied ? (
          <span className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-success">
            <Check className="h-4 w-4" /> Copied!
          </span>
        ) : (
          <ActionButton kind="share" onClick={handleShare} />
        )}
        <div className="flex-1" />
        {views > 0 && (
          <span className="text-[12px] text-fg-3">
            {compactNumber(views)} views
          </span>
        )}
      </div>

      {postId && (
        <>
          <ReportModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            contentId={postId}
          />
          <SaveToCollectionModal
            open={collectionOpen}
            onClose={() => setCollectionOpen(false)}
            postId={postId}
          />
        </>
      )}
    </>
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
