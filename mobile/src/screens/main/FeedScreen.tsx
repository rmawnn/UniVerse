import React from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getHomeFeed } from "../../api/feed";
import PostCard from "../../components/post/PostCard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<FeedStackParamList, "Feed">;

export default function FeedScreen({ navigation }: Props) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
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
        <View style={styles.center}>
          <Text style={styles.empty}>Join communities to see posts here</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  empty: { color: "#999", fontSize: 16, textAlign: "center" },
});
