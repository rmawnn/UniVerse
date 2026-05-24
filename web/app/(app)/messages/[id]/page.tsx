import type { Metadata } from "next";
import {
  MoreVertical,
  Paperclip,
  Search as SearchIcon,
  Send,
  ShieldCheck,
  Smile,
  Sticker,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { UniBadge } from "@/components/ui/UniBadge";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingDots } from "@/components/chat/TypingDots";
import { MessagesSidebar } from "@/components/chat/MessagesSidebar";
import { CONVERSATIONS, SAMPLE_THREAD } from "@/lib/mock-data-extra";

export const metadata: Metadata = {
  title: "Conversation · UniVerse",
};

interface PageProps {
  params: { id: string };
}

export default function ConversationPage({ params }: PageProps) {
  // Mock-data resolution: fall back to a demo conversation when the id
  // doesn't match. Once realtime/backend lands, replace with a real
  // useThread(id) query and notFound() on 404.
  const conversation =
    CONVERSATIONS.find((c) => c.id === params.id) ?? CONVERSATIONS[0]!;

  return (
    <AppShell topBar={{ breadcrumb: "Inbox", title: "Messages" }}>
      <div className="grid h-[calc(100vh-64px)] grid-cols-1 md:grid-cols-[360px_1fr]">
        <MessagesSidebar activeId={conversation.id} />
        <ConversationPane name={conversation.name} university={conversation.university} />
      </div>
    </AppShell>
  );
}

function ConversationPane({
  name,
  university,
}: {
  name: string;
  university?: string;
}) {
  return (
    <section className="flex h-full flex-col bg-bg-1">
      {/* Header */}
      <header
        className="flex h-[72px] items-center gap-3.5 border-b border-line-1 px-6"
        style={{
          background: "rgba(14,14,24,0.72)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <Avatar name={name} size={44} online />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold">{name}</span>
            <ShieldCheck className="h-3 w-3 text-verified" />
            {university && <UniBadge university={university} compact />}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Active now
          </div>
        </div>
        <button
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1"
          aria-label="Search messages"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
        <button
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1"
          aria-label="Conversation options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </header>

      {/* Messages */}
      <div className="scroll-hidden flex flex-1 flex-col gap-1.5 overflow-y-auto px-8 py-4">
        <div className="my-2 self-center font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-3">
          Today
        </div>
        {SAMPLE_THREAD.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            groupedWithPrev={i > 0 && SAMPLE_THREAD[i - 1]!.author === m.author}
          />
        ))}
        {/* Typing */}
        <div className="mt-3 inline-flex items-center gap-2 self-start">
          <Avatar name={name} size={24} />
          <div className="rounded-[14px_14px_14px_4px] border border-line-1 bg-bg-3 px-3.5 py-2.5">
            <TypingDots />
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line-1 px-6 py-3.5">
        <div className="flex items-end gap-2.5">
          <button
            className="flex h-[42px] w-[42px] items-center justify-center rounded-md border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1"
            aria-label="Attach"
            type="button"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <div className="flex flex-1 flex-col gap-2 rounded-md border border-line-2 bg-bg-2 px-3.5 py-2.5">
            <textarea
              rows={1}
              placeholder="Send a message…"
              className="w-full resize-none bg-transparent text-[14.5px] leading-[1.4] text-fg-1 placeholder:text-fg-3 focus:outline-none"
            />
            <div className="flex items-center gap-1 text-fg-3">
              <button className="rounded p-1 hover:bg-bg-3 hover:text-fg-1" aria-label="GIF">
                <Sticker className="h-3.5 w-3.5" />
              </button>
              <button className="rounded p-1 hover:bg-bg-3 hover:text-fg-1" aria-label="Emoji">
                <Smile className="h-3.5 w-3.5" />
              </button>
              <span className="ml-auto font-mono text-[10.5px] text-fg-4">
                Shift + Enter for newline
              </span>
            </div>
          </div>
          <button
            className="flex h-[42px] w-[42px] items-center justify-center rounded-md bg-acc-gradient text-white shadow-acc"
            aria-label="Send"
            type="button"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
