import React, { useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAsRead, markAllAsRead } from "../../api/notifications";
import ErrorBanner from "../../components/common/ErrorBanner";
import type { StackScreenProps } from "@react-navigation/stack";
import type { NotificationsStackParamList } from "../../navigation/types";
import type { NotificationResponse } from "../../types/api";

type Props = StackScreenProps<NotificationsStackParamList, "NotificationsList">;

const FLATLIST_OPTS = {
  removeClippedSubviews: true,
  initialNumToRender: 15,
  maxToRenderPerBatch: 10,
  windowSize: 7,
} as const;

// ── Memoized notification row ────────────────────────────────

interface NotifRowProps {
  item: NotificationResponse;
  onTap: (item: NotificationResponse) => void;
}

const NotificationRow = React.memo(
  function NotificationRow({ item, onTap }: NotifRowProps) {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.row, !item.is_read && styles.unread]}
        activeOpacity={0.7}
        onPress={() => onTap(item)}
      >
        <View style={styles.iconCol}>
          <Text style={styles.icon}>{icon}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.contentCol}>
          <Text
            style={[styles.content, !item.is_read && styles.contentUnread]}
            numberOfLines={2}
          >
            {item.content}
          </Text>
          <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => prev.item.id === next.item.id && prev.item.is_read === next.item.is_read
);

// ── Main Screen ──────────────────────────────────────────────

export default function NotificationsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications({ page_size: 50 }),
    refetchInterval: 12000,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.items ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  const handleTap = useCallback(
    (item: NotificationResponse) => {
      if (!item.is_read) markOneMutation.mutate(item.id);
      const type = item.type?.toLowerCase() ?? "";
      if (type === "message" || type === "new_message") {
        if (item.reference_id) navigation.navigate("PostDetail", { postId: item.reference_id });
      } else if (item.reference_id) {
        navigation.navigate("PostDetail", { postId: item.reference_id });
      }
    },
    [markOneMutation, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationResponse }) => (
      <NotificationRow item={item} onTap={handleTap} />
    ),
    [handleTap]
  );

  const keyExtractor = useCallback((item: NotificationResponse) => item.id, []);

  const handleMarkAll = useCallback(() => {
    markAllMutation.mutate();
  }, [markAllMutation]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (isError) {
    return <ErrorBanner message="Could not load notifications" onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      {hasUnread && (
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={handleMarkAll}
            disabled={markAllMutation.isPending}
            activeOpacity={0.6}
          >
            <Text style={styles.markAllText}>
              {markAllMutation.isPending ? "Marking..." : "Mark all as read"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
        }
        ListEmptyComponent={emptyComponent}
        ItemSeparatorComponent={Separator}
        {...FLATLIST_OPTS}
      />
    </View>
  );
}

// ── Stable references ────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────

function getNotificationIcon(type: string): string {
  const t = type?.toLowerCase() ?? "";
  if (t.includes("like")) return "❤️";
  if (t.includes("comment")) return "💬";
  if (t.includes("message")) return "✉️";
  if (t.includes("join")) return "👋";
  return "🔔";
}

function formatTimeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  headerBar: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12,
    alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  markAllText: { color: "#6C63FF", fontWeight: "600", fontSize: 14 },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  unread: { backgroundColor: "#F8F7FF" },
  iconCol: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#F0EEFF",
    justifyContent: "center", alignItems: "center", marginRight: 14, position: "relative",
  },
  icon: { fontSize: 20 },
  unreadDot: {
    position: "absolute", top: 0, right: 0, width: 10, height: 10,
    borderRadius: 5, backgroundColor: "#6C63FF", borderWidth: 2, borderColor: "#fff",
  },
  contentCol: { flex: 1 },
  content: { fontSize: 14, lineHeight: 20, color: "#555" },
  contentUnread: { color: "#1a1a1a", fontWeight: "500" },
  time: { color: "#aaa", fontSize: 12, marginTop: 4 },
  separator: { height: 1, backgroundColor: "#f0f0f0", marginLeft: 74 },
  emptyContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 40, marginTop: 80,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 8 },
  emptyHint: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 20 },
});

const Separator = React.memo(() => <View style={styles.separator} />);

const emptyComponent = (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>🔔</Text>
    <Text style={styles.emptyTitle}>No notifications yet</Text>
    <Text style={styles.emptyHint}>
      When someone likes or comments on your posts, you'll see it here
    </Text>
  </View>
);
