import Link from "next/link";
import { Flame, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CommunityIcon } from "./CommunityIcon";
import type { Community } from "@/lib/types";
import { compactNumber } from "@/lib/utils";

interface CommunityRowProps {
  community: Community;
}

/** Inline list row used in compact lists and search results. */
export function CommunityRow({ community }: CommunityRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-line-1 px-4 py-3 last:border-b-0">
      <CommunityIcon community={community} size={50} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/communities/${community.slug}`}
            className="text-[14.5px] font-semibold hover:underline"
          >
            #{community.slug}
          </Link>
          <ShieldCheck className="h-3 w-3 text-verified" />
          {community.trending && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warn">
              <Flame className="h-2.5 w-2.5" /> hot
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-fg-3">
          {community.description} · {compactNumber(community.members)} members
        </div>
        {community.online !== undefined && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-fg-2">
            <span className="h-[6px] w-[6px] rounded-full bg-success" />
            {compactNumber(community.online)} online
          </div>
        )}
      </div>
      <Button variant={community.joined ? "ghost" : "soft"} size="sm">
        {community.joined ? "Joined" : "Join"}
      </Button>
    </div>
  );
}
