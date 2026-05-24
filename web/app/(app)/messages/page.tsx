import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesSidebar } from "@/components/chat/MessagesSidebar";

export const metadata: Metadata = {
  title: "Messages · UniVerse",
};

/** /messages — chat list visible, conversation pane shows empty state. */
export default function MessagesIndexPage() {
  return (
    <AppShell topBar={{ breadcrumb: "Inbox · 9 active", title: "Messages" }}>
      <div className="grid h-[calc(100vh-64px)] grid-cols-1 md:grid-cols-[360px_1fr]">
        <MessagesSidebar />
        <EmptyConversation />
      </div>
    </AppShell>
  );
}

function EmptyConversation() {
  return (
    <div className="hidden flex-col items-center justify-center bg-bg-1 p-12 text-center md:flex">
      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
        <MessageCircle className="h-9 w-9" strokeWidth={1.5} />
      </div>
      <h3 className="mt-6 text-[20px] font-bold tracking-tighter">
        Pick a conversation
      </h3>
      <p className="mt-2 max-w-[360px] text-[13.5px] leading-[1.55] text-fg-2">
        Select a chat on the left to keep talking, or start a new one. Only
        verified students from your campus can DM you.
      </p>
    </div>
  );
}
