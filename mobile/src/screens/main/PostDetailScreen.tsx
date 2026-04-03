import React from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getPost, listComments } from "../../api/posts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<FeedStackParamList, "PostDetail">;

export default function PostDetailScreen({ route }: Props) {
  const { postId } = route.params;

  const postQuery = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(postId),
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => listComments(postId),
  });

  if (postQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const post = postQuery.data;

  return (
    <FlatList
      style={styles.container}
      ListHeaderComponent={
        post ? (
          <View style={styles.postCard}>
            <Text style={styles.author}>{post.author.full_name}</Text>
            <Text style={styles.content}>{post.content}</Text>
            <Text style={styles.meta}>
              {post.like_count} likes
            </Text>
          </View>
        ) : null
      }
      data={commentsQuery.data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.comment}>
          <Text style={styles.commentAuthor}>{item.author.full_name}</Text>
          <Text>{item.content}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  postCard: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  author: { fontWeight: "600", fontSize: 16, marginBottom: 8 },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  meta: { color: "#999", fontSize: 13 },
  comment: { backgroundColor: "#fff", padding: 14, borderTopWidth: 1, borderTopColor: "#eee" },
  commentAuthor: { fontWeight: "600", marginBottom: 4 },
});
