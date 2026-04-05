import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { listConversations } from "../../api/messaging";
import { useAuthStore } from "../../store/authStore";
import type { StackScreenProps } from "@react-navigation/stack";
import type { MessagesStackParamList } from "../../navigation/types";

type Props = StackScreenProps<MessagesStackParamList, "ConversationsList">;

export default function ConversationsScreen({ navigation }: Props) {
  const me = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const other = item.participants.find((p) => p.id !== me?.id);
        const name = other?.full_name ?? "Unknown";
        return (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("Chat", {
                conversationId: item.id,
                participantName: name,
              })
            }
          >
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {item.last_message?.content ?? "No messages yet"}
            </Text>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>No conversations yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  row: { backgroundColor: "#fff", padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontWeight: "600", fontSize: 16, marginBottom: 4 },
  preview: { color: "#666", fontSize: 14 },
  empty: { color: "#999", fontSize: 16 },
});
