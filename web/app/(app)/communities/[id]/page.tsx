"use client";

import { Bell, Check, LogOut, RefreshCw, Share2, ShieldCheck, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { ComposerInline } from "@/components/post/ComposerInline";
import { FeedPostCard } from "@/components/post/FeedPostCard";
import {
  getCommunity,
  joinCommunity as joinCommunityApi,
  leaveCommunity,
} from "@/lib/api/communities";
import { getCommunityPosts } from "@/lib/api/posts";
import { compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/api/feed";

interface PageProps {
  params: { id: string };
}

export default function CommunityDetailPage({ params }: PageProps) {
  const communityId = params.id;
  const qc = useQueryClient();

  /* ── Community data ───────────────────────────────────── */
  const {
    data: community,
    isLoading: communityLoading,
    isError: communityError,
    refetch: refetchCommunity,
  } = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => getCommunity(communityId),
  });

  /* ── Posts ─────────────────────────────────────────────── */
  const {
    data: postsData,
    isLoading: postsLoading,
  } = useQuery({
    queryKey: ["community", communityId, "posts"],
    queryFn: () => getCommunityPosts(communityId),
    enabled: !!community,
  });

  const posts: FeedPost[] = postsData?.items ?? [];

  /* ── Join / Leave mutations ────────────────────────────── */
  const joinMut = useMutation({
    mutationFn: () => joinCommunityApi(communityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", communityId] });
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const leaveMut = useMutation({
    mutationFn: () => leaveCommunity(communityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", communityId] });
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const isBusy = joinMut.isPending || leaveMut.isPending;

  /* ── Loading state ─────────────────────────────────────── */
  if (communityLoading) {
    return (
      <AppShell topBar={{ breadcrumb: "Communities", title: "Loading..." }}>
        <div className="animate-pulse">
          <div className="h-[220px] bg-bg-3" />
          <div className="px-4 py-6 sm:px-8 space-y-4">
            <div className="h-6 w-1/3 rounded bg-bg-3" />
            <div className="h-4 w-2/3 rounded bg-bg-3" />
            <div className="h-4 w-1/2 rounded bg-bg-3" />
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Error state ───────────────────────────────────────── */
  if (communityError || !community) {
    return (
      <AppShell topBar={{ breadcrumb: "Communities", title: "Error" }}>
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <span className="text-xl font-bold">!</span>
          </div>
          <p className="text-[15px] font-medium">Community not found</p>
          <p className="text-[13px] text-fg-3">
            It may have been deleted or you don&rsquo;t have access.
          </p>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => refetchCommunity()}
          >
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  const created = new Date(community.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <AppShell
      topBar={{
        breadcrumb: `Communities`,
        title: community.name,
      }}
      rightRail={
        <>
          <WidgetCard title="About">
            <div className="p-3.5">
              <p className="m-0 text-[13px] leading-[1.5] text-fg-2">
                {community.description || "No description provided."}
              </p>
              <dl className="mt-3.5 flex flex-col gap-2 text-[12px]">
                <Row label="Created" value={created} />
                <Row
                  label="Visibility"
                  value={community.is_public ? "Public" : "Private"}
                />
                <Row
                  label="Members"
                  value={compactNumber(community.member_count)}
                />
              </dl>
            </div>
          </WidgetCard>
        </>
      }
    >
      {/* Banner */}
      <div className="relative h-[220px]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#2D1B69_0%,#1A2E5C_60%,#0E1A38_100%)]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 25% 30%, rgba(155,108,255,0.45), transparent 50%), radial-gradient(circle at 80% 70%, rgba(79,143,247,0.4), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 20px, rgba(255,255,255,0.025) 20px 21px)",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-[2] -mt-[50px] px-4 sm:px-8">
        <div className="flex flex-wrap items-end gap-4">
          {/* Icon */}
          <div className="rounded-lg bg-bg-1 p-[5px]">
            <span
              className="flex h-[92px] w-[92px] items-center justify-center rounded-[22px] text-[36px] font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--acc-purple), var(--acc-blue))",
              }}
            >
              {community.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 pb-2.5 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-[28px] font-bold tracking-tighter">
                {community.name}
              </h1>
              <ShieldCheck className="h-4.5 w-4.5 text-verified" />
            </div>
            <div className="mt-1 text-[13.5px] text-fg-2">
              {community.description || "Community"}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-4 text-[12.5px] text-fg-2">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-fg-3" />
                <b className="text-fg-1">{compactNumber(community.member_count)}</b>{" "}
                members
              </span>
              <span>
                <b className="text-fg-1">{posts.length}</b>{" "}
                {posts.length === 1 ? "post" : "posts"}
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 pb-2.5">
            <Button
              variant="ghost"
              size="sm"
              icon={<Share2 className="h-3.5 w-3.5" />}
            >
              Invite
            </Button>
            {community.is_member ? (
              <Button
                variant="ghost"
                size="sm"
                icon={<LogOut className="h-3.5 w-3.5" />}
                onClick={() => leaveMut.mutate()}
                disabled={isBusy}
              >
                {leaveMut.isPending ? "Leaving..." : "Leave"}
              </Button>
            ) : (
              <Button
                size="sm"
                icon={<Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                onClick={() => joinMut.mutate()}
                disabled={isBusy}
              >
                {joinMut.isPending ? "Joining..." : "Join"}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex items-center gap-1 border-b border-line-1 overflow-x-auto">
          {[
            ["Posts", String(postsData?.total ?? 0), true],
            ["About", "", false],
            ["Members", "", false],
          ].map(([label, badge, active]) => (
            <button
              key={label as string}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] ${
                active
                  ? "font-semibold text-fg-1"
                  : "font-medium text-fg-3 hover:text-fg-2"
              }`}
            >
              {label}
              {badge ? (
                <span className="rounded-full bg-bg-3 px-1.5 py-px text-[10.5px] font-semibold text-fg-2">
                  {badge}
                </span>
              ) : null}
              {active && (
                <span className="absolute inset-x-3.5 -bottom-px h-[2.5px] rounded bg-acc-gradient" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative px-4 py-5 sm:px-8">
        {community.is_member && <ComposerInline />}

        {/* Posts loading */}
        {postsLoading && (
          <div className="space-y-3.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-[18px]"
              >
                <div className="flex gap-3.5">
                  <div className="h-11 w-11 shrink-0 rounded-full bg-bg-3" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 rounded bg-bg-3" />
                    <div className="h-12 w-full rounded bg-bg-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Posts empty */}
        {!postsLoading && posts.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-6 py-10 text-center">
            <p className="text-[15px] font-medium">No posts yet</p>
            <p className="text-[13px] text-fg-3">
              {community.is_member
                ? "Be the first to share something!"
                : "Join this community to see and create posts."}
            </p>
          </div>
        )}

        {/* Posts list */}
        {posts.map((p) => (
          <FeedPostCard key={p.id} post={p} />
        ))}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-fg-3">{label}</dt>
      <dd className="font-medium text-fg-2">{value}</dd>
    </div>
  );
}
