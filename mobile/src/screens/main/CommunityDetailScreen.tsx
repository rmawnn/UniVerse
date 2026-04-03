import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCommunity, joinCommunity } from "../../api/communities";
import { listPosts } from "../../api/posts";
import PostCard from "../../components/post/PostCard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CommunitiesStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CommunitiesStackParamList, "CommunityDetail">;

export default function CommunityDetailScreen({ route, navigation }: Props) {
  const { communityId } = route.params;
  const queryClient = useQueryClient();

  const communityQuery = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => getCommunity(communityId),
  });

  const postsQuery = useQuery({
    queryKey: ["communityPosts", communityId],
    queryFn: () => listPosts(communityId),
  });

  const joinMutation = useMutation({
    mutationFn: () => joinCommunity(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", communityId] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const community = communityQuery.data;

  if (communityQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      ListHeaderComponent={
        community ? (
          <View style={styles.header}>
            <Text style={styles.name}>{community.name}</Text>
            <Text style={styles.desc}>{community.description}</Text>
            <Text style={styles.meta}>{community.member_count} members</Text>
            {!community.is_member ? (
              <TouchableOpacity style={styles.joinBtn} onPress={() => joinMutation.mutate()}>
                <Text style={styles.joinText}>Join Community</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.postBtn}
                onPress={() => navigation.navigate("CreatePost", { communityId })}
              >
                <Text style={styles.joinText}>Create Post</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null
      }
      data={postsQuery.data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
          onAuthorPress={() => navigation.navigate("UserProfile", { userId: item.author.id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#fff", padding: 20, marginBottom: 8 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  desc: { color: "#555", fontSize: 15, marginBottom: 8 },
  meta: { color: "#999", fontSize: 13, marginBottom: 14 },
  joinBtn: { backgroundColor: "#6C63FF", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  postBtn: { backgroundColor: "#4CAF50", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  joinText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
