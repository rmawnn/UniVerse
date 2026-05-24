import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Check,
  Hash,
  Heart,
  MessageCircle,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { Notification } from "@/lib/mock-data-extra";
import { cn } from "@/lib/utils";

interface NotificationRowProps {
  notification: Notification;
}

const KIND_META: Record<
  Notification["kind"],
  { Icon: LucideIcon; color: string; bg: string }
> = {
  liked: { Icon: Heart, color: "text-danger", bg: "bg-danger/12" },
  "liked-multi": { Icon: Heart, color: "text-danger", bg: "bg-danger/12" },
  commented: { Icon: MessageCircle, color: "text-brand-blue", bg: "bg-brand-blue/12" },
  followed: { Icon: UserIcon, color: "text-brand-purple", bg: "bg-brand-purple/18" },
  mentioned: { Icon: Hash, color: "text-warn", bg: "bg-warn/12" },
  "community-event": { Icon: Calendar, color: "text-brand-purple", bg: "bg-brand-purple/18" },
  "community-join": { Icon: Check, color: "text-success", bg: "bg-success/12" },
  system: { Icon: Sparkles, color: "text-[#C7B0FF]", bg: "bg-brand-purple/18" },
};

export function NotificationRow({ notification: n }: NotificationRowProps) {
  const { Icon, color, bg } = KIND_META[n.kind];
  const liked = n.kind === "liked" || n.kind === "liked-multi";

  return (
    <div
      className={cn(
        "relative flex items-start gap-3.5 border-t border-line-1 p-3.5 first:border-t-0",
        n.unread &&
          "bg-[linear-gradient(90deg,rgba(139,92,246,0.06),transparent_60%)]",
      )}
    >
      {n.unread && (
        <span
          className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-purple"
          aria-hidden="true"
        />
      )}
      <div className="relative shrink-0">
        <Avatar name={n.actor} size={40} />
        <div
          className={cn(
            "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-bg-2",
            bg,
            color,
          )}
        >
          <Icon className="h-2.5 w-2.5" fill={liked ? "currentColor" : "none"} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-[1.4]">
          <b className="font-semibold">{n.actor}</b>
          {n.actor2 && <span className="text-fg-2"> {n.actor2}</span>}
          <span className="text-fg-2"> {n.line}</span>
        </p>
        {n.preview && (
          <div className="mt-2 rounded-r-sm border-l-2 border-brand-purple bg-brand-purple/[0.06] px-3 py-2 text-[12.5px] leading-[1.5] text-fg-2">
            {n.preview}
          </div>
        )}
        <div className="mt-2 text-[11.5px] text-fg-4">{n.time}</div>
      </div>
      {n.withReply && (
        <Button variant="soft" size="sm">
          Reply
        </Button>
      )}
      {n.withFollow && (
        <Button variant="primary" size="sm">
          Follow back
        </Button>
      )}
    </div>
  );
}
