"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BarChart3, Check, ShieldCheck, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "./CategoryBadge";
import { PostActions } from "./PostActions";
import { PostMenu } from "./PostMenu";
import type { FeedPost, PollData } from "@/lib/api/feed";
import { votePoll } from "@/lib/api/posts";
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
      <Image
        src={src}
        alt=""
        width={1200}
        height={800}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
        unoptimized
      />
    </div>
  );
}

/**
 * Post card for real API data (FeedPost shape).
 * Preserves the exact same visual design as the mock PostCard.
 */
function InlinePoll({ postId, poll }: { postId: string; poll: PollData }) {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<PollData>(poll);

  useEffect(() => { setOptimistic(poll); }, [poll]);

  const hasVoted = !!optimistic.voted_option_id;

  const vote = useMutation({
    mutationFn: (optionId: string) => votePoll(postId, optionId),
    onMutate: (optionId) => {
      const prev = { ...optimistic };
      const newOpts = optimistic.options.map((o) => ({
        ...o,
        vote_count: o.id === optionId ? o.vote_count + 1 : o.vote_count,
      }));
      const total = newOpts.reduce((s, o) => s + o.vote_count, 0);
      setOptimistic({
        options: newOpts.map((o) => ({ ...o, pct: total ? Math.round((o.vote_count / total) * 100 * 10) / 10 : 0 })),
        total_votes: total,
        voted_option_id: optionId,
      });
      return prev;
    },
    onError: (_err, _vars, prev) => { if (prev) setOptimistic(prev as PollData); },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-line-2 bg-bg-3 p-3.5">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-fg-3">
        <BarChart3 className="h-3.5 w-3.5" />
        Poll · {optimistic.total_votes} vote{optimistic.total_votes !== 1 ? "s" : ""}
      </div>
      {optimistic.options.map((opt) => {
        const isMyVote = optimistic.voted_option_id === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={vote.isPending}
            onClick={() => { if (!hasVoted) vote.mutate(opt.id); }}
            className={cn(
              "relative flex w-full items-center gap-2 overflow-hidden rounded-md border px-3 py-2.5 text-left text-[14px] transition-all",
              hasVoted
                ? "cursor-default border-line-2"
                : "cursor-pointer border-line-2 hover:border-brand-purple/50 hover:bg-brand-purple/5",
              isMyVote && "border-brand-purple/40 bg-brand-purple/[0.06]",
            )}
          >
            {hasVoted && (
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-500",
                  isMyVote ? "bg-brand-purple/15" : "bg-fg-4/8",
                )}
                style={{ width: `${opt.pct}%` }}
              />
            )}
            <span className="relative z-10 flex-1 font-medium text-fg-1">
              {opt.label}
            </span>
            {hasVoted && (
              <span className={cn("relative z-10 text-[13px] font-semibold tabular-nums", isMyVote ? "text-brand-purple" : "text-fg-3")}>
                {opt.pct}%
              </span>
            )}
            {isMyVote && <Check className="relative z-10 h-4 w-4 text-brand-purple" />}
          </button>
        );
      })}
    </div>
  );
}

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
              <PostMenu postId={post.id} authorId={author.id} content={post.content} />
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

            {/* Poll (if present) */}
            {post.post_type === "poll" && post.poll && post.poll.options.length > 0 && (
              <InlinePoll postId={post.id} poll={post.poll} />
            )}

            {/* Image (if present) */}
            {post.image_url && (
              <div
                className="mt-3 overflow-hidden rounded-md border border-line-1 bg-bg-3 cursor-pointer"
                onClick={openLightbox}
              >
                <Image
                  src={post.image_url}
                  alt=""
                  width={800}
                  height={480}
                  className="mx-auto block max-h-[480px] w-full object-contain"
                  unoptimized
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
