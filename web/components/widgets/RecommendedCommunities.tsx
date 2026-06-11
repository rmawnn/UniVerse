"use client";

import { Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WidgetCard } from "./WidgetCard";
import { CommunityIcon } from "@/components/community/CommunityIcon";
import { Button } from "@/components/ui/Button";
import {
  getRecommendedCommunities,
  type CommunityRecommendation,
} from "@/lib/api/recommendations";
import { joinCommunity } from "@/lib/api/communities";
import { compactNumber } from "@/lib/utils";

export function RecommendedCommunities() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai", "recommendations", "communities"],
    queryFn: () => getRecommendedCommunities(5),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.recommendations,
  });

  const joinMutation = useMutation({
    mutationFn: joinCommunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["communities", "joined"] });
      queryClient.invalidateQueries({ queryKey: ["explore"] });
    },
  });

  return (
    <WidgetCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand-purple" />
          For you
        </span>
      }
    >
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1"
          >
            <div className="h-9 w-9 animate-pulse rounded-lg bg-bg-3" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-bg-3" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-bg-3" />
            </div>
            <div className="h-7 w-12 animate-pulse rounded-md bg-bg-3" />
          </div>
        ))
      ) : isError ? (
        <p className="px-3 py-4 text-center text-[12px] text-fg-3">
          Could not load recommendations
        </p>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
          <Sparkles className="h-5 w-5 text-fg-3" />
          <p className="text-[12px] text-fg-3">
            No recommendations yet — join communities and interact to get
            personalized suggestions
          </p>
        </div>
      ) : (
        data.map((rec) => (
          <RecommendationRow
            key={rec.community_id}
            rec={rec}
            onJoin={() => joinMutation.mutate(rec.community_id)}
            joining={joinMutation.isPending}
          />
        ))
      )}
    </WidgetCard>
  );
}

function RecommendationRow({
  rec,
  onJoin,
  joining,
}: {
  rec: CommunityRecommendation;
  onJoin: () => void;
  joining: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1">
      <CommunityIcon community={{ name: rec.name }} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{rec.name}</div>
        <div className="truncate text-[11px] text-fg-3">{rec.reason}</div>
        <div className="text-[10.5px] text-fg-3/70">
          {compactNumber(rec.member_count)} members
          {rec.score >= 0.5 && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-brand-purple/10 px-1.5 py-px text-[10px] font-semibold text-brand-purple">
              {Math.round(rec.score * 100)}% match
            </span>
          )}
        </div>
      </div>
      <Button
        variant="soft"
        size="sm"
        onClick={onJoin}
        disabled={joining}
      >
        {joining ? "..." : "Join"}
      </Button>
    </div>
  );
}
