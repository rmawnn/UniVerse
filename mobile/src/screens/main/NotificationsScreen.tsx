import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAsRead, markAllAsRead } from "../../api/notifications";
import type { StackScreenProps } from "@react-navigation/stack";
import type { NotificationsStackParamList } from "../../navigation/types";

type Props = StackScreenProps<NotificationsStackParamList, "NotificationsList">;

export default function NotificationsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.markAll} onPress={() => markAllMutation.mutate()}>
        <Text style={styles.markAllText}>Mark all as read</Text>
      </TouchableOpacity>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, !item.is_read && styles.unread]}
            onPress={() => {
              if (!item.is_read) markOneMutation.mutate(item.id);
              // Navigate based on type
              if (item.reference_id) {
                navigation.navigate("PostDetail", { postId: item.reference_id });
              }
            }}
          >
            <Text style={styles.content}>{item.content}</Text>
            <Text style={styles.time}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  markAll: { padding: 14, alignItems: "flex-end" },
  markAllText: { color: "#6C63FF", fontWeight: "600" },
  row: { backgroundColor: "#fff", padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  unread: { backgroundColor: "#F0EEFF" },
  content: { fontSize: 14, lineHeight: 20 },
  time: { color: "#999", fontSize: 12, marginTop: 6 },
  empty: { color: "#999", fontSize: 16 },
});
