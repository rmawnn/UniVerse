"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listConversations } from "@/api/messaging";
import { useAuthStore } from "@/store/auth-store";
import { formatRelativeTime } from "@/lib/format";
import {
  ConversationSkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";
import type { ConversationResponse } from "@/types/api";

export default function MessagesPage() {
  const me = useAuthStore((s) => s.user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations({ page_size: 50 }),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const conversations = data?.items ?? [];

  return (
    <div>
      <h2 style={styles.heading}>Messages</h2>

      {isLoading && <SkeletonList count={5} Component={ConversationSkeleton} />}

      {isError && (
        <div style={styles.error}>
          <span>Could not load messages.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && conversations.length === 0 && (
        <p style={styles.muted}>No conversations yet.</p>
      )}

      <div style={styles.list}>
        {conversations.map((c) => (
          <ConversationRow key={c.id} conversation={c} myId={me?.id ?? ""} />
        ))}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  myId,
}: {
  conversation: ConversationResponse;
  myId: string;
}) {
  const other =
    conversation.participants.find((p) => p.id !== myId) ??
    conversation.participants[0];

  const lastMessage = conversation.last_message;

  return (
    <Link href={`/messages/${conversation.id}`} style={styles.row}>
      <div style={styles.avatar}>
        {(other?.full_name ?? "?").charAt(0).toUpperCase()}
      </div>
      <div style={styles.rowContent}>
        <div style={styles.rowTop}>
          <strong style={styles.name}>{other?.full_name ?? "Unknown"}</strong>
          {lastMessage && (
            <span style={styles.time}>
              {formatRelativeTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        <p style={styles.lastMessage}>
          {lastMessage ? lastMessage.content : "No messages yet"}
        </p>
      </div>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  muted: { color: "#999", fontSize: 15 },
  list: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: 14,
    borderBottom: "1px solid #f0f0f0",
    color: "inherit",
    textDecoration: "none",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  name: { fontSize: 15 },
  time: { fontSize: 12, color: "#bbb" },
  lastMessage: {
    fontSize: 13,
    color: "#777",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
};
