import React from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getHomeFeed } from "../../api/feed";
import PostCard from "../../components/post/PostCard";
import type { StackScreenProps } from "@react-navigation/stack";
import type { FeedStackParamList } from "../../navigation/types";

type Props = StackScreenProps<FeedStackParamList, "Feed">;

export default function FeedScreen({ navigation }: Props) {
  const { data, isLoading, refetch, isRefetching, isError } = useQuery({
    queryKey: ["feed"],
    queryFn: () => getHomeFeed(),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load feed</Text>
        <Text style={styles.errorHint}>
          You may need to verify your student account first
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
          onAuthorPress={() => navigation.navigate("UserProfile", { userId: item.author.id })}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Your feed is empty</Text>
          <Text style={styles.emptyHint}>
            Join communities from the Communities tab to see posts here
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  errorText: { color: "#e74c3c", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  errorHint: { color: "#999", fontSize: 14, textAlign: "center" },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 8 },
  emptyHint: { color: "#999", fontSize: 15, textAlign: "center", lineHeight: 22 },
});
