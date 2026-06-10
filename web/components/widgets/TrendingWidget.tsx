"use client";

import Link from "next/link";
import { Flame, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { WidgetCard } from "./WidgetCard";
import { getTrendingPosts, type TrendingPostItem } from "@/lib/api/explore";
import { compactNumber } from "@/lib/utils";

export function TrendingWidget() {
  const {
    data: posts,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["trending", "posts", "widget"],
    queryFn: () => getTrendingPosts(4, 7),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <WidgetCard title="Trending on campus">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1"
          >
            <div className="w-5 shrink-0">
              <div className="mx-auto h-3 w-4 animate-pulse rounded bg-bg-3" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-bg-3" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-bg-3" />
            </div>
          </div>
        ))
      ) : isError ? (
        <p className="px-3 py-4 text-center text-[12px] text-fg-3">
          Could not load trending posts
        </p>
      ) : !posts || posts.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
          <TrendingUp className="h-5 w-5 text-fg-3" />
          <p className="text-[12px] text-fg-3">No trending posts yet</p>
        </div>
      ) : (
        posts.map((post, i) => (
          <TrendingRow key={post.id} post={post} rank={i + 1} />
        ))
      )}
    </WidgetCard>
  );
}

function TrendingRow({ post, rank }: { post: TrendingPostItem; rank: number }) {
  const snippet =
    post.content.length > 60
      ? post.content.slice(0, 57) + "..."
      : post.content;

  const engagement = post.like_count + post.comment_count;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex items-center gap-2.5 rounded-md px-3 py-2.5 hover:bg-bg-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1"
    >
      <span className="w-5 font-mono text-[12px] text-fg-3">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{snippet}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-3">
          <span>@{post.author.username}</span>
          <span>{compactNumber(engagement)} engagements</span>
        </div>
      </div>
      {post.trending_score > 0 && rank <= 2 && (
        <Flame className="h-3.5 w-3.5 shrink-0 text-warn" />
      )}
    </Link>
  );
}
