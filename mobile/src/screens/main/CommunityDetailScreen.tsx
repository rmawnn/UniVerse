import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCommunity, joinCommunity } from "../../api/communities";
import { listPosts } from "../../api/posts";
import PostCard from "../../components/post/PostCard";
import ErrorBanner from "../../components/common/ErrorBanner";
import type { StackScreenProps } from "@react-navigation/stack";
import type { CommunitiesStackParamList } from "../../navigation/types";
import type { PostResponse } from "../../types/api";

type Props = StackScreenProps<CommunitiesStackParamList, "CommunityDetail">;

const FLATLIST_OPTS = {
  removeClippedSubviews: true,
  initialNumToRender: 8,
  maxToRenderPerBatch: 6,
  windowSize: 7,
} as const;

export default function CommunityDetailScreen({ route, navigation }: Props) {
  const { communityId } = route.params;
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const communityQuery = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => getCommunity(communityId),
    staleTime: 30_000,
  });

  const postsQuery = useQuery({
    queryKey: ["communityPosts", communityId],
    queryFn: () => listPosts(communityId),
    staleTime: 15_000,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinCommunity(communityId),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["community", communityId] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (err: any) => setError(err.message ?? "Could not join community"),
  });

  const community = communityQuery.data;

  const onRefresh = useCallback(() => {
    communityQuery.refetch();
    postsQuery.refetch();
  }, [communityQuery, postsQuery]);

  const handleJoin = useCallback(() => {
    joinMutation.mutate();
  }, [joinMutation]);

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

  if (communityQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (communityQuery.isError) {
    return <ErrorBanner message="Could not load community" onRetry={() => communityQuery.refetch()} />;
  }

  return (
    <FlatList
      style={styles.list}
      ListHeaderComponent={
        community ? (
          <View style={styles.header}>
            <Text style={styles.name}>{community.name}</Text>
            {community.description ? (
              <Text style={styles.desc}>{community.description}</Text>
            ) : null}
            <Text style={styles.meta}>{community.member_count} members</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!community.is_member ? (
              <TouchableOpacity
                style={[styles.joinBtn, joinMutation.isPending && styles.disabled]}
                onPress={handleJoin}
                disabled={joinMutation.isPending}
              >
                <Text style={styles.btnText}>
                  {joinMutation.isPending ? "Joining..." : "Join Community"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.memberActions}>
                <View style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>Member</Text>
                </View>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => navigation.navigate("CreatePost", { communityId })}
                >
                  <Text style={styles.btnText}>Create Post</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null
      }
      data={postsQuery.data?.items ?? []}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={communityQuery.isRefetching || postsQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor="#6C63FF"
        />
      }
      ListEmptyComponent={
        community?.is_member ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Join to see and create posts</Text>
          </View>
        )
      }
      {...FLATLIST_OPTS}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#fff", padding: 20, marginBottom: 8 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  desc: { color: "#555", fontSize: 15, lineHeight: 22, marginBottom: 8 },
  meta: { color: "#999", fontSize: 13, marginBottom: 14 },
  error: {
    color: "#e74c3c", fontSize: 14, backgroundColor: "#fdeaea",
    padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center",
  },
  joinBtn: {
    backgroundColor: "#6C63FF", borderRadius: 10, paddingVertical: 12, alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  memberActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberBadge: {
    backgroundColor: "#E8F5E9", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  memberBadgeText: { color: "#4CAF50", fontWeight: "600", fontSize: 14 },
  createBtn: {
    flex: 1, backgroundColor: "#6C63FF", borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { color: "#999", fontSize: 15, textAlign: "center" },
});
