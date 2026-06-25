"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Sparkles, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { CampusEventsWidget } from "@/components/widgets/CampusEventsWidget";
import { TrendingWidget } from "@/components/widgets/TrendingWidget";
import dynamic from "next/dynamic";

const CreateCommunityModal = dynamic(() => import("@/components/community/CreateCommunityModal").then(m => m.CreateCommunityModal), { ssr: false });
import {
  getJoinedCommunities,
  joinCommunity as joinCommunityApi,
  leaveCommunity,
  type CommunityResponse,
} from "@/lib/api/communities";
import { compactNumber } from "@/lib/utils";

/* ── Community card for real data ─────────────────────────── */

function ApiCommunityCard({
  community,
  isJoined,
  onJoin,
  onLeave,
  busy,
}: {
  community: CommunityResponse;
  isJoined: boolean;
  onJoin: () => void;
  onLeave: () => void;
  busy: boolean;
}) {
  return (
    <Card padded={false} className="overflow-hidden">
      {/* Gradient banner */}
      <div
        className="relative h-20"
        style={{
          background:
            "linear-gradient(135deg, var(--acc-purple), var(--acc-blue))",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 30%, rgba(255,255,255,0.18), transparent 60%)",
          }}
        />
        {/* Icon */}
        <div className="absolute -bottom-[22px] left-3.5 flex h-[56px] w-[56px] items-center justify-center rounded-[14px] bg-bg-2 p-[3px]">
          <span
            className="flex h-full w-full items-center justify-center rounded-[11px] text-[20px] font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--acc-purple), var(--acc-blue))",
            }}
          >
            {community.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-[30px]">
        <Link
          href={`/communities/${community.id}`}
          className="text-[14.5px] font-semibold hover:underline"
        >
          {community.name}
        </Link>
        <p className="mt-1 text-[12.5px] text-fg-3">
          {community.description || "No description"}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-fg-2">
          <Users className="h-3.5 w-3.5 text-fg-3" />
          {compactNumber(community.member_count)} members
        </div>
        <div className="mt-3 flex items-center justify-end">
          {isJoined ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLeave}
              disabled={busy}
            >
              Joined
            </Button>
          ) : (
            <Button
              variant="soft"
              size="sm"
              onClick={onJoin}
              disabled={busy}
            >
              Join
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="h-20 animate-pulse bg-bg-3" />
      <div className="px-4 pb-4 pt-8 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-bg-3" />
        <div className="h-3 w-full animate-pulse rounded bg-bg-3" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-bg-3" />
      </div>
    </Card>
  );
}

/* ── Main page ────────────────────────────────────────────── */

export default function CommunitiesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();

  const {
    data: joined,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["communities", "joined"],
    queryFn: getJoinedCommunities,
  });

  const joinMut = useMutation({
    mutationFn: (id: string) => joinCommunityApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
  });

  const leaveMut = useMutation({
    mutationFn: (id: string) => leaveCommunity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
  });

  const communities = joined ?? [];

  return (
    <AppShell
      topBar={{
        breadcrumb: "Communities",
        title: "Your Communities",
        action: (
          <Button
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
            onClick={() => setCreateOpen(true)}
          >
            <span className="hidden md:inline">New community</span>
          </Button>
        ),
      }}
      rightRail={
        <>
          <TrendingWidget />
          <CampusEventsWidget />
        </>
      }
    >
      <div className="px-4 py-6 sm:px-8">
        {/* Hero */}
        <section
          className="relative mb-6 flex items-center gap-6 overflow-hidden rounded-lg border border-brand-purple/22 px-6 py-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(155,108,255,0.18), rgba(79,143,247,0.10))",
          }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(155,108,255,0.4), transparent 70%)",
            }}
          />
          <div className="relative z-[1] flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple/20 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C7B0FF]">
              <Sparkles className="h-3 w-3" /> Curated for you
            </div>
            <h2 className="mt-3 max-w-[540px] text-pretty text-[24px] font-bold leading-[1.2] tracking-tighter">
              Find your faculty hub, study group, or hobby crew
            </h2>
            <p className="mt-2 max-w-[540px] text-[14px] leading-[1.5] text-fg-2">
              Browse communities or start your own. Join the ones that match
              your vibe — your feed will update instantly.
            </p>
          </div>
        </section>

        {/* ── Loading ───────────────────────────────────── */}
        {isLoading && (
          <>
            <SectionHead title="Your communities" />
            <div className="mb-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </>
        )}

        {/* ── Error ─────────────────────────────────────── */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-danger/20 bg-danger/[0.06] px-6 py-8 text-center">
            <p className="text-[14px] font-medium text-fg-1">
              Could not load communities
            </p>
            <p className="text-[13px] text-fg-3">
              {(error as Error)?.message ?? "Something went wrong."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Empty ─────────────────────────────────────── */}
        {!isLoading && !isError && communities.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-line-2 bg-bg-2 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-[18px] font-bold tracking-tighter">
              No communities yet
            </h3>
            <p className="max-w-[400px] text-[13.5px] leading-[1.5] text-fg-2">
              You haven&rsquo;t joined any communities. Search or create one to
              start connecting with other students.
            </p>
          </div>
        )}

        {/* ── Joined communities ────────────────────────── */}
        {!isLoading && communities.length > 0 && (
          <>
            <SectionHead
              title="Your communities"
              sub={`${communities.length} joined`}
            />
            <div className="mb-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {communities.map((c) => (
                <ApiCommunityCard
                  key={c.id}
                  community={c}
                  isJoined={true}
                  onJoin={() => joinMut.mutate(c.id)}
                  onLeave={() => leaveMut.mutate(c.id)}
                  busy={joinMut.isPending || leaveMut.isPending}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <CreateCommunityModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </AppShell>
  );
}
