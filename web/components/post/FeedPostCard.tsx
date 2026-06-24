"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "./CategoryBadge";
import { PostActions } from "./PostActions";
import { PostMenu } from "./PostMenu";
import type { FeedPost } from "@/lib/api/feed";
import { cn } from "@/lib/utils";

interface FeedPostCardProps {
  post: FeedPost;
  expanded?: boolean;
}

/** Relative time helper for real timestamps. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/**
 * Post card for real API data (FeedPost shape).
 * Preserves the exact same visual design as the mock PostCard.
 */
export function FeedPostCard({ post, expanded }: FeedPostCardProps) {
  const author = post.author;
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  return (
    <>
      <Card padded={false} className="mb-3.5 overflow-hidden">
        <article className="flex gap-3.5 p-[18px]">
          <Link href={`/profile/${author.username}`} className="shrink-0">
            <Avatar name={author.full_name} src={author.profile_image_url} size={44} />
          </Link>
          <div className="min-w-0 flex-1">
            {/* Author row */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Link
                href={`/profile/${author.username}`}
                className="text-[14.5px] font-semibold hover:underline"
              >
                {author.full_name}
              </Link>
              <ShieldCheck className="h-3.5 w-3.5 text-verified" />
              <span className="text-[12.5px] text-fg-3">
                @{author.username}
              </span>
              <span className="text-fg-4">·</span>
              <span className="text-[12.5px] text-fg-3">
                {relativeTime(post.created_at)}
              </span>
              {post.category && post.category !== "general" && (
                <>
                  <span className="text-fg-4">·</span>
                  <CategoryBadge category={post.category} />
                </>
              )}
              <PostMenu postId={post.id} />
            </div>

            {/* Content */}
            <Link href={`/posts/${post.id}`} className="block">
              <p
                className={cn(
                  "mt-2.5 whitespace-pre-line leading-[1.5] tracking-tightish text-pretty",
                  expanded ? "text-[17px]" : "text-[15px]",
                )}
              >
                {post.content}
              </p>
            </Link>

            {/* Image (if present) */}
            {post.image_url && (
              <div
                className="mt-3 overflow-hidden rounded-md border border-line-1 bg-bg-3 cursor-pointer"
                onClick={openLightbox}
              >
                <img
                  src={post.image_url}
                  alt=""
                  className="mx-auto block max-h-[480px] object-contain"
                />
              </div>
            )}

            {/* Actions */}
            <PostActions
              postId={post.id}
              likes={post.like_count}
              comments={post.comment_count}
              reposts={post.repost_count ?? 0}
              views={0}
              initialLiked={post.liked_by_me}
              initialBookmarked={post.saved_by_me}
              initialReposted={post.reposted_by_me ?? false}
            />
          </div>
        </article>
      </Card>

      {lightboxOpen && post.image_url && (
        <ImageLightbox src={post.image_url} onClose={closeLightbox} />
      )}
    </>
  );
}
