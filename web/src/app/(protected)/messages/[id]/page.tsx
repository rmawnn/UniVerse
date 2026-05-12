"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMessages, sendMessage, markConversationRead } from "@/api/messaging";
import { useAuthStore } from "@/store/auth-store";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { formatRelativeTime } from "@/lib/format";
import type { MessageResponse } from "@/types/api";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const messagesKey = ["messages", id] as const;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...messagesKey],
    queryFn: () => listMessages(id, { page_size: 100 }),
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 2,
  });

  // Server returns newest-first (descending); reverse for chronological display.
  const messages = useMemo(
    () => [...(data?.items ?? [])].reverse(),
    [data]
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);
  const initialScrollDone = useRef(false);

  // Auto-scroll: instant on first load, smooth on new messages
  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: initialScrollDone.current ? "smooth" : "instant",
      });
      initialScrollDone.current = true;
    }
  }, [messages.length]);

  // Mark conversation as read when chat opens and when new messages arrive
  const latestMsgId = data?.items?.[0]?.id ?? null;
  const prevLatestRef = useRef<string | null>(null);
  useEffect(() => {
    // Only mark read when the latest message changes (new messages arrived)
    // or on first load — not on every refetch
    if (!latestMsgId || latestMsgId === prevLatestRef.current) return;
    prevLatestRef.current = latestMsgId;
    markConversationRead(id).then(() => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    }).catch(() => {});
  }, [id, latestMsgId, qc]);

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const { isTyping, handleInputChange, sendTypingStop } = useTypingIndicator(id);

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(id, { content: draft.trim() }),
    onSuccess: () => {
      setDraft("");
      setSendError(null);
      sendTypingStop(); // stop typing indicator on send
      qc.invalidateQueries({ queryKey: [...messagesKey] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: { message?: string }) => {
      setSendError(err?.message ?? "Failed to send");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Link href="/messages" style={styles.backLink}>
          ← Messages
        </Link>
      </div>

      <div ref={scrollRef} style={styles.messages}>
        {isLoading && (
          <div style={styles.loadingWrap}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: i % 2 === 0 ? "flex-start" : "flex-end",
                  marginBottom: 8,
                }}
              >
                <div
                  className="skeleton"
                  style={{
                    width: `${50 + (i % 3) * 15}%`,
                    height: 42,
                    borderRadius: 14,
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {isError && (
          <div style={styles.errorBox}>
            <div>
              <span>Could not load messages.</span>
              {(error as { message?: string })?.message && (
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.85 }}>
                  {(error as { message?: string }).message}
                </p>
              )}
            </div>
            <button onClick={() => refetch()} style={styles.retry}>
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && messages.length === 0 && (
          <div style={styles.emptyChat}>
            <span style={styles.emptyIcon}>👋</span>
            <p style={styles.emptyTitle}>No messages yet</p>
            <p style={styles.emptyHint}>Send a message to start the conversation!</p>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} mine={m.sender.id === me?.id} />
        ))}
      </div>

      {isTyping && (
        <div style={styles.typingBar}>
          <span style={styles.typingDots}>
            <span style={styles.dot1} />
            <span style={styles.dot2} />
            <span style={styles.dot3} />
          </span>
          <span style={styles.typingText}>typing...</span>
        </div>
      )}

      <form onSubmit={handleSend} style={styles.composer}>
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            handleInputChange();
          }}
          placeholder="Type a message..."
          style={styles.input}
          disabled={sendMutation.isPending}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sendMutation.isPending}
          style={{
            ...styles.sendBtn,
            opacity: !draft.trim() || sendMutation.isPending ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>

      {sendError && <p style={styles.sendError}>{sendError}</p>}
    </div>
  );
}

function MessageBubble({
  message,
  mine,
}: {
  message: MessageResponse;
  mine: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: mine ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: "72%",
          background: mine ? "#6C63FF" : "#fff",
          color: mine ? "#fff" : "#1a1a1a",
          border: mine ? "none" : "1px solid #eee",
          borderRadius: 14,
          padding: "8px 12px",
          fontSize: 14,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <div>{message.content}</div>
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            textAlign: "right",
            color: mine ? "rgba(255,255,255,0.75)" : "#bbb",
          }}
        >
          {formatRelativeTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 120px)",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  header: {
    padding: 12,
    borderBottom: "1px solid #eee",
    flexShrink: 0,
  },
  backLink: {
    color: "#6C63FF",
    fontSize: 14,
    textDecoration: "none",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
    background: "#fafafa",
  },
  loadingWrap: {
    padding: "12px 0",
  },
  emptyChat: {
    textAlign: "center",
    padding: "40px 24px",
  },
  emptyIcon: { fontSize: 36, display: "block", marginBottom: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  emptyHint: { color: "#999", fontSize: 14, margin: 0 },
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 10,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  retry: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  composer: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #eee",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: "1px solid #ddd",
    borderRadius: 20,
    padding: "10px 16px",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "0 18px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  sendError: { color: "#c53030", fontSize: 13, marginTop: 6 },
  typingBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 14px",
    borderTop: "1px solid #f0f0f0",
    background: "#fff",
    flexShrink: 0,
  },
  typingDots: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
  },
  dot1: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#6C63FF",
    animation: "typingBounce 1.2s ease-in-out infinite",
  },
  dot2: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#6C63FF",
    animation: "typingBounce 1.2s ease-in-out 0.2s infinite",
  },
  dot3: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#6C63FF",
    animation: "typingBounce 1.2s ease-in-out 0.4s infinite",
  },
  typingText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
};
