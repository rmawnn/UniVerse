"use client";

import Link from "next/link";
import { Sparkles, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ComposerInline } from "@/components/post/ComposerInline";
import { FeedTabs } from "@/components/post/FeedTabs";
import { FeedPostCard } from "@/components/post/FeedPostCard";
import { CampusEventsWidget } from "@/components/widgets/CampusEventsWidget";
import { FooterLinks } from "@/components/widgets/FooterLinks";
import { RecommendedCommunities } from "@/components/widgets/RecommendedCommunities";
import { SuggestedCommunities } from "@/components/widgets/SuggestedCommunities";
import { TrendingWidget } from "@/components/widgets/TrendingWidget";
import { getFeed, type FeedPost } from "@/lib/api/feed";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function FeedPage() {
  const user = useAuthStore((s) => s.user);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["feed"],
    queryFn: () => getFeed(1, 20),
    staleTime: 30_000,
  });

  const posts: FeedPost[] = data?.items ?? [];

  return (
    <AppShell
      topBar={{
        breadcrumb: user
          ? `${user.university_name ?? "UniVerse"} · Online`
          : "UniVerse",
        title: "Your Universe",
        action: (
          <Button
            variant="ghost"
            size="sm"
            icon={<Sparkles className="h-3.5 w-3.5" />}
          >
            <span className="hidden md:inline">Customize feed</span>
          </Button>
        ),
      }}
      rightRail={
        <>
          <RecommendedCommunities />
          <TrendingWidget />
          <SuggestedCommunities />
          <CampusEventsWidget />
          <FooterLinks />
        </>
      }
    >
      <div className="mx-auto max-w-[720px] px-4 py-5 sm:px-8 sm:py-6">
        <FeedTabs />
        <ComposerInline />

        {/* ── Loading state ──────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-[18px]"
              >
                <div className="flex gap-3.5">
                  <div className="h-11 w-11 shrink-0 rounded-full bg-bg-3" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 rounded bg-bg-3" />
                    <div className="h-3 w-2/3 rounded bg-bg-3" />
                    <div className="mt-3 h-14 w-full rounded bg-bg-3" />
                    <div className="mt-2 flex gap-4">
                      <div className="h-3 w-10 rounded bg-bg-3" />
                      <div className="h-3 w-10 rounded bg-bg-3" />
                      <div className="h-3 w-10 rounded bg-bg-3" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error state ────────────────────────────────── */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-danger/20 bg-danger/[0.06] px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <span className="text-lg font-bold">!</span>
            </div>
            <p className="text-[14px] font-medium text-fg-1">
              Could not load your feed
            </p>
            <p className="max-w-[360px] text-[13px] text-fg-3">
              {(error as Error)?.message ?? "Something went wrong. Please try again."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Retrying..." : "Try again"}
            </Button>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {!isLoading && !isError && posts.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-line-2 bg-bg-2 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-[18px] font-bold tracking-tighter">
              Your feed is empty
            </h3>
            <p className="max-w-[400px] text-[13.5px] leading-[1.5] text-fg-2">
              Join some communities to start seeing posts here. Browse the
              Explore page to discover what&rsquo;s happening on campus.
            </p>
            <Link href="/communities">
              <Button variant="ghost" size="sm">
                Browse communities
              </Button>
            </Link>
          </div>
        )}

        {/* ── Posts ───────────────────────────────────────── */}
        {!isLoading && posts.length > 0 && (
          <div>
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
