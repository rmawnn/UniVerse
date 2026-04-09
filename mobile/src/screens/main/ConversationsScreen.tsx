import React, { useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { listConversations } from "../../api/messaging";
import { useAuthStore } from "../../store/authStore";
import ErrorBanner from "../../components/common/ErrorBanner";
import type { StackScreenProps } from "@react-navigation/stack";
import type { MessagesStackParamList } from "../../navigation/types";
import type { ConversationResponse } from "../../types/api";

type Props = StackScreenProps<MessagesStackParamList, "ConversationsList">;

const FLATLIST_OPTS = {
  removeClippedSubviews: true,
  initialNumToRender: 15,
  maxToRenderPerBatch: 10,
  windowSize: 7,
} as const;

// ── Memoized conversation row ────────────────────────────────

interface ConvoRowProps {
  item: ConversationResponse;
  myId: string | undefined;
  onPress: (id: string, name: string) => void;
}

const ConversationRow = React.memo(
  function ConversationRow({ item, myId, onPress }: ConvoRowProps) {
    const other = item.participants.find((p) => p.id !== myId);
    const name = other?.full_name ?? other?.username ?? "Unknown";
    const initial = name.charAt(0).toUpperCase();
    const lastMsg = item.last_message;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => onPress(item.id, name)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {lastMsg && (
              <Text style={styles.time}>{formatTimeAgo(lastMsg.created_at)}</Text>
            )}
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {lastMsg ? lastMsg.content : "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.last_message?.id === next.item.last_message?.id
    );
  }
);

// ── Main Screen ──────────────────────────────────────────────

export default function ConversationsScreen({ navigation }: Props) {
  const me = useAuthStore((s) => s.user);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations({ page_size: 50 }),
    refetchInterval: 10000,
  });

  const handlePress = useCallback(
    (conversationId: string, participantName: string) => {
      navigation.navigate("Chat", { conversationId, participantName });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationResponse }) => (
      <ConversationRow item={item} myId={me?.id} onPress={handlePress} />
    ),
    [me?.id, handlePress]
  );

  const keyExtractor = useCallback((item: ConversationResponse) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (isError) {
    return <ErrorBanner message="Could not load conversations" onRetry={refetch} />;
  }

  return (
    <FlatList
      style={styles.list}
      data={data?.items ?? []}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
      }
      ListEmptyComponent={emptyComponent}
      ItemSeparatorComponent={Separator}
      {...FLATLIST_OPTS}
    />
  );
}

// ── Stable references ────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: "#6C63FF",
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontWeight: "600", fontSize: 16, flex: 1, marginRight: 8 },
  time: { color: "#999", fontSize: 12 },
  preview: { color: "#777", fontSize: 14 },
  separator: { height: 1, backgroundColor: "#f0f0f0", marginLeft: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 8 },
  emptyHint: { fontSize: 14, color: "#999", textAlign: "center" },
});

const Separator = React.memo(() => <View style={styles.separator} />);

const emptyComponent = (
  <View style={styles.center}>
    <Text style={styles.emptyTitle}>No conversations yet</Text>
    <Text style={styles.emptyHint}>
      Visit a user's profile and tap "Message" to start chatting
    </Text>
  </View>
);
