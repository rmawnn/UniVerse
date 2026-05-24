import { WidgetCard } from "./WidgetCard";
import { CommunityIcon } from "@/components/community/CommunityIcon";
import { Button } from "@/components/ui/Button";
import { SUGGESTED_COMMUNITIES } from "@/lib/mock-data";
import { compactNumber } from "@/lib/utils";

export function SuggestedCommunities() {
  return (
    <WidgetCard title="Suggested communities">
      {SUGGESTED_COMMUNITIES.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-2.5 px-3 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1"
        >
          <CommunityIcon community={c} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold">
              #{c.slug}
            </div>
            <div className="text-[11px] text-fg-3">
              {compactNumber(c.members)} members
            </div>
          </div>
          <Button variant="soft" size="sm">
            Join
          </Button>
        </div>
      ))}
    </WidgetCard>
  );
}
