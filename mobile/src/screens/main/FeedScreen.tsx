import React, { useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getHomeFeed } from "../../api/feed";
import PostCard from "../../components/post/PostCard";
import ErrorBanner from "../../components/common/ErrorBanner";
import { FeedSkeleton } from "../../components/common/SkeletonLoader";
import type { StackScreenProps } from "@react-navigation/stack";
import type { FeedStackParamList } from "../../navigation/types";
import type { PostResponse } from "../../types/api";

type Props = StackScreenProps<FeedStackParamList, "Feed">;

const FLATLIST_OPTS = {
  removeClippedSubviews: true,
  initialNumToRender: 8,
  maxToRenderPerBatch: 6,
  windowSize: 7,
} as const;

export default function FeedScreen({ navigation }: Props) {
  const { data, isLoading, refetch, isRefetching, isError } = useQuery({
    queryKey: ["feed"],
    queryFn: () => getHomeFeed(),
    staleTime: 30_000, // Data stays fresh for 30s
  });

  const renderItem = useCallback(
    ({ item }: { item: PostResponse }) => (
      <PostCard
        post={item}
        onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
        onAuthorPress={() => navigation.navigate("UserProfile", { userId: item.author.id })}
      />
    ),
    [navigation]
  );

  const keyExtractor = useCallback((item: PostResponse) => item.id, []);

  if (isLoading) return <FeedSkeleton />;

  if (isError) {
    return (
      <ErrorBanner
        message="Could not load feed. You may need to verify your student account first."
        onRetry={refetch}
      />
    );
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
      {...FLATLIST_OPTS}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 8 },
  emptyHint: { color: "#999", fontSize: 15, textAlign: "center", lineHeight: 22 },
});

// Stable reference — never re-creates
const emptyComponent = (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>Your feed is empty</Text>
    <Text style={styles.emptyHint}>
      Join communities from the Communities tab to see posts here
    </Text>
  </View>
);
