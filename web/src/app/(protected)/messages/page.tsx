"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listConversations, createConversation } from "@/api/messaging";
import { searchUsers } from "@/api/users";
import { useAuthStore } from "@/store/auth-store";
import { formatRelativeTime } from "@/lib/format";
import {
  ConversationSkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";
import type { ConversationResponse, UserSearchResult } from "@/types/api";

export default function MessagesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const [showNewChat, setShowNewChat] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations({ page_size: 50 }),
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: 2,
  });

  const conversations = data?.items ?? [];

  const startMutation = useMutation({
    mutationFn: (userId: string) =>
      createConversation({ participant_id: userId }),
    onSuccess: (conv) => {
      setShowNewChat(false);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/messages/${conv.id}`);
    },
  });

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Messages</h2>
        <button
          type="button"
          onClick={() => setShowNewChat(true)}
          style={styles.newChatBtn}
          title="New conversation"
        >
          +
        </button>
      </div>

      {isLoading && <SkeletonList count={5} Component={ConversationSkeleton} />}

      {isError && (
        <div style={styles.error}>
          <div>
            <span>Could not load conversations.</span>
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

      {!isLoading && !isError && conversations.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>💬</span>
          <p style={styles.emptyTitle}>No conversations yet</p>
          <p style={styles.emptyHint}>
            Tap the + button above to start a conversation.
          </p>
        </div>
      )}

      <div style={styles.list}>
        {conversations.map((c) => (
          <ConversationRow key={c.id} conversation={c} myId={me?.id ?? ""} />
        ))}
      </div>

      {/* ── New conversation modal ──────────────────────────── */}
      {showNewChat && (
        <NewChatModal
          myId={me?.id ?? ""}
          isPending={startMutation.isPending}
          error={startMutation.error as { message?: string } | null}
          onSelect={(userId) => startMutation.mutate(userId)}
          onClose={() => {
            setShowNewChat(false);
            startMutation.reset();
          }}
        />
      )}
    </div>
  );
}

/* ── New chat modal with user search ──────────────────────── */

function NewChatModal({
  myId,
  isPending,
  error,
  onSelect,
  onClose,
}: {
  myId: string;
  isPending: boolean;
  error: { message?: string } | null;
  onSelect: (userId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery, { page_size: 15 }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const results = (searchQuery.data?.items ?? []).filter(
    (u) => u.id !== myId
  );

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>New Conversation</h3>
          <button type="button" onClick={onClose} style={modalStyles.closeBtn}>
            ✕
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={modalStyles.searchInput}
          disabled={isPending}
        />

        {error && (
          <p style={modalStyles.error}>{error.message ?? "Failed to start conversation"}</p>
        )}

        <div style={modalStyles.results}>
          {debouncedQuery.length < 2 && (
            <p style={modalStyles.hint}>
              Type at least 2 characters to search for users.
            </p>
          )}

          {searchQuery.isLoading && (
            <p style={modalStyles.hint}>Searching...</p>
          )}

          {searchQuery.isError && (
            <p style={modalStyles.error}>Could not search users.</p>
          )}

          {!searchQuery.isLoading &&
            debouncedQuery.length >= 2 &&
            results.length === 0 &&
            !searchQuery.isError && (
              <p style={modalStyles.hint}>No users found.</p>
            )}

          {results.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              disabled={isPending}
              onSelect={() => onSelect(user.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  disabled,
  onSelect,
}: {
  user: UserSearchResult;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      style={{
        ...modalStyles.userRow,
        opacity: disabled ? 0.5 : 1,
      }}
      className="row-hover"
    >
      <div style={modalStyles.userAvatar}>
        {user.full_name.charAt(0).toUpperCase()}
      </div>
      <div style={modalStyles.userInfo}>
        <span style={modalStyles.userName}>
          {user.full_name}
          {user.is_verified_student && (
            <span style={modalStyles.verified} title="Verified">
              ✓
            </span>
          )}
        </span>
        <span style={modalStyles.userHandle}>@{user.username}</span>
      </div>
    </button>
  );
}

/* ── Conversation row ─────────────────────────────────────── */

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
  const unread = conversation.unread_count > 0;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      style={{
        ...styles.row,
        background: unread ? "#f8f7ff" : undefined,
      }}
      className="row-hover"
    >
      <div style={styles.avatar}>
        {(other?.full_name ?? "?").charAt(0).toUpperCase()}
      </div>
      <div style={styles.rowContent}>
        <div style={styles.rowTop}>
          <strong style={{
            ...styles.name,
            fontWeight: unread ? 700 : 500,
          }}>
            {other?.full_name ?? "Unknown"}
          </strong>
          {lastMessage && (
            <span style={styles.time}>
              {formatRelativeTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        <p style={{
          ...styles.lastMessage,
          color: unread ? "#333" : "#777",
          fontWeight: unread ? 500 : 400,
        }}>
          {lastMessage ? lastMessage.content : "No messages yet"}
        </p>
      </div>
      {unread && (
        <div style={styles.unreadBadge}>
          {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
        </div>
      )}
    </Link>
  );
}

/* ── Styles ───────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heading: { fontSize: 22, fontWeight: 700, margin: 0 },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 20,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  empty: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  emptyIcon: { fontSize: 40, display: "block", marginBottom: 8 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  emptyHint: { color: "#888", fontSize: 14, margin: 0 },
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
  unreadBadge: {
    background: "#6C63FF",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 6px",
    flexShrink: 0,
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: 0,
    width: "100%",
    maxWidth: 440,
    margin: "0 16px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px 12px",
    borderBottom: "1px solid #f0f0f0",
  },
  title: { fontSize: 17, fontWeight: 700, margin: 0 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#999",
    cursor: "pointer",
    padding: 4,
  },
  searchInput: {
    margin: "12px 16px 0",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  results: {
    padding: "8px 0",
    overflowY: "auto",
    flex: 1,
    minHeight: 120,
    maxHeight: 360,
  },
  hint: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    padding: "24px 16px",
    margin: 0,
  },
  error: {
    color: "#c53030",
    fontSize: 13,
    padding: "8px 16px",
    margin: 0,
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px 16px",
    background: "none",
    border: "none",
    borderBottom: "1px solid #f8f8f8",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
    transition: "background 0.1s",
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: 500,
    color: "#222",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  userHandle: {
    fontSize: 12,
    color: "#999",
  },
  verified: {
    background: "#6C63FF",
    color: "#fff",
    borderRadius: "50%",
    width: 14,
    height: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8,
    flexShrink: 0,
  },
};
