import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { Conversation } from "@/lib/mock-data-extra";
import { cn } from "@/lib/utils";
import { TypingDots } from "./TypingDots";

interface ConversationRowProps {
  conversation: Conversation;
  active?: boolean;
}

/** Single row in the chat list sidebar. */
export function ConversationRow({ conversation: c, active }: ConversationRowProps) {
  return (
    <Link
      href={`/messages/${c.id}`}
      className={cn(
        "relative flex items-center gap-3 border-b border-line-1 px-4 py-3 transition-colors",
        active
          ? "border-l-[2px] border-l-brand-purple bg-[linear-gradient(90deg,rgba(139,92,246,0.10),transparent_60%)]"
          : "border-l-[2px] border-l-transparent hover:bg-bg-2",
      )}
    >
      {c.group ? (
        <div className="relative h-[42px] w-[42px] shrink-0">
          <span className="absolute left-0 top-0">
            <Avatar name={c.name.split(" ")[0] ?? "G"} size={28} />
          </span>
          <span className="absolute bottom-0 right-0 rounded-full ring-2 ring-bg-1">
            <Avatar name={c.name.split(" ")[1] ?? "X"} size={24} />
          </span>
        </div>
      ) : (
        <Avatar name={c.name} size={42} online={c.online} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-[13.5px]",
              c.unread ? "font-semibold" : "font-medium",
            )}
          >
            {c.name}
          </span>
        </div>
        <div
          className={cn(
            "mt-1 max-w-[220px] truncate text-[12px]",
            c.unread ? "text-fg-1" : "text-fg-3",
          )}
        >
          {c.typing ? (
            <span className="inline-flex items-center gap-1 italic text-brand-purple">
              typing
              <TypingDots />
            </span>
          ) : (
            c.last
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "text-[11px]",
            c.unread ? "font-semibold text-brand-purple" : "text-fg-3",
          )}
        >
          {c.time}
        </span>
        {c.unread > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-acc-gradient px-1.5 text-[10.5px] font-bold text-white">
            {c.unread}
          </span>
        )}
      </div>
    </Link>
  );
}
