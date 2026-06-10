"use client";

import { Hash } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WidgetCard } from "./WidgetCard";
import { CommunityIcon } from "@/components/community/CommunityIcon";
import { Button } from "@/components/ui/Button";
import { getExplore, type ExploreCommunityItem } from "@/lib/api/explore";
import { joinCommunity } from "@/lib/api/communities";
import { compactNumber } from "@/lib/utils";

export function SuggestedCommunities() {
  const queryClient = useQueryClient();

  const {
    data: exploreData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["explore", "widget"],
    queryFn: getExplore,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.suggested_communities.slice(0, 3),
  });

  const joinMutation = useMutation({
    mutationFn: joinCommunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore"] });
      queryClient.invalidateQueries({ queryKey: ["communities", "joined"] });
    },
  });

  return (
    <WidgetCard title="Suggested communities">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1"
          >
            <div className="h-9 w-9 animate-pulse rounded-lg bg-bg-3" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-bg-3" />
              <div className="h-2.5 w-16 animate-pulse rounded bg-bg-3" />
            </div>
            <div className="h-7 w-12 animate-pulse rounded-md bg-bg-3" />
          </div>
        ))
      ) : isError ? (
        <p className="px-3 py-4 text-center text-[12px] text-fg-3">
          Could not load suggestions
        </p>
      ) : !exploreData || exploreData.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
          <Hash className="h-5 w-5 text-fg-3" />
          <p className="text-[12px] text-fg-3">No suggestions right now</p>
        </div>
      ) : (
        exploreData.map((c) => (
          <CommunityRow
            key={c.id}
            community={c}
            onJoin={() => joinMutation.mutate(c.id)}
            joining={joinMutation.isPending}
          />
        ))
      )}
    </WidgetCard>
  );
}

function CommunityRow({
  community,
  onJoin,
  joining,
}: {
  community: ExploreCommunityItem;
  onJoin: () => void;
  joining: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1">
      <CommunityIcon community={{ name: community.name }} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">
          {community.name}
        </div>
        <div className="text-[11px] text-fg-3">
          {compactNumber(community.member_count)} members
        </div>
      </div>
      {community.is_member ? (
        <Button variant="ghost" size="sm" disabled>
          Joined
        </Button>
      ) : (
        <Button
          variant="soft"
          size="sm"
          onClick={onJoin}
          disabled={joining}
        >
          {joining ? "..." : "Join"}
        </Button>
      )}
    </div>
  );
}
