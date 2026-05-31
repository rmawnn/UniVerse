"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
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

/**
 * Post card for real API data (FeedPost shape).
 * Preserves the exact same visual design as the mock PostCard.
 */
export function FeedPostCard({ post, expanded }: FeedPostCardProps) {
  const author = post.author;

  return (
    <Card padded={false} className="mb-3.5 overflow-hidden">
      <article className="flex gap-3.5 p-[18px]">
        <Link href={`/profile/${author.username}`} className="shrink-0">
          <Avatar name={author.full_name} size={44} />
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
            <div className="mt-3 overflow-hidden rounded-md">
              <img
                src={post.image_url}
                alt=""
                className="w-full object-cover"
                style={{ maxHeight: expanded ? 400 : 280 }}
              />
            </div>
          )}

          {/* Actions */}
          <PostActions
            postId={post.id}
            likes={post.like_count}
            comments={post.comment_count}
            reposts={0}
            views={0}
            initialLiked={post.liked_by_me}
            initialBookmarked={post.saved_by_me}
          />
        </div>
      </article>
    </Card>
  );
}
