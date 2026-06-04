"use client";

import { useEffect } from "react";
import { MessageCircle, Loader2, WifiOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesSidebar } from "@/components/chat/MessagesSidebar";
import { getConversations } from "@/lib/api/conversations";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWebSocket, type WsEvent } from "@/lib/hooks/useWebSocket";

/** /messages — chat list visible, conversation pane shows empty state. */
export default function MessagesIndexPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { subscribe, onlineUsers } = useWebSocket();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    enabled: !!user,
  });

  /* Refresh conversation list when a new message arrives via WS */
  useEffect(() => {
    const unsub = subscribe((event: WsEvent) => {
      if (event.type === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    });
    return unsub;
  }, [subscribe, queryClient]);

  if (isLoading) {
    return (
      <AppShell topBar={{ breadcrumb: "Inbox", title: "Messages" }}>
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell topBar={{ breadcrumb: "Inbox", title: "Messages" }}>
        <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3 text-center">
          <WifiOff className="h-8 w-8 text-fg-3" />
          <p className="text-[14px] text-fg-2">Failed to load conversations</p>
          <p className="text-[12px] text-fg-3">
            Check your connection and try again.
          </p>
        </div>
      </AppShell>
    );
  }

  const conversations = data?.items ?? [];

  return (
    <AppShell
      topBar={{
        breadcrumb: `Inbox · ${conversations.length} active`,
        title: "Messages",
      }}
    >
      <div className="grid h-[calc(100vh-64px)] grid-cols-1 md:grid-cols-[360px_1fr]">
        <MessagesSidebar
          conversations={conversations}
          currentUserId={user?.id}
          onlineUsers={onlineUsers}
        />
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
