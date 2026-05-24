import Link from "next/link";
import { Flame, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { CommunityIcon } from "./CommunityIcon";
import type { Community } from "@/lib/types";
import { compactNumber } from "@/lib/utils";

interface CommunityCardProps {
  community: Community;
}

/** Large card with a gradient banner, used in `/communities` and `/search`. */
export function CommunityCard({ community }: CommunityCardProps) {
  const [from, to] = community.hue;
  return (
    <Card padded={false} className="overflow-hidden">
      {/* Banner */}
      <div
        className="relative h-20"
        style={{
          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 30%, rgba(255,255,255,0.18), transparent 60%)",
          }}
        />
        <div className="absolute -bottom-[22px] left-3.5 rounded-md bg-bg-2 p-[3px]">
          <CommunityIcon community={community} size={50} />
        </div>
        {community.trending && (
          <div className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10.5px] font-semibold text-[#FFD394] backdrop-blur">
            <Flame className="h-3 w-3" />
            Trending
          </div>
        )}
      </div>
      {/* Body */}
      <div className="px-4 pb-4 pt-[30px]">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/communities/${community.slug}`}
            className="text-[14.5px] font-semibold hover:underline"
          >
            #{community.slug}
          </Link>
          <ShieldCheck className="h-3 w-3 text-verified" />
        </div>
        <p className="mt-1 text-[12.5px] text-fg-3">{community.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-2">
          <span className="inline-flex items-center gap-1.5">
            <AvatarStack names={["Maya", "Diego", "Lin"]} size={18} />
            {compactNumber(community.members)} members
          </span>
          {community.online !== undefined && (
            <span className="inline-flex items-center gap-1.5 text-fg-3">
              <span className="h-[6px] w-[6px] rounded-full bg-success" />
              {compactNumber(community.online)} online
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-end">
          {community.joined ? (
            <Button variant="ghost" size="sm">
              Joined
            </Button>
          ) : (
            <Button variant="soft" size="sm">
              Join
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
