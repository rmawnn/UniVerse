"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  MoreVertical,
  Paperclip,
  Search as SearchIcon,
  Send,
  ShieldCheck,
  Smile,
  Sticker,
  WifiOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingDots } from "@/components/chat/TypingDots";
import { MessagesSidebar } from "@/components/chat/MessagesSidebar";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  type MessageResponse,
  type PaginatedMessages,
} from "@/lib/api/conversations";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWebSocket, type WsEvent } from "@/lib/hooks/useWebSocket";
import { formatRelativeTime } from "@/lib/utils";

/* ── Sort helper (single source of truth) ────────────── */

function sortAscending(msgs: MessageResponse[]): MessageResponse[] {
  return [...msgs].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const {
    subscribe,
    sendTypingStart,
    sendTypingStop,
    sendMarkRead,
    isConnected,
    onlineUsers,
  } = useWebSocket();

  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const justSentRef = useRef(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  /* ── Queries ──────────────────────────────────────── */

  const { data: convsData } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    enabled: !!user,
  });

  const {
    data: messagesData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => getMessages(id),
    enabled: !!user && !!id,
  });

  /* Derived data */
  const conversation = convsData?.items?.find((c) => c.id === id);
  const otherParticipant = conversation?.participants?.find(
    (p) => p.id !== user?.id,
  );
  const displayName = otherParticipant?.full_name ?? "Conversation";
  const conversations = convsData?.items ?? [];

  /* ── 1. SORT: Always sort messages ascending by created_at ── */
  /*                                                              */
  /*  This is THE single place where message order is determined. */
  /*  The backend returns messages in descending order (newest    */
  /*  first for pagination). WebSocket cache appends are unsorted.*/
  /*  The useMemo dependency is `messagesData` (the entire query  */
  /*  result object), not a derived array — this ensures React    */
  /*  detects reference changes from both query refetches AND     */
  /*  cache mutations via setQueryData.                           */

  const messages = useMemo(() => {
    const items = messagesData?.items;
    if (!items || items.length === 0) return [];
    const sorted = sortAscending(items);

    // Debug: log message order (remove in production)
    if (process.env.NODE_ENV === "development" && sorted.length > 0) {
      console.log(
        `[Messages] ${sorted.length} msgs sorted. First: ${sorted[0]!.id.slice(0, 8)}… (${sorted[0]!.created_at}) → Last: ${sorted[sorted.length - 1]!.id.slice(0, 8)}… (${sorted[sorted.length - 1]!.created_at})`,
      );
    }

    return sorted;
  }, [messagesData]);

  /* ── Presence ─────────────────────────────────────── */

  const otherOnline = otherParticipant
    ? !!onlineUsers[otherParticipant.id]
    : false;

  /* ── Mark as read on open ─────────────────────────── */

  useEffect(() => {
    if (id && user) {
      markConversationRead(id).catch(() => {});
      sendMarkRead(id);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  }, [id, user, queryClient, sendMarkRead]);

  /* ── Optimistic send mutation ─────────────────────── */

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(id, content),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["messages", id] });
      const prev = queryClient.getQueryData<PaginatedMessages>([
        "messages",
        id,
      ]);

      const optimistic: MessageResponse = {
        id: `optimistic-${Date.now()}`,
        conversation_id: id,
        sender: {
          id: user?.id ?? "",
          username: user?.username ?? "",
          full_name: user?.full_name ?? "",
          profile_image_url: user?.profile_image_url ?? null,
        },
        content,
        created_at: new Date().toISOString(),
        status: "sent",
      };

      queryClient.setQueryData<PaginatedMessages>(
        ["messages", id],
        (old) => {
          if (!old)
            return {
              items: [optimistic],
              total: 1,
              page: 1,
              page_size: 50,
              total_pages: 1,
            };
          // Append optimistic message — sort happens in useMemo
          return {
            ...old,
            items: [...old.items, optimistic],
            total: old.total + 1,
          };
        },
      );

      justSentRef.current = true;
      return { prev };
    },
    onError: (_err, _content, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["messages", id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  /* ── WebSocket events ─────────────────────────────── */

  useEffect(() => {
    const unsub = subscribe((event: WsEvent) => {
      /* ── New message ── */
      if (event.type === "new_message") {
        const msgData = event.data as {
          conversation_id?: string;
          message?: Partial<MessageResponse>;
        };
        const convId = msgData.conversation_id;
        const incomingMsg = msgData.message ?? (event.data as Partial<MessageResponse>);

        if (convId === id) {
          if (incomingMsg?.id && incomingMsg?.sender && incomingMsg?.content) {
            const newMsg: MessageResponse = {
              id: String(incomingMsg.id),
              conversation_id: convId,
              sender: incomingMsg.sender as MessageResponse["sender"],
              content: String(incomingMsg.content),
              created_at:
                String(incomingMsg.created_at ?? new Date().toISOString()),
              status: incomingMsg.status,
            };

            if (process.env.NODE_ENV === "development") {
              console.log(
                `[WS] new_message id=${newMsg.id.slice(0, 8)}… created_at=${newMsg.created_at}`,
              );
            }

            queryClient.setQueryData<PaginatedMessages>(
              ["messages", id],
              (old) => {
                if (!old) return old;
                // Dedup — skip if message with same ID already exists
                if (old.items.some((m) => m.id === newMsg.id)) return old;
                // Remove any matching optimistic message (same content from same sender)
                const filtered = old.items.filter(
                  (m) =>
                    !m.id.startsWith("optimistic-") ||
                    m.content !== newMsg.content ||
                    m.sender.id !== newMsg.sender.id,
                );
                // Return new object so React Query detects the change
                // Sort happens in useMemo, not here
                return {
                  ...old,
                  items: [...filtered, newMsg],
                  total: filtered.length + 1,
                };
              },
            );
          } else {
            // Fallback: refetch from server
            queryClient.invalidateQueries({ queryKey: ["messages", id] });
          }

          // Auto-mark as read if it's from someone else
          const senderId = incomingMsg?.sender?.id ?? (incomingMsg as Record<string, unknown>)?.sender_id;
          if (senderId && senderId !== user?.id) {
            markConversationRead(id).catch(() => {});
            sendMarkRead(id);
          }
        }

        // Always refresh sidebar for unread counts + last message preview
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }

      /* ── Typing indicators ── */
      if (event.type === "typing_start") {
        const d = event.data as {
          conversation_id?: string;
          user_id?: string;
        };
        if (d.conversation_id === id && d.user_id !== user?.id) {
          setPeerTyping(true);
        }
      }
      if (event.type === "typing_stop") {
        const d = event.data as {
          conversation_id?: string;
          user_id?: string;
        };
        if (d.conversation_id === id && d.user_id !== user?.id) {
          setPeerTyping(false);
        }
      }

      /* ── Read receipts ── */
      if (event.type === "message_read") {
        const d = event.data as {
          conversation_id?: string;
          user_id?: string;
        };
        if (d.conversation_id === id && d.user_id !== user?.id) {
          queryClient.setQueryData<PaginatedMessages>(
            ["messages", id],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                items: old.items.map((m) =>
                  m.sender.id === user?.id
                    ? { ...m, status: "seen" as const }
                    : m,
                ),
              };
            },
          );
        }
      }

      if (event.type === "message_delivered") {
        const d = event.data as {
          conversation_id?: string;
          message_id?: string;
        };
        if (d.conversation_id === id && d.message_id) {
          queryClient.setQueryData<PaginatedMessages>(
            ["messages", id],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                items: old.items.map((m) =>
                  m.id === d.message_id
                    ? { ...m, status: "delivered" as const }
                    : m,
                ),
              };
            },
          );
        }
      }

      /* ── Presence ── */
      if (event.type === "presence_update") {
        const d = event.data as {
          user_id?: string;
          status?: "online" | "offline";
          last_seen?: string;
        };
        if (d.user_id === otherParticipant?.id && d.status === "offline") {
          setLastSeen(d.last_seen ?? new Date().toISOString());
        } else if (
          d.user_id === otherParticipant?.id &&
          d.status === "online"
        ) {
          setLastSeen(null);
        }
      }
    });
    return unsub;
  }, [subscribe, id, user?.id, queryClient, otherParticipant?.id, sendMarkRead]);

  /* ── 2. Smart auto-scroll ────────────────────────── */

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    shouldAutoScrollRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const isInitialLoad = prevMessageCountRef.current === 0;
    prevMessageCountRef.current = messages.length;

    // Always scroll on initial load or after sending
    // Only scroll on incoming if user is near bottom
    if (isInitialLoad || justSentRef.current || shouldAutoScrollRef.current) {
      // Use requestAnimationFrame to ensure DOM has rendered the new message
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isInitialLoad ? "instant" : "smooth",
        });
      });
      justSentRef.current = false;
    }
  }, [messages.length, messages]);

  // Reset scroll tracking when switching conversations
  useEffect(() => {
    prevMessageCountRef.current = 0;
    shouldAutoScrollRef.current = true;
    justSentRef.current = false;
    setPeerTyping(false);
    setLastSeen(null);
  }, [id]);

  /* ── Peer typing auto-clear after inactivity ─────── */

  useEffect(() => {
    if (!peerTyping) return;
    const timeout = setTimeout(() => setPeerTyping(false), 5000);
    return () => clearTimeout(timeout);
  }, [peerTyping]);

  /* ── Typing indicator (outgoing) ─────────────────── */

  const handleInputChange = useCallback(
    (value: string) => {
      setDraft(value);
      if (value.length > 0) {
        sendTypingStart(id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingStop(id);
        }, 2000);
      } else {
        sendTypingStop(id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    [id, sendTypingStart, sendTypingStop],
  );

  /* ── Send ─────────────────────────────────────────── */

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    sendTypingStop(id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendMutation.mutate(text);
  }, [draft, id, sendMutation, sendTypingStop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /* ── Render ───────────────────────────────────────── */

  return (
    <AppShell topBar={{ breadcrumb: "Inbox", title: "Messages" }}>
      <div className="grid h-[calc(100vh-64px)] grid-cols-1 md:grid-cols-[360px_1fr]">
        <MessagesSidebar
          conversations={conversations}
          activeId={id}
          currentUserId={user?.id}
          onlineUsers={onlineUsers}
        />

        <section className="flex h-full flex-col bg-bg-1">
          {/* ── Header ─────────────────────────────── */}
          <header
            className="flex h-[72px] items-center gap-3.5 border-b border-line-1 px-6"
            style={{
              background: "rgba(14,14,24,0.72)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
            }}
          >
            <div className="relative">
              <Avatar name={displayName} size={44} />
              {otherOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg-1 bg-success" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-semibold">{displayName}</span>
                <ShieldCheck className="h-3 w-3 text-verified" />
              </div>
              {otherOnline ? (
                <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Online
                </div>
              ) : lastSeen ? (
                <div className="mt-0.5 text-[11.5px] text-fg-3">
                  Last seen {formatRelativeTime(lastSeen)}
                </div>
              ) : isConnected ? (
                <div className="mt-0.5 text-[11.5px] text-fg-3">Offline</div>
              ) : (
                <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-fg-4">
                  <WifiOff className="h-3 w-3" />
                  Reconnecting…
                </div>
              )}
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

          {/* ── Messages ───────────────────────────── */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="scroll-hidden flex flex-1 flex-col gap-1.5 overflow-y-auto px-8 py-4"
          >
            {isLoading && (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
              </div>
            )}

            {isError && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <WifiOff className="h-6 w-6 text-fg-3" />
                <p className="text-[13px] text-fg-2">
                  Failed to load messages
                </p>
              </div>
            )}

            {!isLoading && !isError && messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="text-[14px] text-fg-2">No messages yet</p>
                <p className="text-[12px] text-fg-3">
                  Send the first message to start the conversation.
                </p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMe={m.sender.id === user?.id}
                  groupedWithPrev={
                    i > 0 && messages[i - 1]!.sender.id === m.sender.id
                  }
                />
              ))}

            {/* Peer typing indicator */}
            {peerTyping && otherParticipant && (
              <div className="mt-3 inline-flex items-center gap-2 self-start">
                <Avatar name={otherParticipant.full_name} size={24} />
                <div className="rounded-[14px_14px_14px_4px] border border-line-1 bg-bg-3 px-3.5 py-2.5">
                  <TypingDots />
                </div>
                <span className="text-[11px] text-fg-3">
                  {otherParticipant.full_name.split(" ")[0]} is typing…
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Connection status bar ──────────────── */}
          {!isConnected && (
            <div className="flex items-center justify-center gap-2 border-t border-warning/20 bg-warning/10 px-4 py-1.5 text-[11.5px] text-warning">
              <WifiOff className="h-3 w-3" />
              Reconnecting to realtime…
            </div>
          )}

          {/* ── Composer ───────────────────────────── */}
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
                  value={draft}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full resize-none bg-transparent text-[14.5px] leading-[1.4] text-fg-1 placeholder:text-fg-3 focus:outline-none"
                />
                <div className="flex items-center gap-1 text-fg-3">
                  <button
                    className="rounded p-1 hover:bg-bg-3 hover:text-fg-1"
                    aria-label="GIF"
                    type="button"
                  >
                    <Sticker className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded p-1 hover:bg-bg-3 hover:text-fg-1"
                    aria-label="Emoji"
                    type="button"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                  <span className="ml-auto font-mono text-[10.5px] text-fg-4">
                    Shift + Enter for newline
                  </span>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-md bg-acc-gradient text-white shadow-acc disabled:opacity-50"
                aria-label="Send"
                type="button"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
