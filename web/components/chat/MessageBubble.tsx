"use client";

import { Avatar } from "@/components/ui/Avatar";
import type { MessageResponse } from "@/lib/api/conversations";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageResponse;
  isMe: boolean;
  /** True when the previous message was from the same sender. */
  groupedWithPrev?: boolean;
}

/** Single message bubble — gradient for own messages, subtle bg for others. */
export function MessageBubble({
  message,
  isMe,
  groupedWithPrev,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isMe ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar or spacer */}
      {!isMe ? (
        groupedWithPrev ? (
          <div className="w-7" aria-hidden="true" />
        ) : (
          <Avatar name={message.sender.full_name} size={28} />
        )
      ) : (
        <div className="w-7" aria-hidden="true" />
      )}

      <div
        className={cn(
          "flex max-w-[70%] flex-col gap-1",
          isMe ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "relative px-3.5 py-2 text-[14px] leading-[1.45]",
            isMe
              ? "rounded-[18px_18px_6px_18px] bg-acc-gradient text-white shadow-[0_6px_16px_rgba(124,82,255,0.18)]"
              : "rounded-[18px_18px_18px_6px] border border-line-1 bg-bg-3 text-fg-1",
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
