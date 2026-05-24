import { Check, Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import type { ChatMessage } from "@/lib/mock-data-extra";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  /** True when the previous message was from the same author. */
  groupedWithPrev?: boolean;
}

/** Single message — bubble, attachment, or both. */
export function MessageBubble({ message, groupedWithPrev }: MessageBubbleProps) {
  const isMe = message.author === "me";

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isMe ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!isMe ? (
        groupedWithPrev ? (
          <div className="w-7" aria-hidden="true" />
        ) : (
          <Avatar name={message.author} size={28} />
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
        {message.text && (
          <div
            className={cn(
              "relative px-3.5 py-2 text-[14px] leading-[1.45]",
              isMe
                ? "rounded-[18px_18px_6px_18px] bg-acc-gradient text-white shadow-[0_6px_16px_rgba(124,82,255,0.18)]"
                : "rounded-[18px_18px_18px_6px] border border-line-1 bg-bg-3 text-fg-1",
            )}
          >
            {message.text}
            {message.status && isMe && (
              <span className="absolute -bottom-4 right-0 flex items-center gap-1 text-[10.5px] text-fg-3">
                {message.status === "read" ? (
                  <CheckDouble />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                {message.status === "read" ? "Read" : "Delivered"}
              </span>
            )}
          </div>
        )}

        {message.attachment?.kind === "file" && (
          <div className="rounded-[18px_18px_6px_18px] bg-acc-gradient p-2.5 shadow-[0_6px_16px_rgba(124,82,255,0.25)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[9px] bg-white/[0.18]">
                <Paperclip className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 text-white">
                <div className="text-[13px] font-semibold">
                  {message.attachment.label}
                </div>
                <div className="text-[11px] text-white/75">
                  {message.attachment.meta}
                </div>
              </div>
            </div>
          </div>
        )}

        {message.attachment?.kind === "image" && (
          <div className="max-w-[380px] overflow-hidden rounded-md border border-line-2">
            <PlaceholderImage
              label={message.attachment.label}
              height={200}
              accent="linear-gradient(135deg,#2A1F4A,#1A1530)"
              className="rounded-none border-none"
            />
          </div>
        )}

        {message.reactions && (
          <div className="-mt-3 flex gap-1.5 self-start">
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-bg-2 px-2 py-0.5 text-[11px] text-fg-2"
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckDouble() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
      <path
        d="M1 5l3 3L9 1M6 8l1 1L13 1"
        stroke="var(--acc-blue)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
